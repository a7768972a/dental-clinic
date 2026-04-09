import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pendingAppointments = await db.pendingAppointment.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const pendingCount = await db.pendingAppointment.count({
      where: { status: 'pending' },
    });

    return NextResponse.json({
      appointments: pendingAppointments,
      pendingCount,
    });
  } catch (error) {
    console.error('Error fetching pending appointments:', error);
    return NextResponse.json(
      { error: 'Error fetching pending appointments' },
      { status: 500 }
    );
  }
}
