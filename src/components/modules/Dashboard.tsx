'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Clock,
  Bell,
  CheckCircle,
  AlertCircle,
  UserPlus,
  CreditCard,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
  pendingInvoices: number;
}

interface RecentAppointment {
  id: string;
  patientName: string;
  time: string;
  service: string;
  status: string;
}

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  data?: string;
}

export default function DashboardModule() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();

    // الاستماع لتغييرات المواعيد
    const handleAppointmentsUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('appointmentsUpdated', handleAppointmentsUpdate);

    return () => {
      window.removeEventListener('appointmentsUpdated', handleAppointmentsUpdate);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setStats(data.stats || stats);
      setRecentAppointments(data.recentAppointments || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('تم حذف الإشعار');
    } catch (error) {
      toast.error('خطأ في حذف الإشعار');
    }
  };

  const statCards = [
    {
      title: 'إجمالي المرضى',
      value: stats.totalPatients,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'مواعيد اليوم',
      value: stats.todayAppointments,
      icon: CalendarDays,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'الإيرادات الشهرية',
      value: `${stats.monthlyRevenue.toLocaleString()} ل.س`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'صافي الربح',
      value: `${stats.netProfit.toLocaleString()} ل.س`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'مجدول';
      case 'confirmed':
        return 'مؤكد';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">مرحباً بك في نظام إدارة العيادة</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="card-hover border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              مواعيد اليوم
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">
              عرض الكل
              <ArrowUpRight className="w-4 h-4 mr-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد مواعيد اليوم</p>
              </div>
            ) : (
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {recentAppointments.map((appointment) => (
                    <motion.div
                      key={appointment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{appointment.patientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.time} • {appointment.service}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusLabel(appointment.status)}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Notifications Center - تم إزالة كلمة n8n */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              مركز التنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد إشعارات جديدة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 10).map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-3 rounded-lg border relative group ${
                        notification.read
                          ? 'bg-background border-border'
                          : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            notification.type === 'booking'
                              ? 'bg-green-100 text-green-600'
                              : notification.type === 'reminder'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-yellow-100 text-yellow-600'
                          }`}
                        >
                          {notification.type === 'booking' ? (
                            <UserPlus className="w-4 h-4" />
                          ) : notification.type === 'reminder' ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.createdAt).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {/* زر الحذف */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteNotification(notification.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 hover:bg-primary/5 hover:border-primary"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigateToModule', { detail: { module: 'quick-booking' } }));
              }}
            >
              <UserPlus className="w-6 h-6 text-primary" />
              <span>حجز موعد جديد</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 hover:bg-primary/5 hover:border-primary"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigateToModule', { detail: { module: 'patients', action: 'add-patient' } }));
              }}
            >
              <Users className="w-6 h-6 text-primary" />
              <span>إضافة مريض</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 hover:bg-primary/5 hover:border-primary"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigateToModule', { detail: { module: 'accounting', action: 'create-invoice' } }));
              }}
            >
              <CreditCard className="w-6 h-6 text-primary" />
              <span>إنشاء فاتورة</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 hover:bg-primary/5 hover:border-primary"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigateToModule', { detail: { module: 'accounting', action: 'register-payment' } }));
              }}
            >
              <CheckCircle className="w-6 h-6 text-primary" />
              <span>تسجيل دفعة</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
