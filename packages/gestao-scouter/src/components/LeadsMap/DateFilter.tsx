/**
 * Date Filter Component
 * Allows filtering leads by date range without auto-filtering
 */
import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export function DateFilter({ 
  startDate, 
  endDate, 
  onDateChange, 
  onApply,
  onClear 
}: DateFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="relative">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-center w-[30px] h-[30px] hover:bg-accent transition-colors">
            <Calendar size={16} className="text-muted-foreground" />
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent asChild>
          <div className="absolute right-full top-0 mr-1 bg-white/95 shadow-lg border backdrop-blur-sm rounded px-2 py-1 whitespace-nowrap flex items-center gap-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-2 data-[state=open]:slide-in-from-right-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange(e.target.value, endDate)}
            className="text-xs border rounded px-2 py-1 outline-none"
            style={{ width: 120 }}
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange(startDate, e.target.value)}
            className="text-xs border rounded px-2 py-1 outline-none"
            style={{ width: 120 }}
          />
          <Button
            size="sm"
            onClick={onApply}
            className="h-7 px-3 text-xs"
          >
            Aplicar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClear}
            className="h-7 px-3 text-xs"
          >
            Limpar
          </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
