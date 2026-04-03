import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get total patients
    const totalPatients = await db.patient.count();

    // Get today's appointments
    const todayAppointments = await db.appointment.count({
      where: {
        startTime: {
          gte: today,
          lte: todayEnd,
        },
      },
    });

    // Get monthly revenue
    const monthlyInvoices = await db.invoice.aggregate({
      where: {
        createdAt: {
          gte: firstDayOfMonth,
        },
        status: {
          not: 'cancelled',
        },
      },
      _sum: {
        total: true,
      },
    });

    // Get monthly expenses
    const monthlyExpenses = await db.expense.aggregate({
      where: {
        date: {
          gte: firstDayOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get pending invoices count
    const pendingInvoices = await db.invoice.count({
      where: {
        status: 'pending',
      },
    });

    // Get recent appointments for today
    const recentAppointments = await db.appointment.findMany({
      where: {
        startTime: {
          gte: today,
          lte: todayEnd,
        },
      },
      include: {
        patient: true,
        service: true,
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 10,
    });

    const monthlyRevenue = monthlyInvoices._sum.total || 0;
    const totalExpenses = monthlyExpenses._sum.amount || 0;
    const netProfit = monthlyRevenue - totalExpenses;

    return NextResponse.json({
      stats: {
        totalPatients,
        todayAppointments,
        monthlyRevenue,
        monthlyExpenses: totalExpenses,
        netProfit,
        pendingInvoices,
      },
      recentAppointments: recentAppointments.map((apt) => ({
        id: apt.id,
        patientName: apt.patient?.name || 'غير معروف',
        time: new Date(apt.startTime).toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        service: apt.service?.nameAr || 'خدمة عامة',
        status: apt.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
  }
}
