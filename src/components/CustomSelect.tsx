import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  className = '',
  disabled = false,
  theme = 'light',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const isDark = theme === 'dark';

  return (
    <div ref={containerRef} className={`relative min-w-[120px] ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-3 border rounded-xl text-sm transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500 outline-none text-left ${
          isDark
            ? 'bg-slate-950 text-white border-slate-800 hover:border-slate-700'
            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
        } ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'
        }`}
      >
        <span className={selectedOption ? (isDark ? 'text-white font-medium' : 'text-slate-700 font-medium') : (isDark ? 'text-slate-500' : 'text-slate-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[9999] left-0 right-0 mt-1 max-h-60 overflow-y-auto border rounded-xl shadow-lg ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 italic text-center">Nenhum item disponível</div>
            ) : (
              <div className="py-1">
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-colors ${
                        isSelected
                          ? (isDark ? 'bg-indigo-950/40 text-indigo-400 font-semibold' : 'bg-indigo-50 text-indigo-700 font-semibold')
                          : (isDark ? 'text-slate-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
