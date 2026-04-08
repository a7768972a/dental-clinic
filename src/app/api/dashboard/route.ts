import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

const CLINIC_TIMEZONE = 'Asia/Damascus';

/**
 * الحصول على بداية ونهاية اليوم حسب منطقة العيادة الزمنية (دمشق UTC+3)
 * الأوقات في قاعدة البيانات مخزنة بـ UTC، لذلك نحسب حدود اليوم بـ UTC
 * مثال: منتصف ليل دمشق = 21:00 UTC (اليوم السابق)
 */
function getClinicDayBounds() {
  const now = new Date();

  // تاريخ اليوم في دمشق
  const clinicDateString = now.toLocaleDateString('en-CA', { timeZone: CLINIC_TIMEZONE }); // YYYY-MM-DD

  // بداية اليوم في دمشق (00:00 دمشق = 21:00 UTC بالأمس)
  const todayStartUTC = new Date(`${clinicDateString}T00:00:00+03:00`);

  // نهاية اليوم في دمشق (23:59:59 دمشق = 20:59:59 UTC اليوم)
  const todayEndUTC = new Date(`${clinicDateString}T23:59:59+03:00`);

  return { todayStartUTC, todayEndUTC, clinicDateString };
}

export async function GET() {
  try {
    const { todayStartUTC, todayEndUTC, clinicDateString } = getClinicDayBounds();

    // أول يوم من الشهر الحالي حسب منطقة العيادة
    const firstDayOfMonth = new Date(`${clinicDateString.slice(0, 7)}-01T00:00:00+03:00`);

    // Get total patients
    const totalPatients = await db.patient.count();

    // Get today's appointments (بحدود دمشق الزمنية)
    const todayAppointments = await db.appointment.count({
      where: {
        startTime: {
          gte: todayStartUTC,
          lte: todayEndUTC,
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

    // Get recent appointments for today (بحدود دمشق الزمنية)
    const recentAppointments = await db.appointment.findMany({
      where: {
        startTime: {
          gte: todayStartUTC,
          lte: todayEndUTC,
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
        // تحويل الوقت من UTC إلى منطقة العيادة الزمنية
        time: new Date(apt.startTime).toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: CLINIC_TIMEZONE,
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
