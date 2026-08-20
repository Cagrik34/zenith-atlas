import type { PortfolioFund } from '../types/portfolio';
import { sanitizeCsvCell } from './formatters';

/**
 * Excel & CSV İhraç Motoru (DDE Formula Injection Korumalı)
 */
export function exportPortfolioToCsv(funds: PortfolioFund[], cashTL: number, portfolioName: string = 'Zenith Portföy'): void {
  const headers = [
    'Fon Kodu',
    'Fon Adı',
    'Kategori',
    'Adet',
    'Maliyet Fiyatı (TL)',
    'Güncel Fiyat (TL)',
    'Toplam Maliyet (TL)',
    'Güncel Değer (TL)',
    'Kâr/Zarar (TL)',
    'Getiri (%)',
    'Portföy Payı (%)'
  ];

  const totalFundValue = funds.reduce((s, f) => s + (f.shares * f.currentPrice), 0);
  const grandTotal = totalFundValue + cashTL;

  const rows: string[][] = funds.map(f => {
    const totalCost = f.shares * f.costPrice;
    const curVal = f.shares * f.currentPrice;
    const pnl = curVal - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
    const sharePct = grandTotal > 0 ? (curVal / grandTotal) * 100 : 0;

    return [
      sanitizeCsvCell(f.code),
      sanitizeCsvCell(f.name),
      sanitizeCsvCell(f.category),
      sanitizeCsvCell(f.shares.toLocaleString('tr-TR')),
      sanitizeCsvCell(f.costPrice.toFixed(4)),
      sanitizeCsvCell(f.currentPrice.toFixed(4)),
      sanitizeCsvCell(totalCost.toFixed(2)),
      sanitizeCsvCell(curVal.toFixed(2)),
      sanitizeCsvCell(pnl.toFixed(2)),
      sanitizeCsvCell(`%${pnlPct.toFixed(2)}`),
      sanitizeCsvCell(`%${sharePct.toFixed(2)}`)
    ];
  });

  // Nakit satırı
  if (cashTL > 0) {
    const cashSharePct = grandTotal > 0 ? (cashTL / grandTotal) * 100 : 0;
    rows.push([
      sanitizeCsvCell('NAKİT'),
      sanitizeCsvCell('TL Nakit & Likit Bakiye'),
      sanitizeCsvCell('Likit Varlık'),
      sanitizeCsvCell('1'),
      sanitizeCsvCell(cashTL.toFixed(2)),
      sanitizeCsvCell(cashTL.toFixed(2)),
      sanitizeCsvCell(cashTL.toFixed(2)),
      sanitizeCsvCell(cashTL.toFixed(2)),
      sanitizeCsvCell('0.00'),
      sanitizeCsvCell('%0.00'),
      sanitizeCsvCell(`%${cashSharePct.toFixed(2)}`)
    ]);
  }

  // Toplam satırı
  const totalCostAll = funds.reduce((s, f) => s + (f.shares * f.costPrice), 0) + cashTL;
  const totalPnlAll = grandTotal - totalCostAll;
  const totalPnlPctAll = totalCostAll > 0 ? (totalPnlAll / totalCostAll) * 100 : 0;

  rows.push([
    sanitizeCsvCell('TOPLAM'),
    sanitizeCsvCell(`${portfolioName} Genel Toplamı`),
    sanitizeCsvCell('-'),
    sanitizeCsvCell('-'),
    sanitizeCsvCell('-'),
    sanitizeCsvCell('-'),
    sanitizeCsvCell(totalCostAll.toFixed(2)),
    sanitizeCsvCell(grandTotal.toFixed(2)),
    sanitizeCsvCell(totalPnlAll.toFixed(2)),
    sanitizeCsvCell(`%${totalPnlPctAll.toFixed(2)}`),
    sanitizeCsvCell('%100.00')
  ]);

  const csvContent = '\uFEFF' + [
    headers.map(h => `"${h}"`).join(';'),
    ...rows.map(r => r.map(c => `"${c}"`).join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `Zenith_Atlas_Portfoy_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
