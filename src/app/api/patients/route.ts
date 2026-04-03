import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const patients = await db.patient.findMany({
      include: {
        _count: {
          select: {
            appointments: true,
            invoices: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Error fetching patients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const patient = await db.patient.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        gender: body.gender || null,
        address: body.address || null,
        medicalNotes: body.medicalNotes || null,
        allergies: body.allergies || null,
      },
    });

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Error creating patient' }, { status: 500 });
  }
}
