import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "default";
  className?: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "default",
  className,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg bg-muted p-0.5",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      role="radiogroup"
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={option.disabled || disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Touch target sizing
              size === "sm" ? "min-h-[36px] px-3 text-xs" : "min-h-[44px] px-4 text-sm",
              // Selected state
              isSelected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              // Disabled state
              (option.disabled || disabled) && "pointer-events-none opacity-50"
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
