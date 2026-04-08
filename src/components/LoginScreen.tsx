'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // محاكاة تأخير بسيط
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!login(password)) {
      setError('كلمة المرور غير صحيحة');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen gold-gradient flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-[110px] h-[110px] mx-auto mb-4 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8960C] p-[3px] shadow-lg">
              <img src="/login-logo-gold.png" alt="شعار العيادة" className="w-full h-full rounded-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">نظام إدارة العيادة</h1>
            <p className="text-gray-500 mt-2">أدخل كلمة المرور للدخول</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة المرور"
                  className="pr-12 h-12 text-lg"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-red-500 text-sm"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary/60 text-primary-foreground"
              disabled={isLoading || !password}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>جاري التحقق...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  <span>دخول</span>
                </div>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Dental OS - نظام إدارة العيادة
          </p>
        </div>
      </motion.div>
    </div>
  );
}
