'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, Clock, User, Phone, FileText, CheckCircle, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  onSuccess?: () => void;
}

export default function QuickBookingModule({ onSuccess }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPatientMode, setNewPatientMode] = useState(false);
  
  // بحث المريض
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
  
  const [formData, setFormData] = useState({
    patientId: '',
    newPatientName: '',
    newPatientPhone: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    duration: 30, // مدة الموعد بالدقائق
    notes: '',
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  // تصفية المرضى حسب البحث
  const filteredPatients = patients.filter((patient) =>
    patient.name.includes(patientSearch) || patient.phone.includes(patientSearch)
  );

  // حساب وقت النهاية من وقت البداية + المدة
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({ ...formData, patientId: patient.id });
    setPatientSearch('');
    setShowPatientSearch(false);
  };

  const handleRemovePatient = () => {
    setSelectedPatient(null);
    setFormData({ ...formData, patientId: '' });
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
      const endDateTime = new Date(startDateTime.getTime() + formData.duration * 60000);

      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          title: newPatientMode ? formData.newPatientName : selectedPatient?.name,
          serviceId: null, // بدون خدمة
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
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        duration: 30,
        notes: '',
      });
      setSelectedPatient(null);
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

  const durationOptions = [
    { value: 30, label: '30 دقيقة (نصف ساعة)' },
    { value: 60, label: '60 دقيقة (ساعة واحدة)' },
    { value: 90, label: '90 دقيقة (ساعة ونصف)' },
    { value: 120, label: '120 دقيقة (ساعتان)' },
    { value: 150, label: '150 دقيقة (ساعتان ونصف)' },
    { value: 180, label: '180 دقيقة (3 ساعات)' },
  ];

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
                    onClick={() => {
                      setNewPatientMode(false);
                      setSelectedPatient(null);
                    }}
                    className={!newPatientMode ? 'bg-primary text-primary-foreground' : ''}
                  >
                    مريض موجود
                  </Button>
                  <Button
                    type="button"
                    variant={newPatientMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setNewPatientMode(true);
                      setSelectedPatient(null);
                      setFormData({ ...formData, patientId: '' });
                    }}
                    className={newPatientMode ? 'bg-primary text-primary-foreground' : ''}
                  >
                    مريض جديد
                  </Button>
                </div>

                {!newPatientMode ? (
                  <div className="space-y-2">
                    <Label>اختر المريض</Label>
                    
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

              {/* Date, Time and Duration */}
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
                  <Label>وقت الموعد</Label>
                  <SearchableSelect
                    options={availableSlots.map((slot) => ({ value: slot, label: slot }))}
                    value={formData.startTime}
                    onChange={(value) => setFormData({ ...formData, startTime: value })}
                    placeholder="اختر الوقت"
                  />
                </div>
                <div className="space-y-2">
                  <Label>المدة</Label>
                  <SearchableSelect
                    options={durationOptions.map((opt) => ({ value: opt.value.toString(), label: opt.label }))}
                    value={formData.duration.toString()}
                    onChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
                    placeholder="اختر المدة"
                  />
                </div>
              </div>

              {/* End Time Display */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">وقت الانتهاء:</span>
                  <span className="font-medium">
                    {calculateEndTime(formData.startTime, formData.duration)}
                  </span>
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
                disabled={loading || (!newPatientMode && !selectedPatient)}
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
