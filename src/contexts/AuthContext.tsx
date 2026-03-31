import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LembraiUser {
  id: string;
  whatsapp: string;
  nome: string;
  avatar_url: string | null;
  quepasakey: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: LembraiUser | null;
  loading: boolean;
  login: (whatsapp: string, password: string) => Promise<{ error: string | null }>;
  signup: (whatsapp: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  login: async () => ({ error: null }),
  signup: async () => ({ error: null }),
  logout: () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const STORAGE_KEY = 'lembrai_usuario';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LembraiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as LembraiUser;
          setUser(parsed);
          // Refresh from DB to get latest data (e.g. quepasakey)
          const { data } = await supabase
            .from('lembrai_usuarios')
            .select('quepasakey, nome, avatar_url, whatsapp')
            .eq('id', parsed.id)
            .single();
          if (data) {
            const updated = { ...parsed, quepasakey: data.quepasakey, nome: data.nome, avatar_url: data.avatar_url, whatsapp: data.whatsapp };
            setUser(updated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (whatsapp: string, password: string) => {
    const { data, error } = await supabase.rpc('lembrai_login', {
      p_whatsapp: whatsapp,
      p_senha: password,
    } as any);
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: 'WhatsApp ou senha inválidos' };

    // Fetch full user data including quepasakey
    const { data: fullUser } = await supabase
      .from('lembrai_usuarios')
      .select('quepasakey')
      .eq('id', (data as any[])[0].id)
      .single();

    const userData: LembraiUser = {
      id: (data as any[])[0].id,
      whatsapp: (data as any[])[0].whatsapp,
      nome: (data as any[])[0].nome,
      avatar_url: (data as any[])[0].avatar_url,
      quepasakey: fullUser?.quepasakey || null,
    };
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    return { error: null };
  };

  const signup = async (whatsapp: string, password: string, displayName: string) => {
    const { data, error } = await supabase.rpc('lembrai_registrar_usuario', {
      p_whatsapp: whatsapp,
      p_senha: password,
      p_nome: displayName,
    } as any);
    if (error) return { error: error.message };
    return { error: null };
  };

  const refreshUser = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('lembrai_usuarios')
      .select('quepasakey, nome, avatar_url')
      .eq('id', user.id)
      .single();
    if (data) {
      const updated = { ...user, quepasakey: data.quepasakey, nome: data.nome, avatar_url: data.avatar_url };
      setUser(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      user,
      loading,
      login,
      signup,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
