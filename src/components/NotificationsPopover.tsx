'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Trash2, UserPlus, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationChange: () => void;
}

export default function NotificationsPopover({
  isOpen,
  onClose,
  onNotificationChange,
}: NotificationsPopoverProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      onNotificationChange();
      toast.success('تم حذف الإشعار');
    } catch (error) {
      toast.error('خطأ في حذف الإشعار');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      onNotificationChange();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <UserPlus className="w-4 h-4" />;
      case 'reminder':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'booking':
        return 'bg-green-100 text-green-600';
      case 'reminder':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-yellow-100 text-yellow-600';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Popover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed left-4 top-20 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border overflow-hidden"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-l from-[#D4AF37]/10 to-transparent">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                الإشعارات
              </h3>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="h-80">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <Bell className="w-12 h-12 mb-3 opacity-50" />
                  <p>لا توجد إشعارات</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 transition-colors ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${getTypeColor(notification.type)}`}
                        >
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(notification.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
