import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const logs = await db.automationLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching automation logs:', error);
    return NextResponse.json({ error: 'Error fetching logs' }, { status: 500 });
  }
}
