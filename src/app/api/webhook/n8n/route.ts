import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Parse n8n array format: ["Name :value", "Phone Number :value", "Date :value", "Time :value", "Issue :value"]
function parseArrayFormat(data: unknown): Record<string, string> {
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

// This endpoint receives webhook data from n8n (WhatsApp/Telegram bookings)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Try to parse array format from n8n
    const parsed = parseArrayFormat(body);
    const hasParsedData = Object.keys(parsed).length > 0;
    
    // If n8n sent array format, create pending appointment from it
    if (hasParsedData) {
      const { patientName, patientPhone, date, time, issue, serviceName } = parsed;
      
      if (!patientName || !patientPhone) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields (patientName, patientPhone)',
          received: parsed,
        }, { status: 400 });
      }

      // Build appointmentTime from date + time
      let appointmentTime: Date;
      if (date && time) {
        appointmentTime = new Date(`${date}T${time}:00`);
      } else if (date) {
        appointmentTime = new Date(date);
      } else {
        appointmentTime = new Date();
      }

      await db.pendingAppointment.create({
        data: {
          patientName: patientName,
          patientPhone: patientPhone,
          serviceName: serviceName || issue || null,
          appointmentTime: appointmentTime,
          notes: issue || null,
          status: 'pending',
        },
      });

      // Log the incoming webhook
      await db.automationLog.create({
        data: {
          type: 'booking',
          source: 'n8n',
          payload: JSON.stringify(body),
          status: 'success',
          message: `Pending appointment created for ${patientName}`,
        },
      });

      // Create notification
      await db.notification.create({
        data: {
          type: 'booking',
          title: 'حجز جديد بانتظار الموافقة',
          message: `حجز جديد: ${patientName} - ${date || ''} ${time || ''}`,
          source: 'n8n',
          data: JSON.stringify(parsed),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Booking received and pending approval',
      });
    }

    // Log the incoming webhook
    await db.automationLog.create({
      data: {
        type: 'booking',
        source: body.source || 'n8n',
        payload: JSON.stringify(body),
        status: 'success',
        message: 'Webhook received',
      },
    });

    // Handle WhatsApp/Telegram pending booking (needs approval)
    if (body.type === 'whatsapp_booking') {
      let notes = body.notes || '';
      if (body.chatId) {
        notes = notes ? `${notes} [chatId:${body.chatId}]` : `[chatId:${body.chatId}]`;
      }

      await db.pendingAppointment.create({
        data: {
          patientName: body.patientName || 'غير معروف',
          patientPhone: body.patientPhone || '',
          serviceName: body.serviceName || null,
          appointmentTime: new Date(body.appointmentTime),
          sourceMessageId: body.sourceMessageId || null,
          notes: notes || null,
          status: 'pending',
        },
      });

      await db.notification.create({
        data: {
          type: 'booking',
          title: 'حجز واتساب بانتظار الموافقة',
          message: `حجز جديد بانتظار الموافقة: ${body.patientName || 'غير معروف'} - ${body.serviceName || 'خدمة عامة'}`,
          source: body.source || 'whatsapp',
          data: JSON.stringify({
            patientName: body.patientName,
            patientPhone: body.patientPhone,
            serviceName: body.serviceName,
            appointmentTime: body.appointmentTime,
            chatId: body.chatId || null,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'WhatsApp booking received and pending approval',
      });
    }

    // Handle different webhook types
    if (body.type === 'booking' || body.patientName) {
      let patient = await db.patient.findFirst({
        where: { phone: body.patientPhone },
      });

      if (!patient && body.patientName && body.patientPhone) {
        patient = await db.patient.create({
          data: { name: body.patientName, phone: body.patientPhone },
        });
      }

      if (patient && body.appointmentTime) {
        const startTime = new Date(body.appointmentTime);
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

        await db.appointment.create({
          data: {
            patientId: patient.id,
            title: body.serviceName || `موعد ${patient.name}`,
            startTime,
            endTime,
            status: 'scheduled',
            notes: body.notes || 'محجوز عبر الواتساب',
          },
        });
      }

      await db.notification.create({
        data: {
          type: 'booking',
          title: 'حجز جديد من الواتساب',
          message: `حجز جديد للمريض ${body.patientName || 'غير معروف'} - ${body.serviceName || 'خدمة عامة'}`,
          source: 'whatsapp',
          data: JSON.stringify({
            patientName: body.patientName,
            patientPhone: body.patientPhone,
            serviceName: body.serviceName,
            appointmentTime: body.appointmentTime,
          }),
        },
      });
    }

    if (body.type === 'reminder_response') {
      if (body.appointmentId && body.response) {
        await db.appointment.update({
          where: { id: body.appointmentId },
          data: {
            status: body.response === 'confirmed' ? 'confirmed' : 'cancelled',
          },
        });

        await db.notification.create({
          data: {
            type: 'reminder',
            title: 'رد على التذكير',
            message: `المريض ${body.patientName || ''} قام بـ ${body.response === 'confirmed' ? 'تأكيد' : 'إلغاء'} الموعد`,
            source: 'whatsapp',
          },
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    try {
      await db.automationLog.create({
        data: {
          type: 'booking',
          source: 'n8n',
          payload: '{}',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (logError) {
      console.error('Error logging webhook error:', logError);
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Error processing webhook' 
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'n8n webhook endpoint is active',
    timestamp: new Date().toISOString() 
  });
}
