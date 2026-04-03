'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, Clock, User, Phone, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

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

interface Props {
  onSuccess?: () => void;
}

export default function QuickBookingModule({ onSuccess }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPatientMode, setNewPatientMode] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: '',
    newPatientName: '',
    newPatientPhone: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '09:30',
    notes: '',
  });

  useEffect(() => {
    fetchServices();
    fetchPatients();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services?active=true');
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

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      const startTime = formData.startTime.split(':');
      const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
      const endMinutes = startMinutes + service.duration;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      setFormData({
        ...formData,
        serviceId,
        endTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
      });
    } else {
      setFormData({ ...formData, serviceId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let patientId = formData.patientId;

      // Create new patient if needed
      if (newPatientMode && formData.newPatientName && formData.newPatientPhone) {
        const patientRes = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.newPatientName,
            phone: formData.newPatientPhone,
          }),
        });
        const patientData = await patientRes.json();
        patientId = patientData.patient.id;
      }

      if (!patientId) {
        toast.error('يرجى اختيار مريض أو إنشاء مريض جديد');
        setLoading(false);
        return;
      }

      // Create appointment
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          title: formData.newPatientName || patients.find((p) => p.id === patientId)?.name,
          serviceId: formData.serviceId || null,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          status: 'scheduled',
          notes: formData.notes,
        }),
      });

      toast.success('تم حجز الموعد بنجاح');
      
      // Reset form
      setFormData({
        patientId: '',
        newPatientName: '',
        newPatientPhone: '',
        serviceId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '09:30',
        notes: '',
      });
      setNewPatientMode(false);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('خطأ في حجز الموعد');
    } finally {
      setLoading(false);
    }
  };

  const availableSlots = [];
  for (let hour = 8; hour < 22; hour++) {
    for (let min = 0; min < 60; min += 30) {
      availableSlots.push(
        `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">حجز موعد سريع</h1>
          <p className="text-muted-foreground mt-1">حجز موعد جديد للعيادة</p>
        </div>
      </div>

      {/* Booking Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-primary" />
              بيانات الموعد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-2">
                  <Button
                    type="button"
                    variant={!newPatientMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewPatientMode(false)}
                    className={!newPatientMode ? 'bg-primary text-primary-foreground' : ''}
                  >
                    مريض موجود
                  </Button>
                  <Button
                    type="button"
                    variant={newPatientMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewPatientMode(true)}
                    className={newPatientMode ? 'bg-primary text-primary-foreground' : ''}
                  >
                    مريض جديد
                  </Button>
                </div>

                {!newPatientMode ? (
                  <div className="space-y-2">
                    <Label>اختر المريض</Label>
                    <Select
                      value={formData.patientId}
                      onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المريض..." />
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
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المريض</Label>
                      <Input
                        value={formData.newPatientName}
                        onChange={(e) =>
                          setFormData({ ...formData, newPatientName: e.target.value })
                        }
                        placeholder="الاسم الكامل"
                        required={newPatientMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الهاتف</Label>
                      <Input
                        value={formData.newPatientPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, newPatientPhone: e.target.value })
                        }
                        placeholder="رقم الهاتف"
                        required={newPatientMode}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Service Selection */}
              <div className="space-y-2">
                <Label>الخدمة</Label>
                <Select value={formData.serviceId} onValueChange={handleServiceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الخدمة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.nameAr} - {service.price.toLocaleString()} ل.س ({service.duration} دقيقة)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-3 gap-4">
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
                  <Label>وقت البداية</Label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              {/* Notes */}
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية..."
                  rows={2}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  'جاري الحجز...'
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 ml-2" />
                    تأكيد الحجز
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Info Card */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">معلومات سريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">ساعات العمل</span>
              </div>
              <p className="text-sm text-muted-foreground">
                السبت - الخميس
                <br />
                8:00 ص - 10:00 م
              </p>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">إحصائيات اليوم</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center mt-3">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {patients.length}
                  </p>
                  <p className="text-xs text-muted-foreground">مريض</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {services.length}
                  </p>
                  <p className="text-xs text-muted-foreground">خدمة</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
