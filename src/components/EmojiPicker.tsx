import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

const EMOJIS = [
  '📋', '📌', '📎', '📞', '🔔', '⏰', '📅', '✅',
  '🔧', '🏠', '💼', '🚗', '✈️', '💊', '🎂', '🎓',
  '☀️', '🌙', '❤️', '⭐', '🔴', '🟢', '🔵', '🟡',
  '💰', '🛒', '📦', '🏥', '👤', '📧', '🎯', '🏆',
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export default function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-12 w-12 border-2 text-xl shrink-0">
          {value || '📋'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-lg transition-colors"
              onClick={() => { onChange(emoji); setOpen(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
