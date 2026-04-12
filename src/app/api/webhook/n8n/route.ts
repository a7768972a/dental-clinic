import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

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

function buildDate(dateStr: string, timeStr: string): Date {
  const now = new Date();

  // Parse time
  let hours = 0;
  let minutes = 0;
  if (timeStr) {
    const timeClean = timeStr.trim();
    const timeParts = timeClean.split(':');
    hours = parseInt(timeParts[0]) || 0;
    minutes = parseInt(timeParts[1]) || 0;
  }

  // Parse date
  if (!dateStr || !dateStr.trim()) {
    now.setHours(hours, minutes, 0, 0);
    return now;
  }

  const dateClean = dateStr.trim();
  const parts = dateClean.split(/[\/\-\.]/);

  if (parts.length === 3) {
    let day: number;
    let month: number;
    let year: number;

    // Check if first part is year (YYYY-MM-DD)
    if (parseInt(parts[0]) > 100) {
      year = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      day = parseInt(parts[2]);
    } else {
      // DD/MM/YYYY
      day = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      year = parseInt(parts[2]);
      // If year looks like it was swapped (e.g., year < 100 or unreasonably large)
      if (year < 100) year += 2000;
    }

    if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
      const d = new Date(year, month, day, hours, minutes, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Try standard parsing
  const d = new Date(dateClean);
  if (!isNaN(d.getTime())) {
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  // Fallback to now
  now.setHours(hours, minutes, 0, 0);
  return now;
}

export async function POST(request: Request) {
  try {
    let parsed: Record<string, string> = {};

    // 1. Try JSON body
    try {
      const body = await request.json();
      if (body && (Array.isArray(body) || typeof body === 'object')) {
        parsed = parseBookingData(body);
      }
    } catch {}

    // 2. Try query parameters
    if (!parsed.patientName || !parsed.patientPhone) {
      const { searchParams } = new URL(request.url);
      if (!parsed.patientName) parsed.patientName = searchParams.get('patientName') || '';
      if (!parsed.patientPhone) parsed.patientPhone = searchParams.get('patientPhone') || '';
      if (!parsed.date) parsed.date = searchParams.get('date') || '';
      if (!parsed.time) parsed.time = searchParams.get('time') || '';
      if (!parsed.issue) parsed.issue = searchParams.get('issue') || '';
    }

    if (!parsed.patientName || !parsed.patientPhone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        received: parsed,
      }, { status: 400 });
    }

    const appointmentTime = buildDate(parsed.date || '', parsed.time || '');

    const booking = await db.pendingAppointment.create({
      data: {
        patientName: parsed.patientName,
        patientPhone: parsed.patientPhone,
        serviceName: parsed.issue || null,
        appointmentTime,
        notes: parsed.issue || null,
        status: 'pending',
      },
    });

    try { await db.automationLog.create({ data: { type: 'booking', source: 'n8n', payload: JSON.stringify(parsed), status: 'success', message: `Booking for ${parsed.patientName}` } }); } catch {}
    try { await db.notification.create({ data: { type: 'booking', title: 'حجز جديد بانتظار الموافقة', message: `حجز جديد: ${parsed.patientName} - ${parsed.date || ''} ${parsed.time || ''}`, source: 'n8n', data: JSON.stringify(parsed) } }); } catch {}

    return NextResponse.json({ success: true, message: 'Booking received', bookingId: booking.id });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Error processing webhook', details: errorMsg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'n8n webhook active' });
}
