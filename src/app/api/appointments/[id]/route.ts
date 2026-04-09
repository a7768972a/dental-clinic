import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { sendWebhook } from '@/lib/webhook';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        service: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json({ error: 'Error fetching appointment' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updateData: any = {};
    if (body.startTime) updateData.startTime = new Date(body.startTime);
    if (body.endTime) updateData.endTime = new Date(body.endTime);
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.title) updateData.title = body.title;
    if (body.serviceId !== undefined) updateData.serviceId = body.serviceId;

    const appointment = await db.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        service: true,
      },
    });

    // تحديد نوع الحدث
    let webhookEvent: 'appointment_updated' | 'appointment_cancelled' | 'appointment_completed' = 'appointment_updated';
    if (body.status === 'cancelled') webhookEvent = 'appointment_cancelled';
    else if (body.status === 'completed') webhookEvent = 'appointment_completed';

    // إرسال webhook إلى n8n (غير متزامن)
    sendWebhook(webhookEvent, {
      id: appointment.id,
      title: appointment.title,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      notes: appointment.notes || undefined,
      patient: appointment.patient ? {
        id: appointment.patient.id,
        name: appointment.patient.name,
        phone: appointment.patient.phone,
      } : null,
      service: appointment.service ? {
        id: appointment.service.id,
        name: appointment.service.name,
        nameAr: appointment.service.nameAr,
        price: appointment.service.price,
      } : null,
    }).catch(err => console.error('Webhook error (appointment_updated):', err));

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Error updating appointment' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // جلب بيانات الموعد قبل الحذف للـ webhook
    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        service: true,
      },
    });

    await db.appointment.delete({
      where: { id },
    });

    // إرسال webhook إلغاء عند الحذف
    if (appointment) {
      sendWebhook('appointment_cancelled', {
        id: appointment.id,
        title: appointment.title,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: 'cancelled',
        notes: appointment.notes || undefined,
        patient: appointment.patient ? {
          id: appointment.patient.id,
          name: appointment.patient.name,
          phone: appointment.patient.phone,
        } : null,
        service: appointment.service ? {
          id: appointment.service.id,
          name: appointment.service.name,
          nameAr: appointment.service.nameAr,
          price: appointment.service.price,
        } : null,
      }).catch(err => console.error('Webhook error (appointment_deleted):', err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json({ error: 'Error deleting appointment' }, { status: 500 });
  }
}
