import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default:     'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm',
        secondary:   'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)]',
        ghost:       'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
        destructive: 'bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red)] border-opacity-30 hover:bg-[var(--red)] hover:text-white',
        outline:     'border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]',
        link:        'text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-7 px-3 text-xs rounded-[var(--radius-sm)]',
        md: 'h-8 px-3.5 text-sm rounded-[var(--radius-md)]',
        lg: 'h-10 px-4 text-sm rounded-[var(--radius-lg)]',
        icon: 'h-8 w-8 rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
