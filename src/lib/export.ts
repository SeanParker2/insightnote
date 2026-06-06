'use client';

export type ExportFormat = 'json' | 'csv' | 'markdown';

interface ExportOptions {
  filename: string;
  format: ExportFormat;
  data: unknown[];
  columns?: string[];
}

export function exportData({ filename, format, data, columns }: ExportOptions) {
  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
      break;

    case 'csv':
      content = convertToCSV(data, columns);
      mimeType = 'text/csv';
      extension = 'csv';
      break;

    case 'markdown':
      content = convertToMarkdown(data, columns);
      mimeType = 'text/markdown';
      extension = 'md';
      break;

    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  downloadFile(content, `${filename}.${extension}`, mimeType);
}

function convertToCSV(data: unknown[], columns?: string[]): string {
  if (data.length === 0) return '';

  // Get all unique keys if columns not specified
  const keys = columns || Array.from(
    new Set(data.flatMap(item => Object.keys(item as Record<string, unknown>)))
  );

  // Header row
  const header = keys.map(key => escapeCSV(key)).join(',');

  // Data rows
  const rows = data.map(item => {
    const record = item as Record<string, unknown>;
    return keys.map(key => {
      const value = record[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return escapeCSV(JSON.stringify(value));
      return escapeCSV(String(value));
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function convertToMarkdown(data: unknown[], columns?: string[]): string {
  if (data.length === 0) return '';

  // Get all unique keys if columns not specified
  const keys = columns || Array.from(
    new Set(data.flatMap(item => Object.keys(item as Record<string, unknown>)))
  );

  // Header row
  const header = `| ${keys.join(' | ')} |`;
  const separator = `| ${keys.map(() => '---').join(' | ')} |`;

  // Data rows
  const rows = data.map(item => {
    const record = item as Record<string, unknown>;
    const values = keys.map(key => {
      const value = record[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
    return `| ${values.join(' | ')} |`;
  });

  return [header, separator, ...rows].join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export helpers for specific data types
export function exportJournalEntries(entries: unknown[]) {
  exportData({
    filename: `decision-journal-${new Date().toISOString().split('T')[0]}`,
    format: 'csv',
    data: entries,
    columns: ['symbol', 'action', 'price', 'emotion_label', 'reasoning', 'created_at'],
  });
}

export function exportPortfolioHoldings(holdings: unknown[]) {
  exportData({
    filename: `portfolio-${new Date().toISOString().split('T')[0]}`,
    format: 'csv',
    data: holdings,
    columns: ['symbol', 'name', 'quantity', 'avg_cost', 'sector', 'asset_class'],
  });
}

export function exportPredictions(predictions: unknown[]) {
  exportData({
    filename: `predictions-${new Date().toISOString().split('T')[0]}`,
    format: 'csv',
    data: predictions,
    columns: ['symbol', 'direction', 'target_price', 'status', 'confidence', 'created_at'],
  });
}

export function exportAlerts(alerts: unknown[]) {
  exportData({
    filename: `alerts-${new Date().toISOString().split('T')[0]}`,
    format: 'csv',
    data: alerts,
    columns: ['alert_type', 'severity', 'title', 'body', 'symbol', 'is_read', 'created_at'],
  });
}

export function exportScenarioSimulations(simulations: unknown[]) {
  exportData({
    filename: `scenarios-${new Date().toISOString().split('T')[0]}`,
    format: 'json',
    data: simulations,
  });
}
