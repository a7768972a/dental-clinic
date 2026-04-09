import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// This endpoint receives webhook data from n8n (WhatsApp bookings)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Log the incoming webhook
    await db.automationLog.create({
      data: {
        type: 'booking',
        source: body.source || 'n8n',
        payload: JSON.stringify(body),
        status: 'success',
        message: 'Webhook received',
      },
    });

    // Handle WhatsApp pending booking (needs approval)
    if (body.type === 'whatsapp_booking') {
      await db.pendingAppointment.create({
        data: {
          patientName: body.patientName || 'غير معروف',
          patientPhone: body.patientPhone || '',
          serviceName: body.serviceName || null,
          appointmentTime: new Date(body.appointmentTime),
          sourceMessageId: body.sourceMessageId || null,
          notes: body.notes || null,
          status: 'pending',
        },
      });

      // Create notification
      await db.notification.create({
        data: {
          type: 'booking',
          title: 'حجز واتساب بانتظار الموافقة',
          message: `حجز جديد بانتظار الموافقة: ${body.patientName || 'غير معروف'} - ${body.serviceName || 'خدمة عامة'}`,
          source: 'whatsapp',
          data: JSON.stringify({
            patientName: body.patientName,
            patientPhone: body.patientPhone,
            serviceName: body.serviceName,
            appointmentTime: body.appointmentTime,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'WhatsApp booking received and pending approval',
      });
    }

    // Handle different webhook types
    if (body.type === 'booking' || body.patientName) {
      // Create or find patient
      let patient = await db.patient.findFirst({
        where: {
          phone: body.patientPhone,
        },
      });

      if (!patient && body.patientName && body.patientPhone) {
        patient = await db.patient.create({
          data: {
            name: body.patientName,
            phone: body.patientPhone,
          },
        });
      }

      // Create appointment if patient exists
      if (patient && body.appointmentTime) {
        const startTime = new Date(body.appointmentTime);
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min default

        await db.appointment.create({
          data: {
            patientId: patient.id,
            title: body.serviceName || `موعد ${patient.name}`,
            startTime,
            endTime,
            status: 'scheduled',
            notes: body.notes || 'محجوز عبر الواتساب',
          },
        });
      }

      // Create notification
      await db.notification.create({
        data: {
          type: 'booking',
          title: 'حجز جديد من الواتساب',
          message: `حجز جديد للمريض ${body.patientName || 'غير معروف'} - ${body.serviceName || 'خدمة عامة'}`,
          source: 'whatsapp',
          data: JSON.stringify({
            patientName: body.patientName,
            patientPhone: body.patientPhone,
            serviceName: body.serviceName,
            appointmentTime: body.appointmentTime,
          }),
        },
      });
    }

    if (body.type === 'reminder_response') {
      // Handle reminder response (confirmation/cancellation)
      if (body.appointmentId && body.response) {
        await db.appointment.update({
          where: { id: body.appointmentId },
          data: {
            status: body.response === 'confirmed' ? 'confirmed' : 'cancelled',
          },
        });

        await db.notification.create({
          data: {
            type: 'reminder',
            title: 'رد على التذكير',
            message: `المريض ${body.patientName || ''} قام بـ ${body.response === 'confirmed' ? 'تأكيد' : 'إلغاء'} الموعد`,
            source: 'whatsapp',
          },
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Log the error
    try {
      await db.automationLog.create({
        data: {
          type: 'booking',
          source: 'n8n',
          payload: '{}',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (logError) {
      console.error('Error logging webhook error:', logError);
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Error processing webhook' 
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'n8n webhook endpoint is active',
    timestamp: new Date().toISOString() 
  });
}
