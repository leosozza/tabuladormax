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
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = 'Digite e pressione Enter',
  suggestions = []
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleRemove = (item: string) => {
    onChange(value.filter((v) => v !== item));
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!value.includes(suggestion)) {
      onChange([...value, suggestion]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s)
  );

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
              setShowSuggestions(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.map((item) => (
              <Badge key={item} variant="secondary" className="pl-3 pr-1">
                {item}
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
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
