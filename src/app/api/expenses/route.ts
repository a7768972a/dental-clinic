import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const expenses = await db.expense.findMany({
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Error fetching expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const expense = await db.expense.create({
      data: {
        category: body.category,
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
        reference: body.reference || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Error creating expense' }, { status: 500 });
  }
}
