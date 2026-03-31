import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface ClientePdf {
  nome: string;
  telefone: string;
  itens: string[];
  selecionado: boolean;
}

function normalizarTelefone(raw: string): string {
  // Remove dots, dashes, commas, spaces
  let digits = raw.replace(/[\.\-\,\s\(\)]/g, '');
  // If it starts with 55 and has 12-13 digits, it's already with DDI
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  // Add DDI 55 if not present and has 10-11 digits
  // If 8-9 digits (no DDD), add default DDD 19
  if (digits.length >= 8 && digits.length <= 9) {
    digits = '19' + digits;
  }
  if (digits.length >= 10 && digits.length <= 11) {
    digits = '55' + digits;
  }
  return digits;
}

export async function parsePdfVendas(file: File): Promise<ClientePdf[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  // Split by "Contato:" pattern to find client blocks
  // Pattern: CLIENT_NAME Contato: PHONE_OR_EMPTY
  const clientes: ClientePdf[] = [];
  
  // Use regex to find all "NAME Contato: PHONE" patterns
  // The text from pdfjs comes as space-separated tokens
  const contatoRegex = /([A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÜa-záéíóúâêôãõçü0-9\s\.\-\(\)\/]+?)\s+Contato:\s*([\d\.\-\,]*)/g;
  
  let match;
  const entries: { nome: string; telefone: string; position: number }[] = [];
  
  while ((match = contatoRegex.exec(fullText)) !== null) {
    const rawName = match[1].trim();
    const rawPhone = match[2].trim();
    
    // Clean name - remove leading numbers/codes that might be product codes
    let nome = rawName;
    // If name ends with numbers that look like totals, trim
    nome = nome.replace(/\s+\d+[\.,]\d+\s*$/, '').trim();
    
    entries.push({
      nome,
      telefone: rawPhone ? normalizarTelefone(rawPhone) : '',
      position: match.index,
    });
  }

  // Now extract items for each client
  // Items appear BEFORE the client name in the text
  // Pattern: CODE DESCRIPTION QTY COST PRICE PROFIT MARGIN
  const itemRegex = /(\d{1,4})\s+((?:REFIL|VELA|ELEMENTO|CB\d|REFILHF)[^\d]*?)(?:\s+\d+[\.,]\d+){4,}/g;
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    // Look for items between previous entry end and current entry position
    const startPos = i > 0 ? entries[i - 1].position + entries[i - 1].nome.length + 20 : 0;
    const endPos = entry.position;
    const block = fullText.substring(startPos, endPos);
    
    const itens: string[] = [];
    let itemMatch;
    const localItemRegex = /(\d{1,4})\s+((?:REFIL|VELA|ELEMENTO|CB\d|REFILHF)[A-ZÁÉÍÓÚÂÊÔÃÕÇÜa-záéíóúâêôãõçü0-9\s\.\-\+\/\"\'\(\)]*?)(?:\s+\d+[\.,]\d+)/g;
    
    while ((itemMatch = localItemRegex.exec(block)) !== null) {
      const desc = itemMatch[2].trim();
      if (desc.length > 3) {
        itens.push(desc);
      }
    }
    
    clientes.push({
      nome: entry.nome,
      telefone: entry.telefone,
      itens: itens.length > 0 ? itens : ['refil'],
      selecionado: entry.telefone.length > 0, // auto-select only those with phone
    });
  }

  return clientes;
}
