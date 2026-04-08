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
  Search,
  X,
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
import SearchableSelect from '@/components/ui/SearchableSelect';
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
    duration: 30, // المدة بالدقائق
    status: 'scheduled',
    notes: '',
  });

  // Patient search states
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const patientSearchRef = useRef<HTMLDivElement>(null);

  // إغلاق قائمة بحث المريض عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowPatientSearch(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // تأكيد سحب الموعد
  const [showDropConfirm, setShowDropConfirm] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<any>(null);

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
        return 'hsl(var(--primary))';
    }
  };

  // تصفية المرضى حسب البحث
  const sortedPatients = [...patients].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const filteredPatients = sortedPatients.filter((patient) =>
    patient.name.includes(patientSearch) || patient.phone.includes(patientSearch)
  );

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      ...formData,
      patientId: patient.id,
      patientName: patient.name,
    });
    setPatientSearch('');
    setShowPatientSearch(false);
  };

  const handleRemovePatient = () => {
    setSelectedPatient(null);
    setFormData({ ...formData, patientId: '', patientName: '' });
  };

  const handleDateClick = (arg: any) => {
    const date = new Date(arg.date);
    
    setFormData({
      patientId: '',
      patientName: '',
      serviceId: '',
      title: '',
      date: date.toISOString().split('T')[0],
      startTime: date.toTimeString().slice(0, 5),
      duration: 30,
      status: 'scheduled',
      notes: '',
    });
    setSelectedPatient(null);
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
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    
    setFormData({
      patientId: event.extendedProps.patientId || '',
      patientName: event.extendedProps.patientName || '',
      serviceId: event.extendedProps.serviceId || '',
      title: event.title || '',
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      duration: durationMinutes || 30,
      status: event.extendedProps.status || 'scheduled',
      notes: event.extendedProps.notes || '',
    });
    // تعيين المريض المختار عند التعديل
    if (event.extendedProps.patientId) {
      const patient = patients.find(p => p.id === event.extendedProps.patientId);
      if (patient) {
        setSelectedPatient(patient);
      }
    } else {
      setSelectedPatient(null);
    }
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleEventDrop = async (arg: any) => {
    const event = arg.event;
    const status = event.extendedProps.status;
    
    // منع السحب إذا كان الموعد مؤكد أو مكتمل أو ملغي
    if (status === 'confirmed' || status === 'completed' || status === 'cancelled') {
      toast.error('لا يمكن تعديل موعد ' + (status === 'confirmed' ? 'مؤكد' : status === 'completed' ? 'مكتمل' : 'ملغي'));
      arg.revert();
      return;
    }
    
    // إظهار تأكيد
    setPendingDrop({ event, arg });
    setShowDropConfirm(true);
  };

  const confirmDrop = async () => {
    if (!pendingDrop) return;
    const { event } = pendingDrop;
    
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
      // إعلام لوحة التحكم بالتحديث
      window.dispatchEvent(new CustomEvent('appointmentsUpdated'));
    } catch (error) {
      toast.error('خطأ في تحديث الموعد');
      pendingDrop.arg.revert();
    } finally {
      setShowDropConfirm(false);
      setPendingDrop(null);
      fetchAppointments();
    }
  };

  const cancelDrop = () => {
    if (pendingDrop) {
      pendingDrop.arg.revert();
    }
    setShowDropConfirm(false);
    setPendingDrop(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + formData.duration * 60000);
    
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
      // إعلام لوحة التحكم بالتحديث
      window.dispatchEvent(new CustomEvent('appointmentsUpdated'));
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
      // إرسال حدث لتحديث لوحة التحكم
      window.dispatchEvent(new CustomEvent('appointmentsUpdated'));
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
                duration: 30,
                status: 'scheduled',
                notes: '',
              });
              setSelectedPatient(null);
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
              
              {/* المريض المختار */}
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedPatient.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemovePatient}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                /* مربع البحث */
                <div className="relative" ref={patientSearchRef}>
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن مريض (الاسم أو رقم الهاتف)..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientSearch(true);
                    }}
                    onFocus={() => setShowPatientSearch(true)}
                    className="pr-10"
                  />
                  
                  {/* نتائج البحث */}
                  {showPatientSearch && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredPatients.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          لا يوجد مرضى مطابقين
                        </div>
                      ) : (
                        filteredPatients.slice(0, 10).map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            className="w-full flex items-center gap-3 p-3 hover:bg-muted text-right"
                            onClick={() => handleSelectPatient(patient)}
                          >
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">{patient.name}</p>
                              <p className="text-sm text-muted-foreground">{patient.phone}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>الخدمة</Label>
              <SearchableSelect
                options={services.map((s) => ({
                  value: s.id,
                  label: `${s.nameAr} - ${s.price} ل.س (${s.duration} دقيقة)`,
                }))}
                value={formData.serviceId}
                onChange={(value) => {
                  const service = services.find((s) => s.id === value);
                  setFormData({
                    ...formData,
                    serviceId: value,
                  });
                }}
                placeholder="اختر الخدمة"
              />
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
                <SearchableSelect
                  options={[
                    { value: 'scheduled', label: 'مجدول' },
                    { value: 'confirmed', label: 'مؤكد' },
                    { value: 'completed', label: 'مكتمل' },
                    { value: 'cancelled', label: 'ملغي' },
                  ]}
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value })}
                  placeholder="اختر الحالة"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>وقت الموعد</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>المدة</Label>
                <SearchableSelect
                  options={[
                    { value: '30', label: '30 دقيقة (نصف ساعة)' },
                    { value: '60', label: '60 دقيقة (ساعة واحدة)' },
                    { value: '90', label: '90 دقيقة (ساعة ونصف)' },
                    { value: '120', label: '120 دقيقة (ساعتان)' },
                    { value: '150', label: '150 دقيقة (ساعتان ونصف)' },
                    { value: '180', label: '180 دقيقة (3 ساعات)' },
                  ]}
                  value={formData.duration.toString()}
                  onChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
                  placeholder="اختر المدة"
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

      {/* تأكيد سحب الموعد */}
      <Dialog open={showDropConfirm} onOpenChange={setShowDropConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد تغيير الموعد</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-muted-foreground">
              هل أنت متأكد من تغيير وقت الموعد؟
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={cancelDrop}>
              إلغاء
            </Button>
            <Button onClick={confirmDrop} className="bg-primary">
              تأكيد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
