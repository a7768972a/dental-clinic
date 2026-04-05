'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import DentalChart from '@/components/DentalChart';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  medicalNotes?: string;
  allergies?: string;
  createdAt: string;
  _count?: {
    appointments: number;
    invoices: number;
  };
}

const toothConditions = [
  { value: 'healthy', label: 'سليم', color: '#ffffff', stroke: '#cccccc' },
  { value: 'decay', label: 'تسوس', color: '#ef4444', stroke: '#dc2626' },
  { value: 'filling', label: 'حشو', color: '#3b82f6', stroke: '#2563eb' },
  { value: 'implant', label: 'زراعة', color: '#D4AF37', stroke: '#B8960C' },
  { value: 'extracted', label: 'مخلوع', color: '#6b7280', stroke: '#4b5563' },
  { value: 'crown', label: 'تاج', color: '#a855f7', stroke: '#9333ea' },
  { value: 'root-canal', label: 'علاج عصب', color: '#f97316', stroke: '#ea580c' },
];

export default function PatientsModule({ initialAction, onActionComplete }: { initialAction?: string | null; onActionComplete?: () => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    medicalNotes: '',
    allergies: '',
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  // Handle initial action from quick actions
  useEffect(() => {
    if (initialAction === 'add-patient') {
      openNewDialog();
      onActionComplete?.();
    }
  }, [initialAction]);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.includes(searchQuery) ||
      patient.phone.includes(searchQuery) ||
      (patient.email && patient.email.includes(searchQuery))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedPatient) {
        await fetch(`/api/patients/${selectedPatient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        toast.success('تم تحديث بيانات المريض');
      } else {
        const res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          toast.success('تم إضافة المريض بنجاح');
        } else {
          throw new Error('Failed to add patient');
        }
      }
      setIsDialogOpen(false);
      // Force refresh with no cache
      setLoading(true);
      await fetchPatients();
    } catch (error) {
      toast.error('خطأ في حفظ البيانات');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المريض؟')) return;
    
    try {
      await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      toast.success('تم حذف المريض');
      fetchPatients();
    } catch (error) {
      toast.error('خطأ في حذف المريض');
    }
  };

  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      name: patient.name,
      phone: patient.phone,
      email: patient.email || '',
      dateOfBirth: patient.dateOfBirth
        ? new Date(patient.dateOfBirth).toISOString().split('T')[0]
        : '',
      gender: patient.gender || '',
      address: patient.address || '',
      medicalNotes: patient.medicalNotes || '',
      allergies: patient.allergies || '',
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedPatient(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      medicalNotes: '',
      allergies: '',
    });
    setIsDialogOpen(true);
  };

  const viewPatientDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">ملفات المرضى</h1>
          <p className="text-muted-foreground mt-1">إدارة السجلات الطبية والأسنان</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={openNewDialog}
        >
          <UserPlus className="w-4 h-4 ml-2" />
          إضافة مريض
        </Button>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="البحث بالاسم، رقم الهاتف، أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients List / Details View */}
      <AnimatePresence mode="wait">
        {showPatientDetails && selectedPatient ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card className="border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPatientDetails(false)}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <div>
                    <CardTitle>{selectedPatient.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="w-4 h-4 ml-1" />
                    طباعة
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(selectedPatient)}
                  >
                    <Edit2 className="w-4 h-4 ml-1" />
                    تعديل
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">المعلومات</TabsTrigger>
                    <TabsTrigger value="dental">مخطط الأسنان</TabsTrigger>
                    <TabsTrigger value="history">السجل الطبي</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Phone className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                            <p className="font-medium">{selectedPatient.phone}</p>
                          </div>
                        </div>
                        
                        {selectedPatient.email && (
                          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Mail className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                              <p className="font-medium">{selectedPatient.email}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedPatient.dateOfBirth && (
                          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Calendar className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">تاريخ الميلاد</p>
                              <p className="font-medium">
                                {new Date(selectedPatient.dateOfBirth).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedPatient.address && (
                          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <MapPin className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">العنوان</p>
                              <p className="font-medium">{selectedPatient.address}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        {selectedPatient.gender && (
                          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <UserPlus className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">الجنس</p>
                              <p className="font-medium">
                                {selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {selectedPatient.allergies && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                              <p className="font-medium text-red-700">الحساسية</p>
                            </div>
                            <p className="text-sm text-red-600">{selectedPatient.allergies}</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-primary/10 rounded-lg text-center">
                            <p className="text-2xl font-bold text-primary">
                              {selectedPatient._count?.appointments || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">زيارة</p>
                          </div>
                          <div className="p-3 bg-primary/10 rounded-lg text-center">
                            <p className="text-2xl font-bold text-primary">
                              {selectedPatient._count?.invoices || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">فاتورة</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="dental" className="mt-4">
                    <DentalChart patientId={selectedPatient.id} />
                  </TabsContent>
                  
                  <TabsContent value="history" className="mt-4">
                    <div className="space-y-4">
                      {selectedPatient.medicalNotes ? (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <p className="font-medium">ملاحظات طبية</p>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedPatient.medicalNotes}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>لا توجد ملاحظات طبية مسجلة</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="border-0 shadow-md">
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {loading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : filteredPatients.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <UserPlus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">لا يوجد مرضى</p>
                      <p className="text-sm">ابدأ بإضافة مريض جديد</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredPatients.map((patient) => (
                        <motion.div
                          key={patient.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => viewPatientDetails(patient)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{patient.name}</p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {patient.phone}
                                </span>
                                {patient.gender && (
                                  <span>
                                    {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {patient._count?.appointments || 0} زيارة
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(patient);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(patient.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPatient ? 'تعديل بيانات المريض' : 'إضافة مريض جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم الكامل *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>الجنس</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ الميلاد</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>الحساسية</Label>
              <Input
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="أي حساسية معروفة..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات طبية</Label>
              <Textarea
                value={formData.medicalNotes}
                onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                placeholder="أي ملاحظات طبية إضافية..."
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {selectedPatient ? 'تحديث' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
