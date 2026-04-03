import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const appointments = await db.appointment.findMany({
      include: {
        patient: true,
        service: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Error fetching appointments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const appointment = await db.appointment.create({
      data: {
        patientId: body.patientId,
        title: body.title,
        serviceId: body.serviceId || null,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        status: body.status || 'scheduled',
        notes: body.notes || null,
      },
      include: {
        patient: true,
        service: true,
      },
    });

    // Create notification for new booking
    await db.notification.create({
      data: {
        type: 'booking',
        title: 'موعد جديد',
        message: `موعد جديد للمريض ${appointment.patient?.name || 'غير معروف'}`,
        source: 'system',
        data: JSON.stringify({
          appointmentId: appointment.id,
          patientId: body.patientId,
          time: body.startTime,
        }),
      },
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Error creating appointment' }, { status: 500 });
  }
}
