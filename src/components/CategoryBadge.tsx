import { DEFAULT_CATEGORIAS } from '@/types/reminder';

interface CategoryBadgeProps {
  categoria: string;
}

export default function CategoryBadge({ categoria }: CategoryBadgeProps) {
  const cat = DEFAULT_CATEGORIAS.find((c) => c.nome === categoria);
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium">
      <span>{cat?.icone || '📌'}</span>
      {categoria}
    </span>
  );
}