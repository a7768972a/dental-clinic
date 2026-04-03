import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get the invoice
    const invoice = await db.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Create payment record
    const payment = await db.payment.create({
      data: {
        invoiceId: id,
        amount: body.amount,
        method: body.method || 'cash',
        reference: body.reference || null,
        notes: body.notes || null,
      },
    });

    // Update invoice paid amount and status
    const newPaidAmount = invoice.paidAmount + body.amount;
    let newStatus = invoice.status;

    if (newPaidAmount >= invoice.total) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partially-paid';
    }

    await db.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    return NextResponse.json({ payment, invoiceStatus: newStatus });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Error creating payment' }, { status: 500 });
  }
}
