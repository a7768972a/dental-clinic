'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  DollarSign,
  CalendarPlus,
  Receipt,
  Users2,
  Settings,
  Search,
  Bell,
  User,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import modules
import DashboardModule from '@/components/modules/Dashboard';
import SchedulerModule from '@/components/modules/Scheduler';
import PatientsModule from '@/components/modules/Patients';
import BillingModule from '@/components/modules/Billing';
import QuickBookingModule from '@/components/modules/QuickBooking';
import AccountingModule from '@/components/modules/Accounting';
import QueueModule from '@/components/modules/Queue';
import SettingsModule from '@/components/modules/Settings';

// Import auth and notifications
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import NotificationsPopover from '@/components/NotificationsPopover';

// Sidebar menu items - تغيير "قائمة الأسعار" إلى "قائمة الخدمات"
const menuItems = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'scheduler', label: 'جدول المواعيد', icon: CalendarDays },
  { id: 'patients', label: 'ملفات المرضى', icon: Users },
  { id: 'billing', label: 'قائمة الخدمات', icon: DollarSign }, // تم التغيير
  { id: 'quick-booking', label: 'حجز موعد', icon: CalendarPlus },
  { id: 'accounting', label: 'الفواتير والنفقات', icon: Receipt },
  { id: 'queue', label: 'صالة الانتظار', icon: Users2 },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

function DentalOSContent() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [alwaysShowSidebar, setAlwaysShowSidebar] = useState(true);
  const [queueDisplayMode, setQueueDisplayMode] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [moduleAction, setModuleAction] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load sidebar preference and logo
  useEffect(() => {
    let mounted = true;

    const loadPreference = () => {
      const savedPref = localStorage.getItem('alwaysShowSidebar');
      if (mounted && savedPref !== null) {
        setAlwaysShowSidebar(savedPref === 'true');
      }
      const savedLogo = localStorage.getItem('clinicLogo');
      if (mounted && savedLogo) {
        setCustomLogo(savedLogo);
      }
    };

    requestAnimationFrame(loadPreference);

    // Listen for setting changes
    const handleSettingChange = (e: CustomEvent) => {
      if (mounted) {
        setAlwaysShowSidebar(e.detail.alwaysShowSidebar);
        if (e.detail.alwaysShowSidebar) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener('sidebarSettingChanged', handleSettingChange as EventListener);

    // Listen for queue display mode changes
    const handleQueueDisplayMode = (e: CustomEvent) => {
      if (mounted) {
        setQueueDisplayMode(e.detail.isDisplayMode);
      }
    };
    window.addEventListener('queueDisplayModeChanged', handleQueueDisplayMode as EventListener);

    // Listen for logo changes
    const handleLogoChange = (e: CustomEvent) => {
      if (mounted) {
        setCustomLogo(e.detail.logoDataUrl || null);
      }
    };
    window.addEventListener('logoChanged', handleLogoChange as EventListener);

    // Listen for navigation events from dashboard quick actions
    const handleNavigateToModule = (e: CustomEvent) => {
      if (mounted) {
        setActiveModule(e.detail.module);
        if (e.detail.action) {
          setModuleAction(e.detail.action);
        }
      }
    };
    window.addEventListener('navigateToModule', handleNavigateToModule as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('sidebarSettingChanged', handleSettingChange as EventListener);
      window.removeEventListener('queueDisplayModeChanged', handleQueueDisplayMode as EventListener);
      window.removeEventListener('logoChanged', handleLogoChange as EventListener);
      window.removeEventListener('navigateToModule', handleNavigateToModule as EventListener);
    };
  }, []);

  // Fetch notifications
  useEffect(() => {
    let mounted = true;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (mounted && data.notifications) {
          setNotifications(data.notifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // عرض شاشة التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // إذا لم يكن مسجل الدخول، عرض شاشة تسجيل الدخول
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardModule />;
      case 'scheduler':
        return <SchedulerModule />;
      case 'patients':
        return <PatientsModule initialAction={moduleAction} onActionComplete={() => setModuleAction(null)} />;
      case 'billing':
        return <BillingModule />;
      case 'quick-booking':
        return <QuickBookingModule onSuccess={() => setActiveModule('scheduler')} />;
      case 'accounting':
        return <AccountingModule initialAction={moduleAction} onActionComplete={() => setModuleAction(null)} />;
      case 'queue':
        return <QueueModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <DashboardModule />;
    }
  };

  const handleModuleClick = (moduleId: string) => {
    setActiveModule(moduleId);
    if (!alwaysShowSidebar) {
      setSidebarOpen(false);
    }
  };

  // If queue display mode is active, only show the queue module
  if (queueDisplayMode) {
    return (
      <div className="min-h-screen" dir="rtl">
        <QueueModule />
        <Toaster position="top-left" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Sidebar */}
      {alwaysShowSidebar ? (
        <aside className="w-[200px] flex flex-col gold-gradient text-white shadow-2xl fixed right-0 top-0 h-full z-40">
          {/* Logo Section */}
          <div className="p-3 border-b border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm overflow-hidden">
                {customLogo ? (
                  <img src={customLogo} alt="Clinic Logo" className="w-full h-full object-cover" />
                ) : (
                  <img src="/dental-logo.svg" alt="Dental Logo" className="w-10 h-10" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="font-bold text-sm leading-tight">عيادة الدكتور</h1>
                <p className="text-xs text-white/80">بشار عابدين</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-2">
            <nav className="space-y-1 px-3">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full flex items-center gap-1 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm'
                        : 'hover:bg-white/10 text-white/80'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span className="font-medium text-base flex-1 text-right">{item.label}</span>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                  </motion.button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>
      ) : (
        <>
          {/* Toggle Button */}
          <Button
            variant="default"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="fixed top-4 right-4 z-50 bg-[#D4AF37] hover:bg-[#B8960C] text-white shadow-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Sidebar with animation */}
          <AnimatePresence>
            {sidebarOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-40"
                  onClick={() => setSidebarOpen(false)}
                />

                {/* Sidebar */}
                <motion.aside
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25 }}
                  className="w-72 flex flex-col gold-gradient text-white shadow-2xl fixed right-0 top-0 h-full z-50"
                >
                  {/* Logo Section */}
                  <div className="p-6 border-b border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
                        {customLogo ? (
                          <img src={customLogo} alt="Clinic Logo" className="w-full h-full object-cover" />
                        ) : (
                          <img src="/dental-logo.svg" alt="Dental Logo" className="w-12 h-12" />
                        )}
                      </div>
                      <div>
                        <h1 className="font-bold text-lg">عيادة الدكتور</h1>
                        <p className="text-sm text-white/80">بشار عابدين</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <ScrollArea className="flex-1 py-4">
                    <nav className="space-y-1 px-3">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeModule === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleModuleClick(item.id)}
                            className={`w-full flex items-center gap-1 px-4 py-3 rounded-xl transition-all ${
                              isActive
                                ? 'bg-white/25 text-white'
                                : 'hover:bg-white/10 text-white/80'
                            }`}
                          >
                            <span className="font-medium flex-1 text-right">{item.label}</span>
                            <Icon className="w-5 h-5" />
                          </button>
                        );
                      })}
                    </nav>
                  </ScrollArea>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          alwaysShowSidebar ? 'mr-[200px]' : ''
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-border shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن مريض، موعد، خدمة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-muted/50 border-0 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-muted"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </Button>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-primary/10 hover:bg-primary/20"
                  >
                    <User className="w-5 h-5 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => setActiveModule('settings')}
                    className="cursor-pointer"
                  >
                    <Settings className="w-4 h-4 ml-2" />
                    الإعدادات
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      toast.success('تم تسجيل الخروج');
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Module Content */}
        <main className="flex-1 p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* تم إزالة الـ Footer بالكامل */}
      </div>

      {/* Notifications Popover */}
      <NotificationsPopover
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationChange={() => {
          // Refresh notifications count
          fetch('/api/notifications')
            .then((res) => res.json())
            .then((data) => setNotifications(data.notifications || []));
        }}
      />

      <Toaster position="top-left" richColors />
    </div>
  );
}

export default function DentalOS() {
  return (
    <AuthProvider>
      <DentalOSContent />
    </AuthProvider>
  );
}
