'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

/*
 * SearchableSelect - مكون بحث واختيار قابل لإعادة الاستخدام
 *
 * طريقة الاستخدام:
 * - عند الضغط على مربع البحث، تظهر قائمة بجميع الخيارات
 * - كل ما تكتب حرف تتقلص النتائج حتى تصل للنتيجة الدقيقة
 * - القائمة لا تظهر من تلقاء نفسها، فقط عند الضغط
 * - عند الضغط في مكان آخر تختفي القائمة
 * - عند اختيار عنصر يتم إغلاق القائمة وعرض العنصر المختار
 */

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  className = '',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  // إغلاق القائمة عند الضغط خارجها - باستخدام pointerdown + mousedown للتوافق الكامل
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | PointerEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    // نستخدم عدة أنواع أحداث لضمان العمل داخل Dialog وغيرها
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [close]);

  // إغلاق عند الضغط على Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // تصفية الخيارات حسب البحث
  const filteredOptions = options.filter((option) =>
    option.label.includes(search) || option.value.includes(search)
  );

  // العنصر المختار
  const selectedOption = options.find((opt) => opt.value === value);

  // فتح القائمة عند الضغط
  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // اختيار عنصر
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    close();
  };

  // إزالة الاختيار
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange('');
    close();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* مربع العرض / البحث */}
      <div
        className={`
          flex items-center gap-2 h-10 w-full px-3 rounded-md border bg-background
          cursor-pointer transition-colors
          ${isOpen ? 'border-primary ring-1 ring-primary' : 'border-input hover:border-primary/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={handleOpen}
      >
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={selectedOption?.label || placeholder}
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            dir="rtl"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                close();
              }
              if (e.key === 'Enter' && filteredOptions.length === 1) {
                handleSelect(filteredOptions[0].value);
              }
            }}
          />
        ) : (
          <span className={`flex-1 text-sm ${selectedOption ? 'text-foreground' : 'text-muted-foreground'}`}>
            {selectedOption?.label || placeholder}
          </span>
        )}
        {selectedOption && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div className="absolute z-[999] w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              لا توجد نتائج مطابقة
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`
                  w-full flex items-center gap-2 px-3 py-2.5 text-right text-sm
                  hover:bg-muted transition-colors
                  ${value === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'}
                `}
                onMouseDown={(e) => {
                  e.preventDefault(); // منع blur قبل النقر
                }}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
                {value === option.value && (
                  <span className="mr-auto text-primary">✓</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
