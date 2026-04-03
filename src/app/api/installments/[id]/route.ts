import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch single installment plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const plan = await db.installmentPlan.findUnique({
      where: { id },
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
    });

    if (!plan) {
      return NextResponse.json({ error: 'Installment plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error fetching installment plan:', error);
    return NextResponse.json({ error: 'Failed to fetch installment plan' }, { status: 500 });
  }
}

// PUT - Update installment plan or pay an installment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, installmentId, paidAmount, method, notes } = body;

    if (action === 'pay' && installmentId) {
      // Pay an installment
      const installment = await db.installmentPayment.findUnique({
        where: { id: installmentId },
        include: {
          plan: {
            include: {
              invoice: true,
            },
          },
        },
      });

      if (!installment || installment.planId !== id) {
        return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
      }

      // Update installment
      const updatedInstallment = await db.installmentPayment.update({
        where: { id: installmentId },
        data: {
          paidAmount: (installment.paidAmount || 0) + (paidAmount || installment.amount),
          paidDate: new Date(),
          status: 'paid',
          notes,
        },
      });

      // Create payment record
      await db.payment.create({
        data: {
          invoiceId: installment.plan.invoiceId,
          amount: paidAmount || installment.amount,
          method: method || 'cash',
          notes: `قسط رقم ${installment.installmentNumber}`,
        },
      });

      // Update invoice paid amount
      await db.invoice.update({
        where: { id: installment.plan.invoiceId },
        data: {
          paidAmount: { increment: paidAmount || installment.amount },
        },
      });

      // Check if all installments are paid
      const allInstallments = await db.installmentPayment.findMany({
        where: { planId: id },
      });

      const allPaid = allInstallments.every((inst) => inst.status === 'paid');

      if (allPaid) {
        await db.installmentPlan.update({
          where: { id },
          data: { status: 'completed' },
        });

        await db.invoice.update({
          where: { id: installment.plan.invoiceId },
          data: { status: 'paid' },
        });
      }

      return NextResponse.json({ installment: updatedInstallment });
    }

    // Default: update plan status
    const { status } = body;
    const plan = await db.installmentPlan.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error updating installment:', error);
    return NextResponse.json({ error: 'Failed to update installment' }, { status: 500 });
  }
}

// DELETE - Cancel installment plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete all installment payments first
    await db.installmentPayment.deleteMany({
      where: { planId: id },
    });

    // Delete the plan
    await db.installmentPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting installment plan:', error);
    return NextResponse.json({ error: 'Failed to delete installment plan' }, { status: 500 });
  }
}
