import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sendBookingResponseWebhook } from '@/lib/webhook';

const CLINIC_TIMEZONE = 'Asia/Damascus';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body;

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    // Find the pending appointment
    const pending = await db.pendingAppointment.findUnique({
      where: { id },
    });

    if (!pending) {
      return NextResponse.json(
        { error: 'Pending appointment not found' },
        { status: 404 }
      );
    }

    if (pending.status !== 'pending') {
      return NextResponse.json(
        { error: 'This appointment has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Find or create patient
      let patient = await db.patient.findFirst({
        where: { phone: pending.patientPhone },
      });

      if (!patient) {
        patient = await db.patient.create({
          data: {
            name: pending.patientName,
            phone: pending.patientPhone,
          },
        });
      }

      // Find service by Arabic name if provided
      let serviceId: string | null = null;
      if (pending.serviceName) {
        const service = await db.service.findFirst({
          where: { nameAr: pending.serviceName },
        });
        if (service) {
          serviceId = service.id;
        }
      }

      const startTime = new Date(pending.appointmentTime);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min default

      // Create the real appointment
      await db.appointment.create({
        data: {
          patientId: patient.id,
          title: pending.serviceName || `موعد ${pending.patientName}`,
          serviceId,
          startTime,
          endTime,
          status: 'confirmed',
          notes: pending.notes
            ? `${pending.notes} (محجوز عبر الواتساب)`
            : 'محجوز عبر الواتساب',
        },
      });

      // Update pending appointment status
      await db.pendingAppointment.update({
        where: { id },
        data: { status: 'accepted' },
      });

      // Create notification
      await db.notification.create({
        data: {
          type: 'automation',
          title: 'تم قبول حجز واتساب',
          message: `تم قبول حجز المريض ${pending.patientName} - ${pending.serviceName || 'خدمة عامة'}`,
          source: 'system',
        },
      });

      // Format time for webhook
      const appointmentTimeFormatted = startTime.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: CLINIC_TIMEZONE,
      }) + ' ' + startTime.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: CLINIC_TIMEZONE,
      });

      // Send webhook (async - don't wait)
      sendBookingResponseWebhook('whatsapp_booking_accepted', {
        patientPhone: pending.patientPhone,
        patientName: pending.patientName,
        appointmentTimeFormatted,
        serviceName: pending.serviceName || undefined,
      }).catch((err) => console.error('Accept webhook error:', err));

      return NextResponse.json({
        success: true,
        message: 'Appointment accepted successfully',
      });
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }

      // Update pending appointment status
      await db.pendingAppointment.update({
        where: { id },
        data: { status: 'rejected', rejectReason: reason },
      });

      // Create notification
      await db.notification.create({
        data: {
          type: 'automation',
          title: 'تم رفض حجز واتساب',
          message: `تم رفض حجز المريض ${pending.patientName} - السبب: ${reason}`,
          source: 'system',
        },
      });

      // Send webhook (async - don't wait)
      sendBookingResponseWebhook('whatsapp_booking_rejected', {
        patientPhone: pending.patientPhone,
        patientName: pending.patientName,
        reason,
      }).catch((err) => console.error('Reject webhook error:', err));

      return NextResponse.json({
        success: true,
        message: 'Appointment rejected successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing pending appointment:', error);
    return NextResponse.json(
      { error: 'Error processing pending appointment' },
      { status: 500 }
    );
  }
}
