import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const services = await db.service.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [
        { category: 'asc' },
        { nameAr: 'asc' },
      ],
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Error fetching services' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const service = await db.service.create({
      data: {
        name: body.name || body.nameAr,
        nameAr: body.nameAr,
        category: body.category || 'other',
        price: body.price,
        duration: body.duration || 30,
        description: body.description || null,
        active: body.active !== false,
      },
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Error creating service' }, { status: 500 });
  }
}
