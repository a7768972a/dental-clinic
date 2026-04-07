import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if invoice exists
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Delete related installment plan if exists
    const installmentPlan = await db.installmentPlan.findUnique({
      where: { invoiceId: id },
    });

    if (installmentPlan) {
      // Delete installment payments first
      await db.installmentPayment.deleteMany({
        where: { planId: installmentPlan.id },
      });

      // Delete the installment plan
      await db.installmentPlan.delete({
        where: { id: installmentPlan.id },
      });
    }

    // Delete invoice payments
    await db.payment.deleteMany({
      where: { invoiceId: id },
    });

    // Delete invoice items
    await db.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    // Delete the invoice
    await db.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        patient: true,
        items: {
          include: {
            service: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
