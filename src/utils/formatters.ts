/**
 * Zenith Atlas — Standart Finansal Formatlayıcılar ve Güvenlik Sanitizasyonu
 */

export function formatTRY(val: number, decimals: number = 2): string {
  if (isNaN(val) || val === null || val === undefined) return '₺0,00';
  return `₺${val.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

export function formatPercent(val: number, withSign: boolean = true, decimals: number = 2): string {
  if (isNaN(val) || val === null || val === undefined) return '%0,00';
  const sign = withSign && val > 0 ? '+' : '';
  return `${sign}%${val.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

export function formatNumber(val: number, decimals: number = 2): string {
  if (isNaN(val) || val === null || val === undefined) return '0,00';
  return val.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatDate(date: string | Date): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTimestamp(date: Date = new Date()): string {
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * XSS Koruması: HTML karakterlerini temizler
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Excel DDE Formula Injection Koruması (=, +, -, @ karakterleriyle başlayan formülleri etkisizleştirir)
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return str.replace(/"/g, '""');
}
