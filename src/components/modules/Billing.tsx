'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Search,
  Tag,
  Clock,
  CheckCircle,
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
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  price: number;
  duration: number;
  description?: string;
  active: boolean;
}

const categories = [
  { value: 'cleaning', label: 'تنظيف وتبييض' },
  { value: 'restoration', label: 'حشوات وترميم' },
  { value: 'surgery', label: 'جراحة' },
  { value: 'cosmetic', label: 'تجميل' },
  { value: 'orthodontics', label: 'تقويم' },
  { value: 'other', label: 'أخرى' },
];

export default function BillingModule() {
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    category: 'other',
    price: 0,
    duration: 30,
    description: '',
    active: true,
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.includes(searchQuery) ||
      service.nameAr.includes(searchQuery);
    const matchesCategory =
      selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedService) {
        await fetch(`/api/services/${selectedService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        toast.success('تم تحديث الخدمة');
      } else {
        await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        toast.success('تم إضافة الخدمة');
      }
      setIsDialogOpen(false);
      fetchServices();
    } catch (error) {
      toast.error('خطأ في حفظ البيانات');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    
    try {
      await fetch(`/api/services/${id}`, { method: 'DELETE' });
      toast.success('تم حذف الخدمة');
      fetchServices();
    } catch (error) {
      toast.error('خطأ في حذف الخدمة');
    }
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      nameAr: service.nameAr,
      category: service.category,
      price: service.price,
      duration: service.duration,
      description: service.description || '',
      active: service.active,
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedService(null);
    setFormData({
      name: '',
      nameAr: '',
      category: 'other',
      price: 0,
      duration: 30,
      description: '',
      active: true,
    });
    setIsDialogOpen(true);
  };

  const getCategoryLabel = (value: string) => {
    const category = categories.find((c) => c.value === value);
    return category?.label || value;
  };

  const groupedServices = filteredServices.reduce((acc, service) => {
    const category = service.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">قائمة الخدمات</h1>
          <p className="text-muted-foreground mt-1">إدارة الخدمات والأسعار</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={openNewDialog}
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة خدمة
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="البحث عن خدمة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <SearchableSelect
              options={[
                { value: 'all', label: 'جميع الفئات' },
                ...categories.map((cat) => ({ value: cat.value, label: cat.label })),
              ]}
              value={selectedCategory}
              onChange={setSelectedCategory}
              placeholder="جميع الفئات"
              className="w-full sm:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="space-y-6">
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="w-5 h-5 text-primary" />
                  {getCategoryLabel(category)}
                  <Badge variant="secondary" className="text-xs">
                    {categoryServices.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {categoryServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{service.nameAr}</p>
                          {!service.active && (
                            <Badge variant="outline" className="text-xs">
                              غير نشط
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {service.duration} دقيقة
                          </span>
                          {service.description && (
                            <span className="truncate max-w-[200px]">
                              {service.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-bold text-lg text-primary">
                            {service.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">ل.س</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(service)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(service.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {!loading && filteredServices.length === 0 && (
          <Card className="border-0 shadow-md">
            <CardContent className="py-16 text-center text-muted-foreground">
              <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">لا توجد خدمات</p>
              <p className="text-sm">ابدأ بإضافة خدمات جديدة</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم بالعربية *</Label>
                <Input
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم بالإنجليزية</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الفئة</Label>
                <SearchableSelect
                  options={categories.map((cat) => ({ value: cat.value, label: cat.label }))}
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  placeholder="اختر الفئة"
                />
              </div>
              <div className="space-y-2">
                <Label>المدة (بالدقائق)</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })
                  }
                  min={5}
                  step={5}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>السعر (ل.س) *</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                }
                required
                min={0}
              />
            </div>
            
            <div className="space-y-2">
              <Label>وصف الخدمة</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label>خدمة نشطة</Label>
            </div>
            
            <DialogFooter>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {selectedService ? 'تحديث' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
