import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
  disabled?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  options = [],
  rows = 3,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-medium">
        {label}
        {required && <span className="text-destructive ml-1 text-lg">*</span>}
      </Label>
      
      {type === 'textarea' ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          disabled={disabled}
          className="min-h-[100px] text-base"
        />
      ) : type === 'select' ? (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id} className="h-12 text-base">
            <SelectValue placeholder={placeholder || 'Selecione...'} />
          </SelectTrigger>
          <SelectContent className="max-h-[60vh]">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-base py-3">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : type === 'date' ? (
        <Input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="h-12 text-base w-full"
        />
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="h-12 text-base"
        />
      )}
    </div>
  );
};
