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
    const body = await request.json();
    console.log('=== n8n webhook received ===', JSON.stringify(body));

    const parsed = parseBookingData(body);
    console.log('=== parsed data ===', JSON.stringify(parsed));

    if (!parsed.patientName || !parsed.patientPhone) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields (patientName, patientPhone)',
        received: parsed,
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

    // Create pending appointment (main action)
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

    console.log('=== booking created ===', booking.id);

    // Try to log (non-critical - don't fail if table doesn't exist)
    try {
      await db.automationLog.create({
        data: {
          type: 'booking',
          source: 'n8n',
          payload: JSON.stringify(body),
          status: 'success',
          message: `Pending appointment created for ${parsed.patientName}`,
        },
      });
    } catch (logErr) {
      console.log('automationLog skipped:', logErr instanceof Error ? logErr.message : 'unknown');
    }

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
    } catch (notifErr) {
      console.log('notification skipped:', notifErr instanceof Error ? notifErr.message : 'unknown');
    }

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
