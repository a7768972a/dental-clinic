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
    if (obj.serviceName) result.serviceName = String(obj.serviceName);
  }

  return result;
}

export async function POST(request: Request) {
  try {
    // Try to read body JSON
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    // If body is empty, try reading from URL search params (qs)
    let parsed: Record<string, string> = {};
    if (body && (Array.isArray(body) || (typeof body === 'object' && body !== null))) {
      parsed = parseBookingData(body);
    }

    // Fallback: check query params (when n8n sends data in qs instead of body)
    if (!parsed.patientName && !parsed.patientPhone) {
      const url = new URL(request.url);
      const qs = url.searchParams;
      const allParams: string[] = [];
      qs.forEach((val, key) => allParams.push(`${key} :${val}`));
      // Also check if qs has array-like values
      for (const [key, val] of qs.entries()) {
        if (key.includes('name')) parsed.patientName = val;
        else if (key.includes('phone') || key.includes('number')) parsed.patientPhone = val;
        else if (key.includes('date')) parsed.date = val;
        else if (key.includes('time')) parsed.time = val;
        else if (key.includes('issue') || key.includes('notes')) parsed.issue = val;
      }
      // If still nothing, try parsing array from qs values
      if (!parsed.patientName && allParams.length === 0) {
        // Try to get raw query string
        const rawQs = url.search;
        if (rawQs) {
          // n8n sometimes sends: ?Name :value&Phone Number :value
          const pairs = rawQs.slice(1).split('&');
          const items = pairs.map(p => {
            const eq = p.indexOf('=');
            return eq > -1 ? p.slice(eq + 1) : p;
          });
          parsed = parseBookingData(items);
        }
      }
    }

    console.log('=== n8n webhook === parsed:', JSON.stringify(parsed));

    if (!parsed.patientName || !parsed.patientPhone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields (patientName, patientPhone)',
        received: parsed,
        hint: 'Send JSON body: {"patientName":"name","patientPhone":"phone","date":"2025-01-15","time":"10:00","issue":"notes"}',
      }, { status: 400 });
    }

    // Build appointmentTime
    let appointmentTime: Date;
    if (parsed.date && parsed.time) {
      appointmentTime = new Date(`${parsed.date}T${parsed.time}:00`);
    } else if (parsed.date) {
      appointmentTime = new Date(parsed.date);
    } else {
      appointmentTime = new Date();
    }

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
