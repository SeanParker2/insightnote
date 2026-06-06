"use client";

import { Search, X } from 'lucide-react';
import { useState, useCallback } from 'react';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SearchInput({ placeholder = '搜索...', value: controlledValue, onChange, className }: SearchInputProps) {
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue ?? internalValue;

  const handleChange = useCallback((v: string) => {
    setInternalValue(v);
    onChange?.(v);
  }, [onChange]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-8 bg-surface-2 border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
      />
      {value && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
