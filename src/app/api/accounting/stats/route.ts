import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    // Calculate total revenue from paid invoices
    const revenue = await db.payment.aggregate({
      _sum: {
        amount: true,
      },
    });

    // Calculate total expenses
    const expenses = await db.expense.aggregate({
      _sum: {
        amount: true,
      },
    });

    // Count pending invoices
    const pendingInvoices = await db.invoice.count({
      where: {
        status: 'pending',
      },
    });

    // Count active installment plans
    const activeInstallments = await db.installmentPlan.count({
      where: {
        status: 'active',
      },
    });

    const totalRevenue = revenue._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const netProfit = totalRevenue - totalExpenses;

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalExpenses,
        netProfit,
        pendingInvoices,
        activeInstallments,
      },
    });
  } catch (error) {
    console.error('Error fetching accounting stats:', error);
    return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
  }
}
