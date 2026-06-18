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

  // Two known layouts:
  //   Layout A (antigo - OUT.25): CODIGO  DESCRIÇÃO  qty  v1  v2  v3  v4
  //   Layout B (novo  - Jan.26):  DESCRIÇÃO  qty  v1  v2  v3  CODIGO  v4
  const descClass = "[A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇÜa-záéíóúâêôãõçü\\s\\.\\-\\+\\/\"'\\(\\)]";
  const itemPrefix = "(?:REFIL|VELA|ELEMENTO|CB\\d|REFILHF)";
  const num = "\\d+[\\.,]\\d+";

  // Layout A: código antes da descrição
  const reCodigoAntes = new RegExp(
    `\\b\\d{1,4}\\s+(${itemPrefix}${descClass}{1,80}?)(?:\\s+${num}){4,}`,
    'g'
  );
  // Layout B: código aparece entre os números (após qty + 3 valores)
  const reCodigoDepois = new RegExp(
    `\\b(${itemPrefix}${descClass}{1,80}?)\\s+${num}\\s+${num}\\s+${num}\\s+${num}\\s+\\d{1,4}\\s+${num}`,
    'g'
  );

  const normalizeDesc = (s: string) =>
    s.replace(/\s+/g, ' ').replace(/\s+\d+[\.,]\d+\s*$/, '').trim();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const startPos = entry.position;
    const endPos = i < entries.length - 1 ? entries[i + 1].position : fullText.length;
    const block = fullText.substring(startPos, endPos);

    const seen = new Set<string>();
    const itens: string[] = [];

    const collect = (re: RegExp) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(block)) !== null) {
        const desc = normalizeDesc(m[1]);
        if (desc.length > 3) {
          const key = desc.toUpperCase();
          if (!seen.has(key)) {
            seen.add(key);
            itens.push(desc);
          }
        }
      }
    };

    collect(reCodigoAntes);
    collect(reCodigoDepois);

    clientes.push({
      nome: entry.nome,
      telefone: entry.telefone,
      itens: itens.length > 0 ? itens : ['refil'],
      selecionado: entry.telefone.length > 0,
    });
  }

  return clientes;
}
