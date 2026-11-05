import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold leading-none select-none',
  {
    variants: {
      variant: {
        default:  'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]',
        green:    'bg-[var(--green-soft)] text-[var(--green)]',
        amber:    'bg-[var(--amber-soft)] text-[var(--amber)]',
        red:      'bg-[var(--red-soft)] text-[var(--red)]',
        blue:     'bg-[var(--accent-soft)] text-[var(--accent)]',
        outline:  'border border-[var(--border)] text-[var(--text-muted)] bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
