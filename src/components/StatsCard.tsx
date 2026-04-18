import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  description?: string;
  className?: string;
  href?: string;
  color?: string;
}

export default function StatsCard({ title, value, icon, description, className = '', href, color }: StatsCardProps) {
  const navigate = useNavigate();

  const colorStyle = color
    ? { borderLeft: `3px solid ${color}`, background: `${color}08` }
    : {};

  return (
    <div
      className={`rounded-lg bg-card border p-4 shadow-sm hover:shadow-md transition-all ${href ? 'cursor-pointer' : ''} ${className}`}
      style={colorStyle}
      onClick={() => href && navigate(href)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center"
          style={color ? { backgroundColor: `${color}18`, color } : {}}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}