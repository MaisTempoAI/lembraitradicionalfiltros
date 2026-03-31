import { ReminderStatus, STATUS_CONFIG } from '@/types/reminder';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

interface StatusBadgeProps {
  status: ReminderStatus;
  className?: string;
  onStatusChange?: (newStatus: ReminderStatus) => void;
}

const STATUS_TRANSITIONS: Partial<Record<ReminderStatus, { status: ReminderStatus; label: string }[]>> = {
  clonado: [
    { status: 'aguardando', label: '⏳ Aguardando' },
    { status: 'cancelado', label: '🚫 Cancelado' },
  ],
  aguardando: [
    { status: 'cancelado', label: '🚫 Cancelado' },
  ],
  erro: [
    { status: 'aguardando', label: '⏳ Aguardando' },
    { status: 'cancelado', label: '🚫 Cancelado' },
  ],
};

export default function StatusBadge({ status, className = '', onStatusChange }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const config = STATUS_CONFIG[status];
  const transitions = onStatusChange ? STATUS_TRANSITIONS[status] : undefined;

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.className} ${transitions ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );

  if (!transitions || transitions.length === 0) return badge;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium px-2 pb-1">Alterar status:</p>
          {transitions.map((t) => (
            <button
              key={t.status}
              onClick={() => {
                onStatusChange(t.status);
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
