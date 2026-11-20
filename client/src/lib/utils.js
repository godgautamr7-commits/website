import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/* shadcn-style class merger used by the components in src/components/ui */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
