'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  User,
  Phone,
  Clock,
  Stethoscope,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const CLINIC_TIMEZONE = 'Asia/Damascus';

interface PendingAppointment {
  id: string;
  patientName: string;
  patientPhone: string;
  serviceName: string | null;
  appointmentTime: string;
  status: string;
  notes: string | null;
  sourceMessageId: string | null;
  createdAt: string;
}

export default function WhatsAppBookings() {
  const [appointments, setAppointments] = useState<PendingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);
  const [acceptId, setAcceptId] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch('/api/pending-appointments');
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching pending appointments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  const formatAppointmentTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: CLINIC_TIMEZONE,
    });
    const timeFormatted = date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: CLINIC_TIMEZONE,
    });
    return `${dateFormatted} - ${timeFormatted}`;
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  const handleAcceptClick = (id: string) => {
    setAcceptId(id);
    setConfirmAcceptOpen(true);
  };

  const handleAcceptConfirm = async () => {
    if (!acceptId) return;
    setProcessingId(acceptId);
    setConfirmAcceptOpen(false);

    try {
      const res = await fetch(`/api/pending-appointments/${acceptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('تم قبول الحجز بنجاح');
        setAppointments((prev) => prev.filter((a) => a.id !== acceptId));
      } else {
        toast.error(data.error || 'حدث خطأ أثناء قبول الحجز');
      }
    } catch (error) {
      console.error('Error accepting appointment:', error);
      toast.error('حدث خطأ أثناء قبول الحجز');
    } finally {
      setProcessingId(null);
      setAcceptId(null);
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setProcessingId(rejectId);
    setRejectDialogOpen(false);

    try {
      const res = await fetch(`/api/pending-appointments/${rejectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('تم رفض الحجز');
        setAppointments((prev) => prev.filter((a) => a.id !== rejectId));
      } else {
        toast.error(data.error || 'حدث خطأ أثناء رفض الحجز');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      toast.error('حدث خطأ أثناء رفض الحجز');
    } finally {
      setProcessingId(null);
      setRejectId(null);
      setRejectReason('');
    }
  };

  const isPastAppointment = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center animate-pulse">
            <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="h-6 bg-muted rounded-md w-40 animate-pulse" />
            <div className="h-4 bg-muted rounded-md w-24 mt-1 animate-pulse" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded-md w-3/4 mb-3" />
              <div className="h-4 bg-muted rounded-md w-1/2 mb-3" />
              <div className="h-4 bg-muted rounded-md w-2/3 mb-4" />
              <div className="flex gap-2">
                <div className="h-10 bg-muted rounded-md w-24" />
                <div className="h-10 bg-muted rounded-md w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">حجوزات الواتساب</h2>
            <p className="text-sm text-muted-foreground">المواعيد بانتظار الموافقة</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {appointments.length > 0 && (
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm px-3 py-1"
            >
              {appointments.length} بانتظار الموافقة
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAppointments}
            className="h-9 w-9"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <Inbox className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                لا يوجد حجوزات معلقة
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                جميع حجوزات الواتساب تمت معالجتها. سيتم عرض الحجوزات الجديدة هنا
                تلقائياً عند وصولها.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-220px)]">
          <div className="grid gap-4">
            <AnimatePresence>
              {appointments.map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 100, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    layout: true,
                  }}
                  layout
                >
                  <Card
                    className={`border transition-shadow hover:shadow-md ${
                      isPastAppointment(appointment.appointmentTime)
                        ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
                        : 'border-border'
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Patient Info */}
                        <div className="flex-1 space-y-3">
                          {/* Name & Time ago */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold text-foreground text-base">
                                {appointment.patientName}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(appointment.createdAt)}
                            </span>
                          </div>

                          {/* Phone */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span dir="ltr">{appointment.patientPhone}</span>
                          </div>

                          {/* Service */}
                          {appointment.serviceName && (
                            <div className="flex items-center gap-2 text-sm">
                              <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="font-medium text-foreground">
                                {appointment.serviceName}
                              </span>
                            </div>
                          )}

                          {/* Appointment Time */}
                          <div className="flex items-start gap-2 text-sm">
                            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div>
                              <span
                                className={
                                  isPastAppointment(appointment.appointmentTime)
                                    ? 'text-amber-700 dark:text-amber-400 font-semibold'
                                    : 'text-foreground'
                                }
                              >
                                {formatAppointmentTime(appointment.appointmentTime)}
                              </span>
                              {isPastAppointment(appointment.appointmentTime) && (
                                <Badge
                                  variant="outline"
                                  className="mr-2 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700 text-xs"
                                >
                                  موعد سابق
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Notes */}
                          {appointment.notes && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{appointment.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex sm:flex-col gap-2 sm:pt-1">
                          <Button
                            onClick={() => handleAcceptClick(appointment.id)}
                            disabled={processingId === appointment.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px] sm:min-w-[80px]"
                            size="sm"
                          >
                            {processingId === appointment.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 ml-1" />
                                <span>قبول ✅</span>
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleRejectClick(appointment.id)}
                            disabled={processingId === appointment.id}
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50 min-w-[100px] sm:min-w-[80px]"
                            size="sm"
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            <span>رفض ❌</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      {/* Confirm Accept Dialog */}
      <Dialog open={confirmAcceptOpen} onOpenChange={setConfirmAcceptOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              تأكيد قبول الحجز
            </DialogTitle>
            <DialogDescription>
              هل تريد قبول هذا الحجز؟ سيتم إنشاء موعد جديد في جدول المواعيد وإرسال تأكيد
              للمريض عبر الواتساب.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              onClick={() => setConfirmAcceptOpen(false)}
              variant="outline"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAcceptConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 ml-1" />
              تأكيد القبول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              سبب رفض الحجز
            </DialogTitle>
            <DialogDescription>
              يرجى كتابة سبب الرفض ليتم إرساله للمريض عبر الواتساب.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="مثال: الموعد غير متاح في هذا الوقت، يرجى اختيار موعد آخر..."
            className="min-h-[100px] resize-none"
            autoFocus
          />
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              onClick={() => setRejectDialogOpen(false)}
              variant="outline"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim()}
              variant="destructive"
            >
              <XCircle className="w-4 h-4 ml-1" />
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
