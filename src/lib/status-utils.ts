export function getRowStatusClass(status: string): string {
  const map: Record<string, string> = {
    enviado: 'row-status-enviado',
    aguardando: 'row-status-aguardando',
    erro: 'row-status-erro',
    cancelado: 'row-status-cancelado',
    arquivado: 'row-status-arquivado',
    clonado: 'row-status-clonado',
    contato: 'row-status-contato',
  };
  return map[status] || '';
}
