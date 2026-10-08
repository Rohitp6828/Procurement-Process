import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomDropdownProps {
  options: string[] | { label: string; value: string | number }[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (opt: any) => (typeof opt === 'object' ? opt.label : opt);
  const getValue = (opt: any) => (typeof opt === 'object' ? opt.value : opt);

  const selectedOption = options.find(opt => getValue(opt) === value);
  const displayLabel = selectedOption ? getLabel(selectedOption) : placeholder;

  return (
    <div className={`relative inline-block text-left select-none ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between space-x-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-2xs"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-full min-w-[200px] bg-white border border-slate-200/80 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const optVal = getValue(opt);
            const optLabel = getLabel(opt);
            const isSelected = optVal === value;

            return (
              <button
                key={String(optVal)}
                type="button"
                onClick={() => {
                  onChange(optVal);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-left hover:bg-slate-50 transition-colors ${
                  isSelected ? 'text-[#af2024] font-bold bg-red-50/50' : 'text-slate-700'
                }`}
              >
                <span className="truncate">{optLabel}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#af2024] shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};