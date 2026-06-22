import { format } from 'date-fns';

export function generateNumeroReclamation(count: number): string {
  const dateStr = format(new Date(), 'yyyyMMdd');
  const seq = String(count + 1).padStart(3, '0');
  return `COB-SAV-${dateStr}-${seq}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return format(new Date(dateStr), 'dd/MM/yyyy HH:mm');
}

export function validateEmail(email: string): boolean {
  const re = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return re.test(email);
}
