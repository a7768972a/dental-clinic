import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await db.queueEntry.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
    }

    return NextResponse.json({ queue: entry });
  } catch (error) {
    console.error('Error fetching queue entry:', error);
    return NextResponse.json({ error: 'Error fetching entry' }, { status: 500 });
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
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'with-doctor') {
        updateData.calledTime = new Date();
      } else if (body.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    const entry = await db.queueEntry.update({
      where: { id },
      data: updateData,
      include: { patient: true },
    });

    return NextResponse.json({ queue: entry });
  } catch (error) {
    console.error('Error updating queue entry:', error);
    return NextResponse.json({ error: 'Error updating entry' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.queueEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting queue entry:', error);
    return NextResponse.json({ error: 'Error deleting entry' }, { status: 500 });
  }
}
