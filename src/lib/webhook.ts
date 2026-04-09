import { db } from '@/lib/db';

const CLINIC_TIMEZONE = 'Asia/Damascus';

interface WebhookPayload {
  event: 'appointment_created' | 'appointment_updated' | 'appointment_cancelled' | 'appointment_completed' | 'test';
  appointment: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    startTimeFormatted: string;
    endTimeFormatted: string;
    dateFormatted: string;
    status: string;
    notes?: string;
  };
  patient: {
    id: string;
    name: string;
    phone: string;
  };
  service?: {
    id: string;
    name: string;
    nameAr: string;
    price: number;
  };
  clinicName: string;
  clinicPhone: string;
  timestamp: string;
}

/**
 * إرسال webhook إلى n8n
 * يُستدعى عند إنشاء أو تعديل أو إلغاء موعد
 */
export async function sendWebhook(
  event: WebhookPayload['event'],
  appointmentData: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    status: string;
    notes?: string;
    patient: { id: string; name: string; phone: string } | null;
    service: { id: string; name: string; nameAr: string; price: number } | null;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // جلب رابط الـ webhook من الإعدادات
    const webhookSetting = await db.setting.findUnique({
      where: { key: 'n8nWebhookUrl' },
    });

    // جلب إعدادات التفعيل
    const whatsappSetting = await db.setting.findUnique({
      where: { key: 'whatsappEnabled' },
    });
    const whatsappEnabled = whatsappSetting?.value === 'true';

    if (!webhookSetting?.value) {
      return { success: false, message: 'Webhook URL not configured' };
    }

    if (!whatsappEnabled && event !== 'test') {
      return { success: false, message: 'WhatsApp integration is disabled' };
    }

    // جلب معلومات العيادة
    const clinicNameSetting = await db.setting.findUnique({
      where: { key: 'clinicName' },
    });
    const clinicPhoneSetting = await db.setting.findUnique({
      where: { key: 'clinicPhone' },
    });

    const startTime = new Date(appointmentData.startTime);
    const endTime = new Date(appointmentData.endTime);

    // تجهيز البيانات المرسلة
    const payload: WebhookPayload = {
      event,
      appointment: {
        id: appointmentData.id,
        title: appointmentData.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        startTimeFormatted: startTime.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: CLINIC_TIMEZONE,
        }),
        endTimeFormatted: endTime.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: CLINIC_TIMEZONE,
        }),
        dateFormatted: startTime.toLocaleDateString('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: CLINIC_TIMEZONE,
        }),
        status: appointmentData.status,
        notes: appointmentData.notes || undefined,
      },
      patient: appointmentData.patient || { id: '', name: 'غير معروف', phone: '' },
      service: appointmentData.service || undefined,
      clinicName: clinicNameSetting?.value || 'عيادة الأسنان',
      clinicPhone: clinicPhoneSetting?.value || '',
      timestamp: new Date().toISOString(),
    };

    // إرسال الـ webhook
    const response = await fetch(webhookSetting.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // timeout 10 seconds
    });

    // تسجيل العملية
    await db.automationLog.create({
      data: {
        type: event,
        source: 'system',
        payload: JSON.stringify(payload),
        status: response.ok ? 'success' : 'failed',
        message: response.ok ? 'Webhook sent successfully' : `HTTP ${response.status}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'Webhook sent successfully' };
    } else {
      return { success: false, message: `HTTP ${response.status}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // تسجيل الخطأ
    try {
      await db.automationLog.create({
        data: {
          type: event,
          source: 'system',
          payload: JSON.stringify({ error: errorMessage }),
          status: 'failed',
          message: errorMessage,
        },
      });
    } catch {
      // Ignore log errors
    }

    return { success: false, message: errorMessage };
  }
}

/**
 * إرسال webhook لقبول أو رفض حجز واتساب
 * يُستدعى عند قبول أو رفض موعد واتساب بانتظار الموافقة
 */
export async function sendBookingResponseWebhook(
  event: 'whatsapp_booking_accepted' | 'whatsapp_booking_rejected',
  data: {
    patientPhone: string;
    patientName: string;
    appointmentTimeFormatted?: string;
    serviceName?: string;
    reason?: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // جلب رابط الـ webhook من الإعدادات
    const webhookSetting = await db.setting.findUnique({
      where: { key: 'n8nWebhookUrl' },
    });

    if (!webhookSetting?.value) {
      return { success: false, message: 'Webhook URL not configured' };
    }

    // جلب اسم العيادة
    const clinicNameSetting = await db.setting.findUnique({
      where: { key: 'clinicName' },
    });

    const payload = {
      event,
      patientPhone: data.patientPhone,
      patientName: data.patientName,
      appointmentTimeFormatted: data.appointmentTimeFormatted,
      serviceName: data.serviceName,
      reason: data.reason,
      clinicName: clinicNameSetting?.value || 'عيادة الأسنان',
      timestamp: new Date().toISOString(),
    };

    // إرسال الـ webhook
    const response = await fetch(webhookSetting.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    // تسجيل العملية
    await db.automationLog.create({
      data: {
        type: event,
        source: 'system',
        payload: JSON.stringify(payload),
        status: response.ok ? 'success' : 'failed',
        message: response.ok ? 'Booking response webhook sent successfully' : `HTTP ${response.status}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'Webhook sent successfully' };
    } else {
      return { success: false, message: `HTTP ${response.status}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    try {
      await db.automationLog.create({
        data: {
          type: event,
          source: 'system',
          payload: JSON.stringify({ error: errorMessage }),
          status: 'failed',
          message: errorMessage,
        },
      });
    } catch {
      // Ignore log errors
    }

    return { success: false, message: errorMessage };
  }
}
