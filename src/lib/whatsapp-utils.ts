export const PAISES = [
  { codigo: '55', nome: 'Brasil', bandeira: '🇧🇷' },
  { codigo: '1', nome: 'Estados Unidos', bandeira: '🇺🇸' },
  { codigo: '44', nome: 'Reino Unido', bandeira: '🇬🇧' },
  { codigo: '351', nome: 'Portugal', bandeira: '🇵🇹' },
  { codigo: '34', nome: 'Espanha', bandeira: '🇪🇸' },
  { codigo: '54', nome: 'Argentina', bandeira: '🇦🇷' },
  { codigo: '595', nome: 'Paraguai', bandeira: '🇵🇾' },
  { codigo: '598', nome: 'Uruguai', bandeira: '🇺🇾' },
  { codigo: '57', nome: 'Colômbia', bandeira: '🇨🇴' },
  { codigo: '52', nome: 'México', bandeira: '🇲🇽' },
  { codigo: '39', nome: 'Itália', bandeira: '🇮🇹' },
  { codigo: '33', nome: 'França', bandeira: '🇫🇷' },
  { codigo: '49', nome: 'Alemanha', bandeira: '🇩🇪' },
];

// Sort by longest code first for correct matching
export const PAISES_BY_LENGTH = [...PAISES].sort((a, b) => b.codigo.length - a.codigo.length);

export function detectarDDI(numero: string): { codigo: string; resto: string } {
  for (const p of PAISES_BY_LENGTH) {
    if (numero.startsWith(p.codigo)) {
      return { codigo: p.codigo, resto: numero.slice(p.codigo.length) };
    }
  }
  return { codigo: '55', resto: numero };
}

export function formatWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    // Número fixo (8 dígitos locais) ou digitação intermediária
    // Sempre mantém os últimos 4 dígitos após o traço
    const local = digits.slice(2);
    return `(${digits.slice(0, 2)}) ${local.slice(0, local.length - 4)}-${local.slice(-4)}`;
  }
  // Número celular (9 dígitos locais)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatarExibicao(whatsapp: string): string {
  if (whatsapp.includes('@g.us')) return whatsapp;
  const { codigo, resto } = detectarDDI(whatsapp);
  if (codigo === '55') return `+${codigo} ${formatWhatsapp(resto)}`;
  return `+${codigo} ${resto}`;
}
