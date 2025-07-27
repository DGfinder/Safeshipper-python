'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { focusManagement, screenReader, useA11y, a11yUtils } from '@/shared/utils/accessibility';
import {
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';

// Accessible Skip Link Component
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={(e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          (target as HTMLElement).focus();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }}
    >
      {children}
    </a>
  );
}

// Accessible Modal Component
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AccessibleModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className,
  size = 'md' 
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = a11yUtils.generateId('modal-title');
  const descriptionId = a11yUtils.generateId('modal-description');

  useA11y.useFocusManagement(isOpen, modalRef);
  useA11y.useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      screenReader.announce('Modal opened', 'polite');
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={cn(
          'relative bg-white rounded-lg shadow-xl p-6 m-4 w-full',
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div id={descriptionId}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Accessible Accordion Component
interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface AccessibleAccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  className?: string;
}

export function AccessibleAccordion({ 
  items, 
  allowMultiple = false, 
  className 
}: AccessibleAccordionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        screenReader.announce('Section collapsed', 'polite');
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
        screenReader.announce('Section expanded', 'polite');
      }
      return newSet;
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const isExpanded = expandedItems.has(item.id);
        const buttonId = a11yUtils.generateId('accordion-button');
        const panelId = a11yUtils.generateId('accordion-panel');

        return (
          <div key={item.id} className="border rounded-lg">
            <button
              id={buttonId}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              disabled={item.disabled}
              onClick={() => toggleItem(item.id)}
              className={cn(
                'w-full flex items-center justify-between p-4 text-left',
                'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <span className="font-medium">{item.title}</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            
            {isExpanded && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="p-4 border-t"
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Accessible Combobox Component
interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AccessibleComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
  error?: string;
}

export function AccessibleCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  className,
  error
}: AccessibleComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  
  const comboboxId = a11yUtils.generateId('combobox');
  const listboxId = a11yUtils.generateId('listbox');
  const errorId = a11yUtils.generateId('error');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  useA11y.useEscapeKey(() => setIsOpen(false), isOpen);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setActiveIndex(prev => prev > 0 ? prev - 1 : prev);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && activeIndex >= 0) {
          const selectedOption = filteredOptions[activeIndex];
          onChange(selectedOption.value);
          setInputValue(selectedOption.label);
          setIsOpen(false);
          setActiveIndex(-1);
          screenReader.announce(`${selectedOption.label} selected`, 'polite');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const handleOptionClick = (option: ComboboxOption) => {
    onChange(option.value);
    setInputValue(option.label);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
    screenReader.announce(`${option.label} selected`, 'polite');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <label 
        htmlFor={comboboxId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id={comboboxId}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'pr-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500'
          )}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1"
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option.value}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleOptionClick(option)}
              className={cn(
                'px-3 py-2 cursor-pointer',
                index === activeIndex && 'bg-blue-50 text-blue-900',
                'hover:bg-gray-50',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 mt-1">
          <AlertCircle className="h-4 w-4 inline mr-1" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

// Accessible Alert Component
interface AccessibleAlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function AccessibleAlert({
  type,
  title,
  children,
  dismissible = false,
  onDismiss,
  className
}: AccessibleAlertProps) {
  const alertId = a11yUtils.generateId('alert');
  const titleId = title ? a11yUtils.generateId('alert-title') : undefined;

  const typeConfig = {
    info: {
      icon: Info,
      className: 'bg-blue-50 border-blue-200 text-blue-800',
      iconClassName: 'text-blue-600',
    },
    success: {
      icon: CheckCircle,
      className: 'bg-green-50 border-green-200 text-green-800',
      iconClassName: 'text-green-600',
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      iconClassName: 'text-yellow-600',
    },
    error: {
      icon: AlertCircle,
      className: 'bg-red-50 border-red-200 text-red-800',
      iconClassName: 'text-red-600',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      id={alertId}
      role="alert"
      aria-live="polite"
      aria-labelledby={titleId}
      className={cn(
        'border rounded-lg p-4',
        config.className,
        className
      )}
    >
      <div className="flex items-start">
        <Icon className={cn('h-5 w-5 mt-0.5 mr-3', config.iconClassName)} aria-hidden="true" />
        
        <div className="flex-1">
          {title && (
            <h3 id={titleId} className="font-medium mb-1">
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>

        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-8 w-8 p-0 ml-2"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Accessible Password Input Component
interface AccessiblePasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  required?: boolean;
  placeholder?: string;
}

export function AccessiblePasswordInput({
  label,
  value,
  onChange,
  error,
  className,
  required = false,
  placeholder
}: AccessiblePasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = a11yUtils.generateId('password-input');
  const errorId = a11yUtils.generateId('password-error');
  const strengthId = a11yUtils.generateId('password-strength');

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
  };

  const strength = getPasswordStrength(value);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      <div className="relative">
        <Input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          aria-describedby={cn(
            error && errorId,
            value && strengthId
          )}
          className={cn(
            'pr-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500'
          )}
        />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 px-3 py-2"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {value && (
        <div id={strengthId} className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Password strength:</span>
            <span className="text-xs font-medium">{strengthLabels[strength - 1] || 'Very Weak'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                strengthColors[strength - 1] || 'bg-red-500'
              )}
              style={{ width: `${(strength / 5) * 100}%` }}
              role="progressbar"
              aria-valuenow={strength}
              aria-valuemin={0}
              aria-valuemax={5}
              aria-label={`Password strength: ${strengthLabels[strength - 1] || 'Very Weak'}`}
            />
          </div>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 mt-1">
          <AlertCircle className="h-4 w-4 inline mr-1" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

// Accessible Search Component
interface AccessibleSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  label?: string;
  suggestions?: string[];
  className?: string;
  loading?: boolean;
}

export function AccessibleSearch({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  label = 'Search',
  suggestions = [],
  className,
  loading = false
}: AccessibleSearchProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  
  const searchId = a11yUtils.generateId('search');
  const suggestionsId = a11yUtils.generateId('suggestions');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion >= 0) {
          onChange(suggestions[activeSuggestion]);
          setShowSuggestions(false);
          setActiveSuggestion(-1);
        } else {
          onSearch?.(value);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        break;
    }
  };

  return (
    <div className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        <label htmlFor={searchId} className="sr-only">
          {label}
        </label>
        
        <div className="relative">
          <Input
            ref={inputRef}
            id={searchId}
            type="search"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowSuggestions(true);
              setActiveSuggestion(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            placeholder={placeholder}
            aria-controls={showSuggestions ? suggestionsId : undefined}
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
            role="combobox"
            className="pl-10"
          />
          
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
            ) : (
              <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
            )}
          </div>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul
            ref={suggestionsRef}
            id={suggestionsId}
            role="listbox"
            aria-label="Search suggestions"
            className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion}
                role="option"
                aria-selected={index === activeSuggestion}
                onClick={() => {
                  onChange(suggestion);
                  setShowSuggestions(false);
                  setActiveSuggestion(-1);
                  inputRef.current?.focus();
                }}
                className={cn(
                  'px-3 py-2 cursor-pointer',
                  index === activeSuggestion && 'bg-blue-50 text-blue-900',
                  'hover:bg-gray-50'
                )}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
}