'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  User,
  Calendar,
  Bell,
  Sparkles,
  Maximize,
  Minimize,
} from 'lucide-react';

interface QueueEntry {
  id: string;
  patient: {
    id: string;
    name: string;
    phone: string;
  };
  appointment?: {
    startTime: string;
  };
  status: 'arrived' | 'waiting' | 'with-doctor' | 'completed';
  priority: number;
  checkInTime: string;
  calledTime?: string;
  completedAt?: string;
  notes?: string;
}

export default function QueueModule() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isDisplayMode, setIsDisplayMode] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Fetch logo from settings
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        // First check localStorage for immediate display
        const savedLogo = localStorage.getItem('clinicLogo');
        if (savedLogo) {
          setLogoUrl(savedLogo);
        }

        // Then fetch from API to ensure we have the latest
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings) {
          const logoSetting = data.settings.find((s: any) => s.key === 'logoDataUrl');
          if (logoSetting?.value) {
            setLogoUrl(logoSetting.value);
            localStorage.setItem('clinicLogo', logoSetting.value);
          }
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };

    fetchLogo();

    // Listen for logo changes from settings
    const handleLogoChange = (e: CustomEvent) => {
      if (e.detail.logoDataUrl) {
        setLogoUrl(e.detail.logoDataUrl);
      }
    };
    window.addEventListener('logoChanged', handleLogoChange as EventListener);
    return () => {
      window.removeEventListener('logoChanged', handleLogoChange as EventListener);
    };
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for display mode changes from parent
  useEffect(() => {
    const handleDisplayModeChange = (e: CustomEvent) => {
      setIsDisplayMode(e.detail.isDisplayMode);
    };
    window.addEventListener('queueDisplayModeChanged', handleDisplayModeChange as EventListener);
    return () => {
      window.removeEventListener('queueDisplayModeChanged', handleDisplayModeChange as EventListener);
    };
  }, []);

  const toggleDisplayMode = () => {
    const newMode = !isDisplayMode;
    setIsDisplayMode(newMode);
    // Notify parent component
    window.dispatchEvent(new CustomEvent('queueDisplayModeChanged', {
      detail: { isDisplayMode: newMode }
    }));
    // Also request fullscreen
    if (newMode) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  };

  // Listen for ESC key to exit display mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDisplayMode) {
        setIsDisplayMode(false);
        window.dispatchEvent(new CustomEvent('queueDisplayModeChanged', {
          detail: { isDisplayMode: false }
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDisplayMode]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isDisplayMode) {
        setIsDisplayMode(false);
        window.dispatchEvent(new CustomEvent('queueDisplayModeChanged', {
          detail: { isDisplayMode: false }
        }));
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isDisplayMode]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Filter only waiting and with-doctor patients
  const waitingPatients = queue
    .filter((e) => e.status === 'waiting' || e.status === 'arrived')
    .sort((a, b) => b.priority - a.priority);

  const currentPatient = queue.find((e) => e.status === 'with-doctor');

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAppointmentTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const content = (
    <>
      {/* Header */}
      <header className="p-6 border-b border-white/20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="شعار العيادة" 
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <img 
                  src="/dental-logo.svg" 
                  alt="شعار العيادة" 
                  className="w-12 h-12"
                />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">عيادة الدكتور بشار عابدين</h1>
              <p className="text-white/80 text-lg">صالة الانتظار</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Display Mode Button */}
            <button
              onClick={toggleDisplayMode}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
              title={isDisplayMode ? 'إنهاء وضع العرض' : 'وضع العرض'}
            >
              {isDisplayMode ? (
                <Minimize className="w-8 h-8" />
              ) : (
                <Maximize className="w-8 h-8" />
              )}
            </button>
            
            {/* Current Time */}
            <div className="text-left">
              <div className="text-5xl font-bold flex items-center gap-3">
                <Clock className="w-10 h-10" />
                {formatTime(currentTime)}
              </div>
              <div className="text-white/80 text-lg mt-1">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          
          {/* Current Patient - Large Card */}
          <div className="lg:col-span-1">
            <div className="h-full bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/30 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-8 h-8 text-yellow-300 animate-pulse" />
                <h2 className="text-2xl font-bold">المريض الحالي</h2>
              </div>
              
              <AnimatePresence mode="wait">
                {currentPatient ? (
                  <motion.div
                    key={currentPatient.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex-1 flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-32 h-32 bg-white/25 rounded-full flex items-center justify-center mb-6">
                      <User className="w-16 h-16" />
                    </div>
                    <h3 className="text-4xl font-bold mb-4">{currentPatient.patient.name}</h3>
                    <div className="bg-white/20 rounded-xl px-6 py-3 text-2xl">
                      الدور: {waitingPatients.length + 1}
                    </div>
                    {currentPatient.appointment && (
                      <div className="mt-4 text-xl text-white/80">
                        <Calendar className="w-6 h-6 inline ml-2" />
                        موعد الحجز: {formatAppointmentTime(currentPatient.appointment.startTime)}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mb-6">
                      <User className="w-16 h-16 opacity-50" />
                    </div>
                    <p className="text-2xl text-white/60">لا يوجد مريض حالياً</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Waiting Queue - Large List */}
          <div className="lg:col-span-2">
            <div className="h-full bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/30 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Clock className="w-8 h-8" />
                  قائمة الانتظار
                </h2>
                <span className="bg-white/20 rounded-full px-4 py-2 text-xl font-bold">
                  {waitingPatients.length} مريض
                </span>
              </div>
              
              <div className="flex-1 overflow-hidden">
                {waitingPatients.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Sparkles className="w-20 h-20 mb-4 opacity-50" />
                    <p className="text-2xl text-white/60">لا يوجد مرضى في الانتظار</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[500px] p-2">
                    <AnimatePresence>
                      {waitingPatients.map((entry, index) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`bg-white/10 rounded-xl p-5 border border-white/20 hover:bg-white/20 transition-all ${
                            entry.priority > 0 ? 'ring-2 ring-yellow-400' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 bg-white/25 rounded-full flex items-center justify-center text-2xl font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold">{entry.patient.name}</h3>
                                {entry.priority > 0 && (
                                  <span className="bg-yellow-500/30 text-yellow-200 px-2 py-0.5 rounded text-sm">
                                    {entry.priority === 1 ? 'مستعجل' : 'طوارئ'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-white/80">
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5" />
                              <span className="text-lg">
                                {entry.appointment 
                                  ? formatAppointmentTime(entry.appointment.startTime)
                                  : 'بدون حجز'
                                }
                              </span>
                            </div>
                            {entry.checkInTime && (
                              <span className="text-sm text-white/60">
                                وصل: {formatAppointmentTime(entry.checkInTime)}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-white/20 text-center">
        <p className="text-white/60 text-lg">
          يرجى الانتباه عند مناداة اسمك - شكراً لصبركم
        </p>
      </footer>
    </>
  );

  // In display mode, render as fullscreen overlay
  if (isDisplayMode) {
    return (
      <div className="fixed inset-0 z-[100] min-h-screen gold-gradient text-white flex flex-col" dir="rtl">
        {content}
      </div>
    );
  }

  // Normal mode - just the content
  return (
    <div className="min-h-screen gold-gradient text-white flex flex-col" dir="rtl">
      {content}
    </div>
  );
}
