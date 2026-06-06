export interface PDFParseResult {
  text: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    lines: string[];
  }>;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modDate?: string;
  };
  info: {
    pageCount: number;
    totalCharacters: number;
    totalWords: number;
    totalLines: number;
  };
}

export interface FinancialDocumentExtraction {
  rawText: PDFParseResult;
  financialData: {
    revenue?: string[];
    profit?: string[];
    eps?: string[];
    guidance?: string[];
    dates?: string[];
    percentages?: string[];
    currencies?: string[];
  };
  keyMetrics: Array<{
    name: string;
    value: string;
    context: string;
  }>;
}

function extractFinancialMetrics(text: string): FinancialDocumentExtraction['financialData'] {
  const revenuePatterns = [
    /revenue[:\s]*\$?[\d,.]+\s*(billion|million|thousand|B|M|K)?/gi,
    /total\s+revenue[:\s]*\$?[\d,.]+\s*(billion|million|thousand|B|M|K)?/gi,
    /net\s+revenue[:\s]*\$?[\d,.]+\s*(billion|million|thousand|B|M|K)?/gi,
    /收入[：:\s]*[\d,.]+\s*(亿|万)?/gi,
    /营收[：:\s]*[\d,.]+\s*(亿|万)?/gi,
  ];

  const profitPatterns = [
    /net\s+(income|profit|earnings)[:\s]*\$?[\d,.]+\s*(billion|million|thousand|B|M|K)?/gi,
    /gross\s+profit[:\s]*\$?[\d,.]+\s*(billion|million|thousand|B|M|K)?/gi,
    /operating\s+(income|profit)[:\s]*\$?[\d,.]+\s*(billion|million|thousand|B|M|K)?/gi,
    /净利润[：:\s]*[\d,.]+\s*(亿|万)?/gi,
    /利润[：:\s]*[\d,.]+\s*(亿|万)?/gi,
  ];

  const epsPatterns = [
    /(?:EPS|earnings\s+per\s+share)[:\s]*\$?[\d,.]+/gi,
    /每股收益[：:\s]*[\d,.]+/gi,
    /基本每股[：:\s]*[\d,.]+/gi,
  ];

  const guidancePatterns = [
    /guidance[:\s]*.*?(?=\n|$)/gi,
    /outlook[:\s]*.*?(?=\n|$)/gi,
    /forecast[:\s]*.*?(?=\n|$)/gi,
    /预期[：:\s]*.*?(?=\n|$)/gi,
    /展望[：:\s]*.*?(?=\n|$)/gi,
  ];

  const datePatterns = [
    /(?:Q[1-4]|FY|fiscal\s+year)\s+\d{4}/gi,
    /\d{4}\s*(?:年)\s*(?:第[一二三四]季度|Q[1-4])/gi,
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
  ];

  const percentPatterns = [
    /\d+(\.\d+)?%/g,
    /\d+(\.\d+)?\s*percent/gi,
  ];

  const currencyPatterns = [
    /\$[\d,.]+\s*(billion|million|thousand|B|M|K)?/g,
    /USD\s*[\d,.]+\s*(billion|million|thousand|B|M|K)?/gi,
    /[\d,.]+\s*(美元|人民币|港币)/gi,
  ];

  const extractMatches = (patterns: RegExp[]): string[] => {
    const matches: string[] = [];
    patterns.forEach(pattern => {
      const found = text.match(pattern);
      if (found) {
        matches.push(...found.map(m => m.trim()));
      }
    });
    return [...new Set(matches)].slice(0, 10);
  };

  return {
    revenue: extractMatches(revenuePatterns),
    profit: extractMatches(profitPatterns),
    eps: extractMatches(epsPatterns),
    guidance: extractMatches(guidancePatterns),
    dates: extractMatches(datePatterns),
    percentages: extractMatches(percentPatterns),
    currencies: extractMatches(currencyPatterns),
  };
}

function extractKeyMetrics(text: string): FinancialDocumentExtraction['keyMetrics'] {
  const metrics: Array<{ name: string; value: string; context: string }> = [];
  
  // Common financial metric patterns
  const metricPatterns = [
    { name: 'Revenue', pattern: /(?:revenue|net\s+sales|total\s+revenue)[:\s]*\$?[\d,.]+\s*(billion|million|B|M|K)?/gi },
    { name: 'Net Income', pattern: /(?:net\s+income|net\s+profit|net\s+earnings)[:\s]*\$?[\d,.]+\s*(billion|million|B|M|K)?/gi },
    { name: 'EPS', pattern: /(?:EPS|earnings\s+per\s+share)[:\s]*\$?[\d,.]+/gi },
    { name: 'Gross Margin', pattern: /(?:gross\s+margin)[:\s]*\d+(\.\d+)?%?/gi },
    { name: 'Operating Margin', pattern: /(?:operating\s+margin)[:\s]*\d+(\.\d+)?%?/gi },
    { name: 'Free Cash Flow', pattern: /(?:free\s+cash\s+flow|FCF)[:\s]*\$?[\d,.]+\s*(billion|million|B|M|K)?/gi },
  ];

  metricPatterns.forEach(({ name, pattern }) => {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const value = matches[0];
      // Get surrounding context (50 chars before and after)
      const index = text.indexOf(value);
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + value.length + 50);
      const context = text.substring(start, end).replace(/\n/g, ' ');
      
      metrics.push({ name, value, context });
    }
  });

  return metrics.slice(0, 15);
}

export async function parsePDFBuffer(buffer: Buffer): Promise<PDFParseResult> {
  // Dynamic import for pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source for Node.js environment
  if (typeof window === 'undefined') {
    // Node.js environment - use legacy build
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }

  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  
  const pages: PDFParseResult['pages'] = [];
  let totalText = '';
  let totalCharacters = 0;
  let totalWords = 0;
  let totalLines = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    const lines: string[] = [];
    let currentLine = '';
    
    textContent.items.forEach((item: any) => {
      if (item.str) {
        currentLine += item.str;
        if (item.hasEOL) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      }
    });
    
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    const pageText = lines.join('\n');
    totalText += pageText + '\n';
    totalCharacters += pageText.length;
    totalWords += pageText.split(/\s+/).filter(w => w.length > 0).length;
    totalLines += lines.length;

    pages.push({
      pageNumber: i,
      text: pageText,
      lines,
    });
  }

  const metadata = await pdf.getMetadata();
  const info = metadata.info as any;

  return {
    text: totalText.trim(),
    pages,
    metadata: {
      title: info?.Title,
      author: info?.Author,
      subject: info?.Subject,
      creator: info?.Creator,
      producer: info?.Producer,
      creationDate: info?.CreationDate,
      modDate: info?.ModDate,
    },
    info: {
      pageCount: pdf.numPages,
      totalCharacters,
      totalWords,
      totalLines,
    },
  };
}

export async function parsePDFFile(filePath: string): Promise<PDFParseResult> {
  const fs = await import('fs');
  const buffer = fs.readFileSync(filePath);
  return parsePDFBuffer(buffer);
}

export async function extractFinancialDataFromPDF(buffer: Buffer): Promise<FinancialDocumentExtraction> {
  const rawText = await parsePDFBuffer(buffer);
  const financialData = extractFinancialMetrics(rawText.text);
  const keyMetrics = extractKeyMetrics(rawText.text);

  return {
    rawText,
    financialData,
    keyMetrics,
  };
}

export async function extractFinancialDataFromFile(filePath: string): Promise<FinancialDocumentExtraction> {
  const fs = await import('fs');
  const buffer = fs.readFileSync(filePath);
  return extractFinancialDataFromPDF(buffer);
}

export function summarizePDF(result: PDFParseResult): string {
  const parts: string[] = [];
  
  parts.push(`文档共 ${result.info.pageCount} 页`);
  parts.push(`总字数: ${result.info.totalWords}`);
  
  if (result.metadata.title) {
    parts.push(`标题: ${result.metadata.title}`);
  }
  if (result.metadata.author) {
    parts.push(`作者: ${result.metadata.author}`);
  }
  
  // Extract first 500 chars as preview
  const preview = result.text.substring(0, 500).replace(/\n/g, ' ');
  parts.push(`预览: ${preview}...`);
  
  return parts.join('\n');
}

export function summarizeFinancialExtraction(extraction: FinancialDocumentExtraction): string {
  const parts: string[] = [];
  
  parts.push(summarizePDF(extraction.rawText));
  
  if (extraction.financialData.revenue && extraction.financialData.revenue.length > 0) {
    parts.push(`\n收入数据: ${extraction.financialData.revenue.slice(0, 3).join(', ')}`);
  }
  
  if (extraction.financialData.profit && extraction.financialData.profit.length > 0) {
    parts.push(`利润数据: ${extraction.financialData.profit.slice(0, 3).join(', ')}`);
  }
  
  if (extraction.financialData.eps && extraction.financialData.eps.length > 0) {
    parts.push(`每股收益: ${extraction.financialData.eps.slice(0, 3).join(', ')}`);
  }
  
  if (extraction.keyMetrics.length > 0) {
    parts.push(`\n关键指标:`);
    extraction.keyMetrics.slice(0, 5).forEach(metric => {
      parts.push(`  - ${metric.name}: ${metric.value}`);
    });
  }
  
  return parts.join('\n');
}
