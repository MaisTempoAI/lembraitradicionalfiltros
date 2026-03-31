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
      className={`rounded-xl bg-card border p-6 shadow-sm hover:shadow-md transition-all ${href ? 'cursor-pointer' : ''} ${className}`}
      style={colorStyle}
      onClick={() => href && navigate(href)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center"
          style={color ? { backgroundColor: `${color}18`, color } : {}}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}