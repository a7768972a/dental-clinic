'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MousePointer,
  RotateCcw,
  Save,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';

interface ToothRecord {
  toothNumber: number;
  condition: string;
  notes?: string;
}

interface Props {
  patientId: string;
}

const toothConditions = [
  { value: 'healthy', label: 'سليم', color: '#ffffff', stroke: '#cccccc', darkColor: '#d1d5db', darkStroke: '#9ca3af' },
  { value: 'decay', label: 'تسوس', color: '#ef4444', stroke: '#dc2626', darkColor: '#dc2626', darkStroke: '#b91c1c' },
  { value: 'filling', label: 'حشو', color: '#3b82f6', stroke: '#2563eb', darkColor: '#60a5fa', darkStroke: '#3b82f6' },
  { value: 'implant', label: 'زراعة', color: '#D4AF37', stroke: '#B8960C', darkColor: '#9ca3af', darkStroke: '#6b7280' },
  { value: 'extracted', label: 'مخلوع', color: '#6b7280', stroke: '#4b5563', darkColor: '#4b5563', darkStroke: '#374151' },
  { value: 'crown', label: 'تاج', color: '#a855f7', stroke: '#9333ea', darkColor: '#c084fc', darkStroke: '#a855f7' },
  { value: 'root-canal', label: 'علاج عصب', color: '#f97316', stroke: '#ea580c', darkColor: '#fb923c', darkStroke: '#f97316' },
];

// FDI notation for teeth (Upper Right: 11-18, Upper Left: 21-28, Lower Left: 31-38, Lower Right: 41-48)
const upperRightTeeth = [18, 17, 16, 15, 14, 13, 12, 11];
const upperLeftTeeth = [21, 22, 23, 24, 25, 26, 27, 28];
const lowerLeftTeeth = [31, 32, 33, 34, 35, 36, 37, 38];
const lowerRightTeeth = [41, 42, 43, 44, 45, 46, 47, 48];

export default function DentalChart({ patientId }: Props) {
  const [toothRecords, setToothRecords] = useState<Map<number, ToothRecord>>(new Map());
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState('healthy');
  const [selectedNotes, setSelectedNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const fetchToothRecords = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/teeth`);
        const data = await res.json();
        if (mounted) {
          const recordsMap = new Map<number, ToothRecord>();
          (data.teeth || []).forEach((record: any) => {
            recordsMap.set(record.toothNumber, {
              toothNumber: record.toothNumber,
              condition: record.condition,
              notes: record.notes,
            });
          });
          setToothRecords(recordsMap);
        }
      } catch (error) {
        console.error('Error fetching tooth records:', error);
      }
    };
    
    fetchToothRecords();
    
    return () => {
      mounted = false;
    };
  }, [patientId]);

  // Function to refresh tooth records
  const refreshToothRecords = async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/teeth`);
      const data = await res.json();
      const recordsMap = new Map<number, ToothRecord>();
      (data.teeth || []).forEach((record: any) => {
        recordsMap.set(record.toothNumber, {
          toothNumber: record.toothNumber,
          condition: record.condition,
          notes: record.notes,
        });
      });
      setToothRecords(recordsMap);
    } catch (error) {
      console.error('Error fetching tooth records:', error);
    }
  };

  const getToothCondition = (toothNumber: number) => {
    return toothRecords.get(toothNumber)?.condition || 'healthy';
  };

  const getToothColor = (toothNumber: number) => {
    const condition = getToothCondition(toothNumber);
    const found = toothConditions.find((c) => c.value === condition);
    return found || toothConditions[0];
  };

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const getFillColor = (condition: typeof toothConditions[0]) => {
    return isDark && condition.darkColor ? condition.darkColor : condition.color;
  };

  const getStrokeColor = (condition: typeof toothConditions[0]) => {
    return isDark && condition.darkStroke ? condition.darkStroke : condition.stroke;
  };

  const handleToothClick = (toothNumber: number) => {
    const record = toothRecords.get(toothNumber);
    setSelectedTooth(toothNumber);
    setSelectedCondition(record?.condition || 'healthy');
    setSelectedNotes(record?.notes || '');
    setIsDialogOpen(true);
  };

  const handleSaveTooth = async () => {
    if (selectedTooth === null) return;

    try {
      await fetch(`/api/patients/${patientId}/teeth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toothNumber: selectedTooth,
          condition: selectedCondition,
          notes: selectedNotes,
        }),
      });

      setToothRecords((prev) => {
        const newMap = new Map(prev);
        newMap.set(selectedTooth, {
          toothNumber: selectedTooth,
          condition: selectedCondition,
          notes: selectedNotes,
        });
        return newMap;
      });

      setHasChanges(true);
      setIsDialogOpen(false);
      toast.success('تم حفظ حالة السن');
    } catch (error) {
      toast.error('خطأ في حفظ البيانات');
    }
  };

  const handleReset = () => {
    refreshToothRecords();
    setHasChanges(false);
    toast.success('تم إعادة تحميل البيانات');
  };

  // Tooth SVG Component
  const ToothSVG = ({ toothNumber, x, y }: { toothNumber: number; x: number; y: number }) => {
    const condition = getToothColor(toothNumber);
    const isMolar = [16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48].includes(toothNumber);
    const isPremolar = [14, 15, 24, 25, 34, 35, 44, 45].includes(toothNumber);
    const isCanine = [13, 23, 33, 43].includes(toothNumber);
    
    return (
      <g
        transform={`translate(${x}, ${y})`}
        onClick={() => handleToothClick(toothNumber)}
        className="cursor-pointer"
        style={{ cursor: 'pointer' }}
      >
        <motion.rect
          width={36}
          height={isMolar ? 40 : isPremolar ? 36 : isCanine ? 44 : 32}
          rx={isMolar ? 6 : 4}
          fill={getFillColor(condition)}
          stroke={getStrokeColor(condition)}
          strokeWidth={2}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="tooth"
        />
        {/* Tooth divisions for molars */}
        {isMolar && (
          <>
            <line x1={0} y1={15} x2={36} y2={15} stroke={getStrokeColor(condition)} strokeWidth={1} />
            <line x1={18} y1={0} x2={18} y2={40} stroke={getStrokeColor(condition)} strokeWidth={1} />
          </>
        )}
        {isPremolar && (
          <line x1={18} y1={0} x2={18} y2={36} stroke={getStrokeColor(condition)} strokeWidth={1} />
        )}
        {/* Tooth number */}
        <text
          x={18}
          y={isMolar ? 50 : isPremolar ? 46 : isCanine ? 54 : 42}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fill={isDark ? '#aaa' : '#666'}
        >
          {toothNumber}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {toothConditions.map((condition) => (
          <div key={condition.value} className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded border-2"
              style={{ backgroundColor: getFillColor(condition), borderColor: getStrokeColor(condition) }}
            />
            <span className="text-sm">{condition.label}</span>
          </div>
        ))}
      </div>

      {/* Dental Chart SVG */}
      <div className="bg-muted/30 rounded-xl p-4 overflow-x-auto">
        <svg viewBox="0 0 400 300" className="w-full max-w-2xl mx-auto" dir="ltr">
          {/* Center line */}
          <line x1={200} y1={0} x2={200} y2={300} stroke={isDark ? '#444' : '#e5e7eb'} strokeWidth={2} strokeDasharray="5,5" />
          <line x1={0} y1={140} x2={400} y2={140} stroke={isDark ? '#444' : '#e5e7eb'} strokeWidth={2} strokeDasharray="5,5" />

          {/* Labels */}
          <text x={100} y={20} textAnchor="middle" fontSize={12} fill={isDark ? '#aaa' : '#666'} fontWeight="bold">
            الفكي العلوي - اليمين
          </text>
          <text x={300} y={20} textAnchor="middle" fontSize={12} fill={isDark ? '#aaa' : '#666'} fontWeight="bold">
            الفكي العلوي - اليسار
          </text>
          <text x={100} y={290} textAnchor="middle" fontSize={12} fill={isDark ? '#aaa' : '#666'} fontWeight="bold">
            الفكي السفلي - اليمين
          </text>
          <text x={300} y={290} textAnchor="middle" fontSize={12} fill={isDark ? '#aaa' : '#666'} fontWeight="bold">
            الفكي السفلي - اليسار
          </text>

          {/* Upper Right Teeth (18-11) */}
          {upperRightTeeth.map((num, i) => (
            <ToothSVG key={num} toothNumber={num} x={20 + i * 42} y={40} />
          ))}

          {/* Upper Left Teeth (21-28) */}
          {upperLeftTeeth.map((num, i) => (
            <ToothSVG key={num} toothNumber={num} x={200 + i * 42} y={40} />
          ))}

          {/* Lower Left Teeth (31-38) */}
          {lowerLeftTeeth.map((num, i) => (
            <ToothSVG key={num} toothNumber={num} x={200 + i * 42} y={190} />
          ))}

          {/* Lower Right Teeth (41-48) */}
          {lowerRightTeeth.map((num, i) => (
            <ToothSVG key={num} toothNumber={num} x={20 + i * 42} y={190} />
          ))}
        </svg>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>انقر على أي سن لتغيير حالته</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 ml-1" />
            إعادة تحميل
          </Button>
        </div>
      </div>

      {/* Tooth Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              السن رقم {selectedTooth}
              <Badge variant="outline" className="text-xs">
                FDI
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>حالة السن</Label>
              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toothConditions.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{
                            backgroundColor: getFillColor(condition),
                            borderColor: getStrokeColor(condition),
                          }}
                        />
                        {condition.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={selectedNotes}
                onChange={(e) => setSelectedNotes(e.target.value)}
                placeholder="أي ملاحظات على هذا السن..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleSaveTooth}>
              <Save className="w-4 h-4 ml-1" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
