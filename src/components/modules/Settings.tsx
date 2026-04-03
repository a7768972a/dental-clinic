'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Webhook,
  MessageSquare,
  Bell,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Shield,
  Database,
  Clock,
  Palette,
  Menu,
  Layout,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Settings {
  n8nWebhookUrl: string;
  whatsappEnabled: boolean;
  reminderEnabled: boolean;
  reminderHoursBefore: number;
  clinicName: string;
  clinicPhone: string;
  clinicAddress: string;
  alwaysShowSidebar: boolean;
  logoDataUrl: string;
}

interface WebhookLog {
  id: string;
  type: string;
  source: string;
  status: string;
  message?: string;
  createdAt: string;
}

export default function SettingsModule() {
  const [settings, setSettings] = useState<Settings>({
    n8nWebhookUrl: '',
    whatsappEnabled: false,
    reminderEnabled: true,
    reminderHoursBefore: 24,
    clinicName: 'عيادة الدكتور بشار عابدين',
    clinicPhone: '',
    clinicAddress: '',
    alwaysShowSidebar: true,
    logoDataUrl: '',
  });
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchWebhookLogs();
    
    // Load sidebar preference from localStorage
    const savedSidebarPref = localStorage.getItem('alwaysShowSidebar');
    if (savedSidebarPref !== null) {
      setSettings(prev => ({ ...prev, alwaysShowSidebar: savedSidebarPref === 'true' }));
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        const settingsMap: Record<string, string> = {};
        data.settings.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSettings(prev => ({
          ...prev,
          n8nWebhookUrl: settingsMap.n8nWebhookUrl || '',
          whatsappEnabled: settingsMap.whatsappEnabled === 'true',
          reminderEnabled: settingsMap.reminderEnabled !== 'false',
          reminderHoursBefore: parseInt(settingsMap.reminderHoursBefore) || 24,
          clinicName: settingsMap.clinicName || 'عيادة الدكتور بشار عابدين',
          clinicPhone: settingsMap.clinicPhone || '',
          clinicAddress: settingsMap.clinicAddress || '',
          alwaysShowSidebar: settingsMap.alwaysShowSidebar !== 'false', // default true
          logoDataUrl: settingsMap.logoDataUrl || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookLogs = async () => {
    try {
      const res = await fetch('/api/automation/logs');
      const data = await res.json();
      setWebhookLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'n8nWebhookUrl', value: settings.n8nWebhookUrl },
        { key: 'whatsappEnabled', value: settings.whatsappEnabled.toString() },
        { key: 'reminderEnabled', value: settings.reminderEnabled.toString() },
        { key: 'reminderHoursBefore', value: settings.reminderHoursBefore.toString() },
        { key: 'clinicName', value: settings.clinicName },
        { key: 'clinicPhone', value: settings.clinicPhone },
        { key: 'clinicAddress', value: settings.clinicAddress },
        { key: 'alwaysShowSidebar', value: settings.alwaysShowSidebar.toString() },
        { key: 'logoDataUrl', value: settings.logoDataUrl },
      ];

      // Save logo to localStorage for immediate effect
      localStorage.setItem('clinicLogo', settings.logoDataUrl);
      
      // Dispatch event to notify sidebar
      window.dispatchEvent(new CustomEvent('logoChanged', {
        detail: { logoDataUrl: settings.logoDataUrl }
      }));

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      });

      // Save to localStorage for immediate effect
      localStorage.setItem('alwaysShowSidebar', settings.alwaysShowSidebar.toString());
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('sidebarSettingChanged', {
        detail: { alwaysShowSidebar: settings.alwaysShowSidebar }
      }));

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      toast.error('خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!settings.n8nWebhookUrl) {
      toast.error('يرجى إدخال رابط الـ Webhook أولاً');
      return;
    }

    setTestingWebhook(true);
    try {
      const response = await fetch('/api/automation/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.n8nWebhookUrl }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('تم إرسال الاختبار بنجاح');
      } else {
        toast.error('فشل الاتصال بالـ Webhook');
      }
    } catch (error) {
      toast.error('خطأ في الاتصال');
    } finally {
      setTestingWebhook(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookEndpoint = `${window.location.origin}/api/webhook/n8n`;
    navigator.clipboard.writeText(webhookEndpoint);
    toast.success('تم نسخ الرابط');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 2 ميجابايت');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSettings(prev => ({ ...prev, logoDataUrl: dataUrl }));
      toast.success('تم تحميل الصورة بنجاح');
    };
    reader.onerror = () => {
      toast.error('خطأ في قراءة الملف');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, logoDataUrl: '' }));
    localStorage.removeItem('clinicLogo');
    window.dispatchEvent(new CustomEvent('logoChanged', { detail: { logoDataUrl: '' } }));
    toast.success('تم حذف اللوغو');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-muted-foreground mt-1">إدارة النظام والربط التقني</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? (
            'جاري الحفظ...'
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              حفظ الإعدادات
            </>
          )}
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="appearance">المظهر</TabsTrigger>
          <TabsTrigger value="integration">الربط التقني</TabsTrigger>
          <TabsTrigger value="clinic">العيادة</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="mt-6 space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Layout className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>تخطيط الواجهة</CardTitle>
                  <CardDescription>
                    تخصيص مظهر وتخطيط الواجهة
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Layout className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">القائمة مفتوحة دائماً</p>
                    <p className="text-sm text-muted-foreground">
                      إبقاء القائمة الجانبية مفتوحة وثابتة على اليمين
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.alwaysShowSidebar}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, alwaysShowSidebar: checked })
                  }
                />
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-700">ملاحظة</p>
                    <p className="text-sm text-blue-600 mt-1">
                      عند التفعيل: القائمة تظهر دائماً مفتوحة على اليمين بدون زر القائمة.
                      <br />
                      عند التعطيل: يمكن طي القائمة بزر ◀ ويظهر زر القائمة ☰ على الموبايل.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>لوغو العيادة</CardTitle>
                  <CardDescription>
                    رفع صورة خاصة للوغو العيادة (ينصح بصورة بيضاء أو فاتحة)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                {/* Logo Preview */}
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8960C] flex items-center justify-center overflow-hidden shadow-lg">
                  {settings.logoDataUrl ? (
                    <img 
                      src={settings.logoDataUrl} 
                      alt="Logo Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src="/dental-logo.svg" 
                      alt="Default Logo" 
                      className="w-16 h-16"
                    />
                  )}
                </div>

                {/* Upload Actions */}
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="w-4 h-4 ml-2" />
                          رفع صورة
                        </span>
                      </Button>
                    </label>
                    {settings.logoDataUrl && (
                      <Button 
                        variant="destructive" 
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الأحجام المدعومة: PNG, JPG, SVG • الحد الأقصى: 2MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    يُنصح باستخدام صورة بخلفية شفافة أو بيضاء
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Palette className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>الخط والألوان</CardTitle>
                  <CardDescription>
                    إعدادات الخط والألوان في النظام
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">الخط الحالي</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      IBM Plex Sans Arabic - خط عربي احترافي
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    افتراضي
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-2">اللون الأساسي</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary shadow-md" />
                      <span className="font-mono text-sm">#D4AF37</span>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-2">الخلفية</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white border shadow-md" />
                      <span className="font-mono text-sm">#FFFFFF</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="mt-6 space-y-6">
          {/* n8n Integration */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Webhook className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>ربط n8n للأتمتة</CardTitle>
                  <CardDescription>
                    ربط العيادة مع نظام n8n لإرسال التذكيرات والتنبيهات
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>رابط Webhook URL (الصادر)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://your-n8n-instance.com/webhook/..."
                    value={settings.n8nWebhookUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, n8nWebhookUrl: e.target.value })
                    }
                    dir="ltr"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !settings.n8nWebhookUrl}
                  >
                    {testingWebhook ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  هذا الرابط سيُستخدم لإرسال البيانات من النظام إلى n8n
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>رابط Webhook الوارد (للاستقبال)</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/n8n`}
                    readOnly
                    dir="ltr"
                    className="bg-muted"
                  />
                  <Button variant="outline" onClick={copyWebhookUrl}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  استخدم هذا الرابط في n8n لإرسال حجوزات الواتساب إلى النظام
                </p>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Integration */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <CardTitle>ربط WhatsApp</CardTitle>
                  <CardDescription>
                    إرسال التذكيرات والرسائل عبر الواتساب
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.whatsappEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, whatsappEnabled: checked })
                  }
                />
              </div>
            </CardHeader>
            {settings.whatsappEnabled && (
              <CardContent>
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700">الواتساب مفعل</p>
                    <p className="text-sm text-green-600">
                      سيتم إرسال التذكيرات تلقائياً للمواعيد
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Webhook Logs */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  سجل العمليات الآلية
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchWebhookLogs}>
                  <RefreshCw className="w-4 h-4 ml-1" />
                  تحديث
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {webhookLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد عمليات مسجلة</p>
                  </div>
                ) : (
                  webhookLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            log.status === 'success'
                              ? 'bg-green-50'
                              : 'bg-red-50'
                          }`}
                        >
                          {log.status === 'success' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{log.type}</p>
                          <p className="text-sm text-muted-foreground">{log.source}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.status === 'success' ? 'نجاح' : 'فشل'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.createdAt).toLocaleTimeString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinic Tab */}
        <TabsContent value="clinic" className="mt-6 space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>معلومات العيادة</CardTitle>
              <CardDescription>
                المعلومات الأساسية للعيادة التي تظهر في التقارير والفواتير
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اسم العيادة</Label>
                <Input
                  value={settings.clinicName}
                  onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={settings.clinicPhone}
                  onChange={(e) => setSettings({ ...settings, clinicPhone: e.target.value })}
                  placeholder="رقم هاتف العيادة"
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={settings.clinicAddress}
                  onChange={(e) => setSettings({ ...settings, clinicAddress: e.target.value })}
                  placeholder="عنوان العيادة"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                إعدادات التذكيرات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">تفعيل التذكيرات التلقائية</p>
                  <p className="text-sm text-muted-foreground">
                    إرسال تذكير تلقائي للمواعيد القادمة
                  </p>
                </div>
                <Switch
                  checked={settings.reminderEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, reminderEnabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  إرسال التذكير قبل (بالساعات)
                </Label>
                <Input
                  type="number"
                  value={settings.reminderHoursBefore}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reminderHoursBefore: parseInt(e.target.value) || 24,
                    })
                  }
                  min={1}
                  max={72}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  سيتم إرسال التذكير قبل الموعد بالمدة المحددة
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                أمان النظام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-medium">النظام محمي</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  جميع البيانات مشفرة ومحفوظة بشكل آمن
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
