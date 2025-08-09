import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const pillButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary/80 text-primary-foreground hover:bg-primary/90 backdrop-blur-sm",
        secondary: "bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 backdrop-blur-sm",
        destructive: "bg-destructive/80 text-destructive-foreground hover:bg-destructive/90 backdrop-blur-sm",
        outline: "border border-input bg-background/80 hover:bg-accent hover:text-accent-foreground backdrop-blur-sm",
        ghost: "bg-background/40 hover:bg-accent/80 hover:text-accent-foreground backdrop-blur-sm",
        accent: "bg-accent/80 text-accent-foreground hover:bg-accent/90 backdrop-blur-sm"
      },
      size: {
        xs: "h-6 px-2 gap-1",
        sm: "h-7 px-3 gap-1.5", 
        md: "h-8 px-4 gap-2",
        lg: "h-9 px-5 gap-2"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "sm"
    }
  }
);

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pillButtonVariants> {
  asChild?: boolean;
}

const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(pillButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
PillButton.displayName = "PillButton";

export { PillButton, pillButtonVariants };