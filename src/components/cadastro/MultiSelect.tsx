import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface MultiSelectProps {
  id: string;
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  options?: { value: string; label: string }[];
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = 'Digite e pressione Enter',
  suggestions = [],
  options = []
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Use options if provided, otherwise use suggestions as simple strings
  const availableOptions = options.length > 0
    ? options
    : suggestions.map(s => ({ value: s, label: s }));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      // If options are provided, don't allow free text entry
      if (options.length > 0) {
        return;
      }
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleRemove = (itemValue: string) => {
    onChange(value.filter((v) => v !== itemValue));
  };

  const handleOptionClick = (optionValue: string) => {
    if (!value.includes(optionValue)) {
      onChange([...value, optionValue]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const filteredOptions = availableOptions.filter(
    (opt) =>
      opt.label.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(opt.value)
  );

  // Helper to get label for a value
  const getLabelForValue = (val: string): string => {
    const option = availableOptions.find(opt => opt.value === val);
    return option ? option.label : val;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="space-y-2">
        <div className="relative">
          <Input
            id={id}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(e.target.value.length > 0 || availableOptions.length > 0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(availableOptions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
          />
          {showSuggestions && filteredOptions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm"
                  onClick={() => handleOptionClick(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.map((itemValue) => (
              <Badge key={itemValue} variant="secondary" className="pl-3 pr-1">
                {getLabelForValue(itemValue)}
                <button
                  type="button"
                  onClick={() => handleRemove(itemValue)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
