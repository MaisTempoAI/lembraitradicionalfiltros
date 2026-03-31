import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ReminderForm from '@/components/ReminderForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LembreteRow } from '@/hooks/useLembretes';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewReminder() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const { user } = useAuth();
  const [lembrete, setLembrete] = useState<LembreteRow | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id || !user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('lembrai_lembretes')
        .select('*, categoria:lembrai_categorias(id, nome, cor, icone)')
        .eq('id', id)
        .eq('usuario_id', user.id)
        .maybeSingle();
      if (!error && data) setLembrete(data as LembreteRow);
      setLoading(false);
    })();
  }, [id, user]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          {id ? 'Editar Lembrete' : 'Novo Lembrete'}
        </h1>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <ReminderForm lembreteId={id || undefined} initialData={lembrete || undefined} />
        )}
      </div>
    </Layout>
  );
}
