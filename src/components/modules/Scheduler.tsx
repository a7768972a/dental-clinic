'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import arLocale from '@fullcalendar/core/locales/ar';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Clock,
  User,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AppointmentEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    patientId: string;
    patientName: string;
    serviceId: string;
    serviceName: string;
    status: string;
    notes?: string;
  };
}

interface Service {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  duration: number;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
}

export default function SchedulerModule() {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('timeGridWeek');
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    serviceId: '',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    status: 'scheduled',
    notes: '',
  });

  useEffect(() => {
    fetchAppointments();
    fetchServices();
    fetchPatients();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      const formattedEvents = (data.appointments || []).map((apt: any) => ({
        id: apt.id,
        title: apt.title || apt.patient?.name || 'موعد',
        start: apt.startTime,
        end: apt.endTime,
        backgroundColor: getStatusColor(apt.status),
        borderColor: getStatusColor(apt.status),
        extendedProps: {
          patientId: apt.patientId,
          patientName: apt.patient?.name || '',
          serviceId: apt.serviceId,
          serviceName: apt.service?.nameAr || apt.service?.name || '',
          status: apt.status,
          notes: apt.notes,
        },
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#3b82f6';
      case 'confirmed':
        return '#22c55e';
      case 'completed':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#D4AF37';
    }
  };

  const handleDateClick = (arg: any) => {
    const date = new Date(arg.date);
    const endTime = new Date(date.getTime() + 30 * 60 * 1000);
    
    setFormData({
      patientId: '',
      patientName: '',
      serviceId: '',
      title: '',
      date: date.toISOString().split('T')[0],
      startTime: date.toTimeString().slice(0, 5),
      endTime: endTime.toTimeString().slice(0, 5),
      status: 'scheduled',
      notes: '',
    });
    setIsEditMode(false);
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const handleEventClick = (arg: any) => {
    const event = arg.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start?.toISOString() || '',
      end: event.end?.toISOString() || '',
      extendedProps: event.extendedProps,
    });
    
    const startDate = new Date(event.start || '');
    const endDate = new Date(event.end || '');
    
    setFormData({
      patientId: event.extendedProps.patientId || '',
      patientName: event.extendedProps.patientName || '',
      serviceId: event.extendedProps.serviceId || '',
      title: event.title || '',
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5),
      status: event.extendedProps.status || 'scheduled',
      notes: event.extendedProps.notes || '',
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleEventDrop = async (arg: any) => {
    const event = arg.event;
    try {
      await fetch(`/api/appointments/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: event.start?.toISOString(),
          endTime: event.end?.toISOString(),
        }),
      });
      toast.success('تم تحديث الموعد بنجاح');
    } catch (error) {
      toast.error('خطأ في تحديث الموعد');
      arg.revert();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
    
    const appointmentData = {
      patientId: formData.patientId,
      title: formData.title || formData.patientName,
      serviceId: formData.serviceId || null,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      status: formData.status,
      notes: formData.notes,
    };

    try {
      if (isEditMode && selectedEvent) {
        await fetch(`/api/appointments/${selectedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData),
        });
        toast.success('تم تحديث الموعد بنجاح');
      } else {
        await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData),
        });
        toast.success('تم إنشاء الموعد بنجاح');
      }
      setIsDialogOpen(false);
      fetchAppointments();
    } catch (error) {
      toast.error('خطأ في حفظ الموعد');
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    
    try {
      await fetch(`/api/appointments/${selectedEvent.id}`, {
        method: 'DELETE',
      });
      toast.success('تم حذف الموعد بنجاح');
      setIsDialogOpen(false);
      fetchAppointments();
    } catch (error) {
      toast.error('خطأ في حذف الموعد');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedEvent) return;
    
    try {
      await fetch(`/api/appointments/${selectedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      toast.success('تم تحديث حالة الموعد');
      setIsDialogOpen(false);
      fetchAppointments();
    } catch (error) {
      toast.error('خطأ في تحديث الحالة');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">جدول المواعيد</h1>
          <p className="text-muted-foreground mt-1">إدارة وتنظيم مواعيد العيادة</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchAppointments()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => {
              setFormData({
                patientId: '',
                patientName: '',
                serviceId: '',
                title: '',
                date: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endTime: '09:30',
                status: 'scheduled',
                notes: '',
              });
              setIsEditMode(false);
              setSelectedEvent(null);
              setIsDialogOpen(true);
            }}
          >
            <CalendarPlus className="w-4 h-4 ml-2" />
            موعد جديد
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-4 lg:p-6">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={currentView}
            locale={arLocale}
            direction="rtl"
            headerToolbar={{
              right: 'prev,next today',
              center: 'title',
              left: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            buttonText={{
              today: 'اليوم',
              month: 'شهر',
              week: 'أسبوع',
              day: 'يوم',
              list: 'قائمة',
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            editable={true}
            droppable={true}
            eventDrop={handleEventDrop}
            eventDurationEditable={true}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            height="auto"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            views={{
              timeGridWeek: {
                dayHeaderContent: (args) => {
                  const day = args.date.toLocaleDateString('ar-SA', { weekday: 'short' });
                  const date = args.date.getDate();
                  return `${day} ${date}`;
                },
              },
            }}
            dayMaxEvents={3}
            moreLinkText={(num) => `+${num} المزيد`}
            noEventsText="لا توجد مواعيد"
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm">مجدول</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm">مؤكد</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-sm">مكتمل</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm">ملغي</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'تعديل الموعد' : 'موعد جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>المريض</Label>
              <Select
                value={formData.patientId}
                onValueChange={(value) => {
                  const patient = patients.find((p) => p.id === value);
                  setFormData({
                    ...formData,
                    patientId: value,
                    patientName: patient?.name || '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المريض" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الخدمة</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) => {
                  const service = services.find((s) => s.id === value);
                  setFormData({
                    ...formData,
                    serviceId: value,
                    endTime: service
                      ? new Date(
                          new Date(`${formData.date}T${formData.startTime}`).getTime() +
                            service.duration * 60000
                        )
                          .toTimeString()
                          .slice(0, 5)
                      : formData.endTime,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الخدمة" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.nameAr} - {service.price} ل.س ({service.duration} دقيقة)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">مجدول</SelectItem>
                    <SelectItem value="confirmed">مؤكد</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>وقت البداية</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>وقت النهاية</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أي ملاحظات إضافية..."
                rows={2}
              />
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              {isEditMode && (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    className="ml-auto"
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    حذف
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleStatusChange('confirmed')}
                    >
                      <CheckCircle className="w-4 h-4 ml-1" />
                      تأكيد
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleStatusChange('cancelled')}
                    >
                      <XCircle className="w-4 h-4 ml-1" />
                      إلغاء
                    </Button>
                  </div>
                </>
              )}
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {isEditMode ? 'تحديث' : 'إنشاء'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
