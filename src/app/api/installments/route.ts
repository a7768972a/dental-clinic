import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all installment plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const plans = await db.installmentPlan.findMany({
      where,
      include: {
        invoice: {
          include: {
            patient: true,
          },
        },
        installments: {
          orderBy: {
            installmentNumber: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching installments:', error);
    return NextResponse.json({ error: 'Failed to fetch installments' }, { status: 500 });
  }
}

// POST - Create new installment plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      invoiceId,
      totalAmount,
      numberOfMonths,
      startDate,
      downPayment,
      notes,
    } = body;

    // Check if invoice exists
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { patient: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if installment plan already exists
    const existingPlan = await db.installmentPlan.findUnique({
      where: { invoiceId },
    });

    if (existingPlan) {
      return NextResponse.json({ error: 'Installment plan already exists for this invoice' }, { status: 400 });
    }

    // Calculate amounts
    const amountAfterDownPayment = totalAmount - (downPayment || 0);
    const monthlyAmount = amountAfterDownPayment / numberOfMonths;

    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + numberOfMonths - 1);

    // Create installment plan and payments
    const plan = await db.installmentPlan.create({
      data: {
        invoiceId,
        totalAmount: amountAfterDownPayment + (downPayment || 0),
        numberOfMonths,
        monthlyAmount,
        startDate: start,
        endDate: end,
        downPayment: downPayment || 0,
        notes,
        installments: {
          create: Array.from({ length: numberOfMonths }, (_, i) => {
            const dueDate = new Date(start);
            dueDate.setMonth(dueDate.getMonth() + i);
            return {
              installmentNumber: i + 1,
              amount: monthlyAmount,
              dueDate,
              status: 'pending',
            };
          }),
        },
      },
      include: {
        installments: true,
      },
    });

    // Record down payment if exists
    if (downPayment && downPayment > 0) {
      await db.payment.create({
        data: {
          invoiceId,
          amount: downPayment,
          method: 'cash',
          notes: 'دفعة أولى من خطة التقسيط',
        },
      });

      // Update invoice paid amount
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: { increment: downPayment },
          status: 'partially-paid',
        },
      });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error creating installment plan:', error);
    return NextResponse.json({ error: 'Failed to create installment plan' }, { status: 500 });
  }
}
