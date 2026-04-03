import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const queue = await db.queueEntry.findMany({
      include: {
        patient: {
          include: {
            appointments: {
              where: {
                startTime: {
                  gte: today,
                  lt: tomorrow,
                },
              },
              orderBy: {
                startTime: 'asc',
              },
              take: 1,
            },
          },
        },
      },
      where: {
        OR: [
          { status: 'arrived' },
          { status: 'waiting' },
          { status: 'with-doctor' },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { checkInTime: 'asc' },
      ],
    });

    // Transform the data to include appointment
    const transformedQueue = queue.map((entry) => ({
      ...entry,
      appointment: entry.patient.appointments[0] || null,
    }));

    return NextResponse.json({ queue: transformedQueue });
  } catch (error) {
    console.error('Error fetching queue:', error);
    return NextResponse.json({ error: 'Error fetching queue' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if patient already in queue
    const existing = await db.queueEntry.findFirst({
      where: {
        patientId: body.patientId,
        status: { in: ['arrived', 'waiting', 'with-doctor'] },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Patient already in queue', queue: existing }, { status: 400 });
    }

    const entry = await db.queueEntry.create({
      data: {
        patientId: body.patientId,
        status: 'arrived',
        priority: body.priority || 0,
      },
      include: {
        patient: true,
      },
    });

    return NextResponse.json({ queue: entry });
  } catch (error) {
    console.error('Error adding to queue:', error);
    return NextResponse.json({ error: 'Error adding to queue' }, { status: 500 });
  }
}
