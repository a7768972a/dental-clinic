'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  FileText,
  CreditCard,
  Banknote,
  Calendar,
  Download,
  Eye,
  CalendarClock,
  CheckCircle,
  Clock,
  AlertTriangle,
  FilePlus,
  Trash2,
  Wallet,
  User,
  Search,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface Invoice {
  id: string;
  invoiceNumber: string;
  patient: { name: string };
  patientId: string;
  status: string;
  total: number;
  paidAmount: number;
  createdAt: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface Service {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  category?: string;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

interface InstallmentPlan {
  id: string;
  invoiceId: string;
  invoice: {
    invoiceNumber: string;
    patient: { name: string };
  };
  totalAmount: number;
  numberOfMonths: number;
  monthlyAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  downPayment: number;
  installments: InstallmentPayment[];
}

interface InstallmentPayment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  paidAmount: number;
  status: string;
  lateFee: number;
}

interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  activeInstallments: number;
}

const expenseCategories = [
  { value: 'salaries', label: 'رواتب' },
  { value: 'supplies', label: 'مستلزمات' },
  { value: 'rent', label: 'إيجار' },
  { value: 'utilities', label: 'فواتير خدمات' },
  { value: 'equipment', label: 'معدات' },
  { value: 'other', label: 'أخرى' },
];

const invoiceStatuses = [
  { value: 'pending', label: 'معلقة', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'paid', label: 'مدفوعة', color: 'bg-green-100 text-green-700' },
  { value: 'partially-paid', label: 'مدفوعة جزئياً', color: 'bg-blue-100 text-blue-700' },
  { value: 'cancelled', label: 'ملغاة', color: 'bg-red-100 text-red-700' },
];

const installmentStatuses = [
  { value: 'active', label: 'نشط', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-red-100 text-red-700' },
  { value: 'defaulted', label: 'متأخر', color: 'bg-orange-100 text-orange-700' },
];

// كلمة سر الحذف
const DELETE_PASSWORD = 'delete123';

// دالة تنسيق الأرقام مع تقريب رقم واحد بعد الفاصلة
const formatAmount = (amount: number): string => {
  const rounded = Math.round(amount * 10) / 10;
  return rounded.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
};

export default function AccountingModule({ initialAction, onActionComplete }: { initialAction?: string | null; onActionComplete?: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
    activeInstallments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentPayment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  // بحث المريض
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [expenseForm, setExpenseForm] = useState({
    category: 'other',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    paidAmount: 0,
    method: 'cash',
    notes: '',
  });

  // Invoice creation form
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: '',
    paymentType: 'immediate' as 'immediate' | 'installment',
    items: [] as { serviceId: string; description: string; quantity: number; unitPrice: number; total: number }[],
    discount: 0,
    notes: '',
    // Installment options
    numberOfMonths: 3,
    downPayment: 0,
    startDate: new Date().toISOString().split('T')[0],
    // Immediate payment options
    paymentMethod: 'cash' as 'cash' | 'card' | 'transfer',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Handle initial action from quick actions
  useEffect(() => {
    if (initialAction === 'create-invoice') {
      setIsInvoiceDialogOpen(true);
      onActionComplete?.();
    } else if (initialAction === 'register-payment') {
      // Navigate to installments tab and show payment dialog if there are active plans
      fetchData().then(() => {
        // Will show installments tab
      });
      onActionComplete?.();
    }
  }, [initialAction]);

  const fetchData = async () => {
    try {
      const [invoicesRes, expensesRes, statsRes, installmentsRes, patientsRes, servicesRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/expenses'),
        fetch('/api/accounting/stats'),
        fetch('/api/installments'),
        fetch('/api/patients'),
        fetch('/api/services?active=true'),
      ]);

      const invoicesData = await invoicesRes.json();
      const expensesData = await expensesRes.json();
      const statsData = await statsRes.json();
      const installmentsData = await installmentsRes.json();
      const patientsData = await patientsRes.json();
      const servicesData = await servicesRes.json();

      setInvoices(invoicesData.invoices || []);
      setExpenses(expensesData.expenses || []);
      setStats(statsData.stats || stats);
      setInstallmentPlans(installmentsData.plans || []);
      setPatients(patientsData.patients || []);
      setServices(servicesData.services || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ترتيب المرضى أبجدياً
  const sortedPatients = [...patients].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  
  // تصفية المرضى حسب البحث
  const filteredPatients = patientSearch 
    ? sortedPatients.filter((patient) =>
        patient.name.includes(patientSearch) || patient.phone.includes(patientSearch)
      )
    : sortedPatients;

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setInvoiceForm({ ...invoiceForm, patientId: patient.id });
    setPatientSearch('');
    setShowPatientSearch(false);
  };

  const handleRemovePatient = () => {
    setSelectedPatient(null);
    setInvoiceForm({ ...invoiceForm, patientId: '' });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      });
      toast.success('تم إضافة المصروف');
      setIsExpenseDialogOpen(false);
      setExpenseForm({
        category: 'other',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchData();
    } catch (error) {
      toast.error('خطأ في إضافة المصروف');
    }
  };

  const handlePayInstallment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan || !selectedInstallment) return;

    try {
      await fetch(`/api/installments/${selectedPlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay',
          installmentId: selectedInstallment.id,
          paidAmount: paymentForm.paidAmount || selectedInstallment.amount,
          method: paymentForm.method,
          notes: paymentForm.notes,
        }),
      });

      toast.success('تم تسجيل الدفعة بنجاح');
      setIsPaymentDialogOpen(false);
      setPaymentForm({ paidAmount: 0, method: 'cash', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('خطأ في تسجيل الدفعة');
    }
  };

  // Calculate invoice totals
  const calculateInvoiceTotal = () => {
    const subtotal = invoiceForm.items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - invoiceForm.discount;
    return { subtotal, total };
  };

  // Add service to invoice
  const addServiceToInvoice = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const existingIndex = invoiceForm.items.findIndex(item => item.serviceId === serviceId);
    if (existingIndex >= 0) {
      // Update quantity if already exists
      const newItems = [...invoiceForm.items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].total = newItems[existingIndex].quantity * newItems[existingIndex].unitPrice;
      setInvoiceForm({ ...invoiceForm, items: newItems });
    } else {
      // Add new item
      setInvoiceForm({
        ...invoiceForm,
        items: [
          ...invoiceForm.items,
          {
            serviceId,
            description: service.nameAr,
            quantity: 1,
            unitPrice: service.price,
            total: service.price,
          },
        ],
      });
    }
  };

  // Remove item from invoice
  const removeItemFromInvoice = (index: number) => {
    const newItems = invoiceForm.items.filter((_, i) => i !== index);
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const newItems = [...invoiceForm.items];
    newItems[index].quantity = quantity;
    newItems[index].total = quantity * newItems[index].unitPrice;
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  // Handle invoice creation
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceForm.patientId) {
      toast.error('يرجى اختيار المريض');
      return;
    }

    if (invoiceForm.items.length === 0) {
      toast.error('يرجى إضافة خدمات للفاتورة');
      return;
    }

    const { subtotal, total } = calculateInvoiceTotal();

    try {
      // Create invoice
      const invoiceRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: invoiceForm.patientId,
          subtotal,
          discount: invoiceForm.discount,
          total,
          notes: invoiceForm.notes,
          items: invoiceForm.items,
          status: invoiceForm.paymentType === 'immediate' ? 'paid' : 'pending',
        }),
      });

      const invoiceData = await invoiceRes.json();

      if (invoiceData.error) {
        toast.error(invoiceData.error);
        return;
      }

      if (invoiceForm.paymentType === 'immediate') {
        // Create payment record for immediate payment
        await fetch('/api/invoices/' + invoiceData.invoice.id + '/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            method: invoiceForm.paymentMethod,
          }),
        });
        toast.success('تم إنشاء الفاتورة وتسجيل الدفع');
      } else {
        // Create installment plan
        const remainingAmount = total - invoiceForm.downPayment;
        const monthlyAmount = remainingAmount / invoiceForm.numberOfMonths;

        await fetch('/api/installments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: invoiceData.invoice.id,
            totalAmount: remainingAmount,
            numberOfMonths: invoiceForm.numberOfMonths,
            monthlyAmount,
            startDate: invoiceForm.startDate,
            downPayment: invoiceForm.downPayment,
          }),
        });

        // Register down payment if any
        if (invoiceForm.downPayment > 0) {
          await fetch('/api/invoices/' + invoiceData.invoice.id + '/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: invoiceForm.downPayment,
              method: 'cash',
            }),
          });
        }

        toast.success('تم إنشاء الفاتورة وخطة التقسيط');
      }

      // Reset form and close dialog
      setIsInvoiceDialogOpen(false);
      setInvoiceForm({
        patientId: '',
        paymentType: 'immediate',
        items: [],
        discount: 0,
        notes: '',
        numberOfMonths: 3,
        downPayment: 0,
        startDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('خطأ في إنشاء الفاتورة');
    }
  };

  const getCategoryLabel = (value: string) => {
    const category = expenseCategories.find((c) => c.value === value);
    return category?.label || value;
  };

  const getStatusInfo = (status: string) => {
    const statusInfo = invoiceStatuses.find((s) => s.value === status);
    return statusInfo || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const getInstallmentStatusInfo = (status: string) => {
    const statusInfo = installmentStatuses.find((s) => s.value === status);
    return statusInfo || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const getPendingInstallmentsCount = (plan: InstallmentPlan) => {
    return plan.installments.filter((i) => i.status === 'pending').length;
  };

  const getLateInstallmentsCount = (plan: InstallmentPlan) => {
    const now = new Date();
    return plan.installments.filter(
      (i) => i.status === 'pending' && new Date(i.dueDate) < now
    ).length;
  };

  // Get eligible invoices for installment (pending or partially paid)
  const eligibleInvoices = invoices.filter(
    (inv) => inv.status === 'pending' || inv.status === 'partially-paid'
  );

  // Handle delete invoice
  const handleDeleteInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        // Remove from local state immediately
        setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        
        // Remove from installment plans if exists
        setInstallmentPlans(prev => prev.filter(plan => plan.invoiceId !== invoice.id));
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('invoicesUpdated'));
        
        toast.success('تم حذف الفاتورة بنجاح');
        setIsDeleteDialogOpen(false);
        setDeletePassword('');
        setSelectedInvoice(null);
      } else {
        toast.error(data.error || 'خطأ في حذف الفاتورة');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('خطأ في حذف الفاتورة');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">المالية والمحاسبة</h1>
          <p className="text-muted-foreground mt-1">إدارة الفواتير والنفقات والتقسيط</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => setIsInvoiceDialogOpen(true)}
          >
            <FilePlus className="w-4 h-4 ml-2" />
            إنشاء فاتورة
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsExpenseDialogOpen(true)}
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة مصروف
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">ل.س</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي النفقات</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.totalExpenses.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">ل.س</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">صافي الربح</p>
                  <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-primary' : 'text-red-600'}`}>
                    {stats.netProfit.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">ل.س</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">فواتير معلقة</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pendingInvoices}
                  </p>
                  <p className="text-xs text-muted-foreground">فاتورة</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <Receipt className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">خطط التقسيط</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.activeInstallments}
                  </p>
                  <p className="text-xs text-muted-foreground">نشطة</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <CalendarClock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs for Invoices, Expenses, and Installments */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="invoices">الفواتير</TabsTrigger>
          <TabsTrigger value="expenses">النفقات</TabsTrigger>
          <TabsTrigger value="installments">التقسيط</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                قائمة الفواتير
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {invoices.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>لا توجد فواتير</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {invoices.map((invoice) => {
                      const statusInfo = getStatusInfo(invoice.status);
                      return (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{invoice.invoiceNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {invoice.patient?.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <p className="font-bold">{formatAmount(invoice.total)} ل.س</p>
                              <p className="text-xs text-muted-foreground">
                                مدفوع: {formatAmount(invoice.paidAmount)} ل.س
                              </p>
                            </div>
                            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                            <Button variant="ghost" size="icon" onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsDeleteDialogOpen(true);
                            }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-primary" />
                قائمة النفقات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {expenses.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <TrendingDown className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>لا توجد نفقات مسجلة</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline">{getCategoryLabel(expense.category)}</Badge>
                              <span>
                                {new Date(expense.date).toLocaleDateString('ar-SA')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-red-600">
                            {expense.amount.toLocaleString()} ل.س
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installments" className="mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                خطط التقسيط
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {installmentPlans.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <CalendarClock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>لا توجد خطط تقسيط</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsInstallmentDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إنشاء خطة تقسيط
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {installmentPlans.map((plan) => {
                      const statusInfo = getInstallmentStatusInfo(plan.status);
                      const pendingCount = getPendingInstallmentsCount(plan);
                      const lateCount = getLateInstallmentsCount(plan);
                      
                      return (
                        <div
                          key={plan.id}
                          className="p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                                <CalendarClock className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{plan.invoice.invoiceNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {plan.invoice.patient.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                              {lateCount > 0 && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="w-3 h-3 ml-1" />
                                  {lateCount} متأخر
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <p className="text-muted-foreground">المبلغ الكلي</p>
                              <p className="font-bold">{plan.totalAmount.toLocaleString()} ل.س</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">القسط الشهري</p>
                              <p className="font-bold">{plan.monthlyAmount.toLocaleString()} ل.س</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">الأقساط المتبقية</p>
                              <p className="font-bold">{pendingCount} / {plan.numberOfMonths}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">تاريخ الانتهاء</p>
                              <p className="font-bold">
                                {new Date(plan.endDate).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                          </div>
                          
                          {/* Installments Progress */}
                          <div className="flex gap-1 mb-3">
                            {plan.installments.map((inst) => (
                              <div
                                key={inst.id}
                                className={`flex-1 h-2 rounded-full ${
                                  inst.status === 'paid'
                                    ? 'bg-green-500'
                                    : new Date(inst.dueDate) < new Date()
                                    ? 'bg-red-300'
                                    : 'bg-gray-200'
                                }`}
                                title={`قسط ${inst.installmentNumber}: ${inst.amount.toLocaleString()} ل.س`}
                              />
                            ))}
                          </div>
                          
                          {/* Actions */}
                          {plan.status === 'active' && (
                            <div className="flex gap-2">
                              {plan.installments
                                .filter((inst) => inst.status === 'pending')
                                .slice(0, 3)
                                .map((inst) => (
                                  <Button
                                    key={inst.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPlan(plan);
                                      setSelectedInstallment(inst);
                                      setPaymentForm({
                                        paidAmount: inst.amount,
                                        method: 'cash',
                                        notes: '',
                                      });
                                      setIsPaymentDialogOpen(true);
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 ml-1" />
                                    دفع قسط {inst.installmentNumber}
                                  </Button>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مصروف جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>الفئة</Label>
              <SearchableSelect
                options={expenseCategories.map((cat) => ({ value: cat.value, label: cat.label }))}
                value={expenseForm.category}
                onChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                placeholder="اختر الفئة"
              />
            </div>
            
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المبلغ (ل.س)</Label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })
                  }
                  required
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            
            <DialogFooter>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Installment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة قسط</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayInstallment} className="space-y-4">
            {selectedInstallment && (
              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">قسط رقم {selectedInstallment.installmentNumber}</p>
                <p className="text-xl font-bold">{selectedInstallment.amount.toLocaleString()} ل.س</p>
                <p className="text-sm text-muted-foreground">
                  تاريخ الاستحقاق: {new Date(selectedInstallment.dueDate).toLocaleDateString('ar-SA')}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>المبلغ المدفوع (ل.س)</Label>
              <Input
                type="number"
                value={paymentForm.paidAmount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, paidAmount: parseFloat(e.target.value) || 0 })
                }
                required
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <SearchableSelect
                options={[
                  { value: 'cash', label: 'نقداً' },
                  { value: 'card', label: 'بطاقة' },
                  { value: 'transfer', label: 'تحويل' },
                ]}
                value={paymentForm.method}
                onChange={(value) => setPaymentForm({ ...paymentForm, method: value })}
                placeholder="اختر طريقة الدفع"
              />
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <CheckCircle className="w-4 h-4 ml-2" />
                تأكيد الدفع
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-primary" />
              إنشاء فاتورة جديدة
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">المريض</Label>
              
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
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن مريض (الاسم أو رقم الهاتف)..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientSearch(true);
                    }}
                    onFocus={() => setShowPatientSearch(true)}
                    className="pr-10 h-12"
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

            {/* Services Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">الخدمات</Label>
              <div className="flex flex-wrap gap-2">
                {services.map((service) => (
                  <Button
                    key={service.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addServiceToInvoice(service.id)}
                    className={
                      invoiceForm.items.some(item => item.serviceId === service.id)
                        ? 'bg-primary/10 border-primary'
                        : ''
                    }
                  >
                    {service.nameAr} ({service.price.toLocaleString()} ل.س)
                  </Button>
                ))}
              </div>

              {/* Selected Items */}
              {invoiceForm.items.length > 0 && (
                <div className="border rounded-lg divide-y mt-3">
                  {invoiceForm.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.unitPrice.toLocaleString()} ل.س × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <p className="font-bold text-primary w-24 text-left">
                          {item.total.toLocaleString()} ل.س
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeItemFromInvoice(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الخصم (ل.س)</Label>
                <Input
                  type="number"
                  value={invoiceForm.discount}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, discount: parseFloat(e.target.value) || 0 })
                  }
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..."
                />
              </div>
            </div>

            {/* Payment Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">طريقة الدفع</Label>
              <RadioGroup
                value={invoiceForm.paymentType}
                onValueChange={(value: 'immediate' | 'installment') =>
                  setInvoiceForm({ ...invoiceForm, paymentType: value })
                }
                className="grid grid-cols-2 gap-4"
              >
                <div
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    invoiceForm.paymentType === 'immediate'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setInvoiceForm({ ...invoiceForm, paymentType: 'immediate' })}
                >
                  <RadioGroupItem value="immediate" id="immediate" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-primary" />
                      <Label htmlFor="immediate" className="font-semibold cursor-pointer">
                        دفع فوري
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">دفع المبلغ كاملاً</p>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    invoiceForm.paymentType === 'installment'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setInvoiceForm({ ...invoiceForm, paymentType: 'installment' })}
                >
                  <RadioGroupItem value="installment" id="installment" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-primary" />
                      <Label htmlFor="installment" className="font-semibold cursor-pointer">
                        تقسيط
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">دفع على أقساط</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Immediate Payment Options */}
            {invoiceForm.paymentType === 'immediate' && (
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <Label className="font-semibold text-green-700">طريقة الدفع</Label>
                <SearchableSelect
                  options={[
                    { value: 'cash', label: 'نقداً' },
                    { value: 'card', label: 'بطاقة' },
                    { value: 'transfer', label: 'تحويل' },
                  ]}
                  value={invoiceForm.paymentMethod}
                  onChange={(value) =>
                    setInvoiceForm({ ...invoiceForm, paymentMethod: value as 'cash' | 'card' | 'transfer' })
                  }
                  placeholder="اختر طريقة الدفع"
                />
              </div>
            )}

            {/* Installment Options */}
            {invoiceForm.paymentType === 'installment' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="font-semibold text-blue-700">إعدادات التقسيط</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>عدد الأقساط</Label>
                    <SearchableSelect
                      options={[3, 6, 9, 12, 18, 24].map((months) => ({
                        value: months.toString(),
                        label: `${months} أقساط`,
                      }))}
                      value={invoiceForm.numberOfMonths.toString()}
                      onChange={(value) =>
                        setInvoiceForm({ ...invoiceForm, numberOfMonths: parseInt(value) })
                      }
                      placeholder="اختر عدد الأقساط"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الدفعة الأولى (ل.س)</Label>
                    <Input
                      type="number"
                      value={invoiceForm.downPayment}
                      onChange={(e) =>
                        setInvoiceForm({ ...invoiceForm, downPayment: parseFloat(e.target.value) || 0 })
                      }
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ بداية التقسيط</Label>
                    <Input
                      type="date"
                      value={invoiceForm.startDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, startDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Summary */}
            {invoiceForm.items.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المجموع الفرعي:</span>
                    <span>{calculateInvoiceTotal().subtotal.toLocaleString()} ل.س</span>
                  </div>
                  {invoiceForm.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>الخصم:</span>
                      <span>-{invoiceForm.discount.toLocaleString()} ل.س</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>المجموع:</span>
                    <span className="text-primary">{calculateInvoiceTotal().total.toLocaleString()} ل.س</span>
                  </div>
                  {invoiceForm.paymentType === 'installment' && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm text-blue-600">
                        <span>القسط الشهري:</span>
                        <span>
                          {(
                            (calculateInvoiceTotal().total - invoiceForm.downPayment) /
                            invoiceForm.numberOfMonths
                          ).toLocaleString()} ل.س
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" className="bg-primary hover:bg-primary/90 w-full h-12">
                <FilePlus className="w-5 h-5 ml-2" />
                إنشاء الفاتورة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              حذف الفاتورة
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.patient?.name}</p>
                <p className="text-lg font-bold mt-2">{formatAmount(selectedInvoice.total)} ل.س</p>
              </div>

              {/* إذا كانت الفاتورة مدفوعة بالكامل */}
              {selectedInvoice.status === 'paid' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 font-medium">هذه الفاتورة مدفوعة بالكامل</p>
                    <p className="text-sm text-green-600">يمكن حذفها بدون كلمة سر</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsDeleteDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDeleteInvoice(selectedInvoice)}
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف
                    </Button>
                  </div>
                </div>
              ) : (
                /* إذا لم تكن مدفوعة - تتطلب كلمة سر */
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700 font-medium">هذه الفاتورة غير مدفوعة بالكامل</p>
                    <p className="text-sm text-yellow-600">يتطلب إدخال كلمة السر للحذف</p>
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة السر</Label>
                    <Input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="أدخل كلمة السر"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setIsDeleteDialogOpen(false);
                        setDeletePassword('');
                      }}
                    >
                      إلغاء
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={deletePassword !== DELETE_PASSWORD}
                      onClick={() => {
                        if (deletePassword !== DELETE_PASSWORD) {
                          toast.error('كلمة السر غير صحيحة');
                          return;
                        }
                        handleDeleteInvoice(selectedInvoice);
                      }}
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
