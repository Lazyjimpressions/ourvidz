import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string | number | boolean;
  type: 'text' | 'textarea' | 'number' | 'select';
  options?: { value: string; label: string }[];
  onSave: (value: any) => void;
  onCancel?: () => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  truncateAt?: number;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export function EditableCell({
  value,
  type,
  options = [],
  onSave,
  onCancel,
  className,
  placeholder,
  maxLength,
  truncateAt = 50,
  isEditing,
  onEditingChange
}: EditableCellProps) {
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(value?.toString() || '');
      setTimeout(() => {
        if (type === 'textarea') {
          textareaRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 0);
    }
  }, [isEditing, value, type]);

  const handleSave = () => {
    let finalValue: any = editValue;
    if (type === 'number') {
      finalValue = parseInt(editValue) || 0;
    } else if (typeof value === 'boolean') {
      finalValue = editValue === 'true';
    }
    onSave(finalValue);
    onEditingChange(false);
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || '');
    onEditingChange(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const displayValue = value?.toString() || '';
  const truncatedValue = displayValue.length > truncateAt 
    ? `${displayValue.substring(0, truncateAt)}...` 
    : displayValue;

  if (isEditing) {
    if (type === 'select') {
      return (
        <Select value={editValue} onValueChange={(val) => { setEditValue(val); }}>
          <SelectTrigger className="h-6 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'textarea') {
      return (
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="min-h-[60px] text-xs"
          placeholder={placeholder}
          maxLength={maxLength}
        />
      );
    }

    return (
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="h-6 text-xs"
        placeholder={placeholder}
        maxLength={maxLength}
      />
    );
  }

  return (
    <div
      className={cn(
        "cursor-pointer hover:bg-muted/50 px-2 py-1 rounded text-xs min-h-[24px] flex items-center",
        className
      )}
      onClick={() => onEditingChange(true)}
      title={displayValue.length > truncateAt ? displayValue : undefined}
    >
      {truncatedValue || <span className="text-muted-foreground italic">Click to edit</span>}
    </div>
  );
}