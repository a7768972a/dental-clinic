import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teeth = await db.toothRecord.findMany({
      where: { patientId: id },
      orderBy: { toothNumber: 'asc' },
    });

    return NextResponse.json({ teeth });
  } catch (error) {
    console.error('Error fetching tooth records:', error);
    return NextResponse.json({ error: 'Error fetching records' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const record = await db.toothRecord.upsert({
      where: {
        patientId_toothNumber: {
          patientId: id,
          toothNumber: body.toothNumber,
        },
      },
      create: {
        patientId: id,
        toothNumber: body.toothNumber,
        condition: body.condition,
        notes: body.notes || null,
      },
      update: {
        condition: body.condition,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Error saving tooth record:', error);
    return NextResponse.json({ error: 'Error saving record' }, { status: 500 });
  }
}
