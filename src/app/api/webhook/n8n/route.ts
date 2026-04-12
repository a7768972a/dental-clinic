import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Parse n8n array format or regular JSON
function parseBookingData(data: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  if (Array.isArray(data)) {
    for (const item of data) {
      const str = String(item);
      const colonIndex = str.indexOf(':');
      if (colonIndex > -1) {
        const key = str.slice(0, colonIndex).trim().toLowerCase();
        const value = str.slice(colonIndex + 1).trim();
        if (key.includes('name')) result.patientName = value;
        else if (key.includes('phone') || key.includes('number')) result.patientPhone = value;
        else if (key.includes('date')) result.date = value;
        else if (key.includes('time') || key.includes('slot')) result.time = value;
        else if (key.includes('issue') || key.includes('notes') || key.includes('reason')) result.issue = value;
      }
    }
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.patientName) result.patientName = String(obj.patientName);
    if (obj.name) result.patientName = String(obj.name);
    if (obj.patientPhone) result.patientPhone = String(obj.patientPhone);
    if (obj.phone) result.patientPhone = String(obj.phone);
    if (obj.phoneNumber) result.patientPhone = String(obj.phoneNumber);
    if (obj.date) result.date = String(obj.date);
    if (obj.time) result.time = String(obj.time);
    if (obj.notes) result.issue = String(obj.notes);
    if (obj.issue) result.issue = String(obj.issue);
  }

  return result;
}

// Convert various date formats to valid Date
function parseDate(dateStr: string, timeStr?: string): Date {
  // Try YYYY-MM-DD
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return timeStr ? new Date(`${dateStr}T${timeStr}:00`) : d;

  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    if (year > 100) {
      d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        if (timeStr) {
          const [h, m] = timeStr.split(':').map(Number);
          d.setHours(h || 0, m || 0, 0, 0);
        }
        return d;
      }
    }
  }

  // Fallback
  return new Date();
}

export async function POST(request: Request) {
  try {
    let parsed: Record<string, string> = {};

    // 1. Try JSON body first
    try {
      const body = await request.json();
      if (body && (Array.isArray(body) || typeof body === 'object')) {
        parsed = parseBookingData(body);
      }
    } catch {}

    // 2. If still missing fields, try query parameters
    if (!parsed.patientName || !parsed.patientPhone) {
      const { searchParams } = new URL(request.url);
      const qsName = searchParams.get('patientName');
      const qsPhone = searchParams.get('patientPhone');
      const qsDate = searchParams.get('date');
      const qsTime = searchParams.get('time');
      const qsIssue = searchParams.get('issue');

      if (qsName && !parsed.patientName) parsed.patientName = qsName;
      if (qsPhone && !parsed.patientPhone) parsed.patientPhone = qsPhone;
      if (qsDate && !parsed.date) parsed.date = qsDate;
      if (qsTime && !parsed.time) parsed.time = qsTime;
      if (qsIssue && !parsed.issue) parsed.issue = qsIssue;
    }

    if (!parsed.patientName || !parsed.patientPhone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields (patientName, patientPhone)',
        received: parsed,
      }, { status: 400 });
    }

    // Build appointmentTime with flexible date parsing
    const appointmentTime = parseDate(parsed.date || '', parsed.time);

    // Create pending appointment
    const booking = await db.pendingAppointment.create({
      data: {
        patientName: parsed.patientName,
        patientPhone: parsed.patientPhone,
        serviceName: parsed.issue || null,
        appointmentTime: appointmentTime,
        notes: parsed.issue || null,
        status: 'pending',
      },
    });

    // Try to log (non-critical)
    try {
      await db.automationLog.create({
        data: {
          type: 'booking',
          source: 'n8n',
          payload: JSON.stringify(parsed),
          status: 'success',
          message: `Pending appointment created for ${parsed.patientName}`,
        },
      });
    } catch {}

    // Try to create notification (non-critical)
    try {
      await db.notification.create({
        data: {
          type: 'booking',
          title: 'حجز جديد بانتظار الموافقة',
          message: `حجز جديد: ${parsed.patientName} - ${parsed.date || ''} ${parsed.time || ''}`,
          source: 'n8n',
          data: JSON.stringify(parsed),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Booking received and pending approval',
      bookingId: booking.id,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('=== WEBHOOK ERROR ===', errorMsg);
    return NextResponse.json({
      success: false,
      error: 'Error processing webhook',
      details: errorMsg,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'n8n webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
