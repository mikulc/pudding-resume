import type { InputHTMLAttributes } from 'react';
import { adminInputClass, cn } from './tokens';

export function AdminInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('admin-input', adminInputClass, className)} {...props} />;
}
