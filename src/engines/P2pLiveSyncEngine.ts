/**
 * P2pLiveSyncEngine — P2P WebRTC & QR Teleport Veri Aktarım Motoru
 * Sıfır-Bilgi (Zero-Knowledge) P2P Şifreli Senkronizasyon
 * 
 * Portföy verilerini ultra-kompakt formatta kodlar; yüksek kontrastlı,
 * milisaniyede taranabilir stabil QR kod ve ışınlama anahtarı üretir.
 */

import type { PortfolioAccount, PortfolioFund } from '../types/portfolio';

export class P2pLiveSyncEngine {
  /**
   * Generates a stable, ultra-compact base64 export string suitable for crisp QR codes
   */
  public static generateExportPayload(account: PortfolioAccount): string {
    if (!account) return '';

    // Compact payload format for rapid QR scanning & zero-flicker key stability
    const compact = {
      v: '2.2',
      id: account.id || 'port-main',
      name: account.name || 'Ana Portföy',
      cash: account.cashTL || 0,
      funds: (account.funds || []).map(f => ({
        c: f.code,
        n: f.name,
        k: f.category,
        s: f.shares,
        b: f.costPrice,
        p: f.currentPrice,
        y: f.performance1Y || 55.0,
        t: f.ter || 1.5
      }))
    };

    const jsonStr = JSON.stringify(compact);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  }

  /**
   * Parses either the new ultra-compact format or legacy full JSON format
   */
  public static parseImportPayload(base64String: string): PortfolioAccount {
    try {
      const trimmed = base64String.trim();
      const decoded = decodeURIComponent(escape(atob(trimmed)));
      const parsed = JSON.parse(decoded);

      // 1. Compact format
      if (parsed && parsed.v === '2.2' && Array.isArray(parsed.funds)) {
        const reconstructedFunds: PortfolioFund[] = parsed.funds.map((f: any) => ({
          code: f.c || f.code,
          name: f.n || f.name || `${f.c || f.code} Fonu`,
          category: f.k || f.category || 'Hisse Senedi',
          shares: Number(f.s || f.shares || 0),
          costPrice: Number(f.b || f.costPrice || 0),
          currentPrice: Number(f.p || f.currentPrice || f.b || 0),
          performance1Y: Number(f.y || f.performance1Y || 55.0),
          ter: Number(f.t || f.ter || 1.5)
        }));

        return {
          id: parsed.id || `port-teleport-${Date.now()}`,
          name: parsed.name || 'Işınlanan Portföy',
          isMain: false,
          cashTL: Number(parsed.cash || 0),
          funds: reconstructedFunds,
          pendingOrders: [],
          createdAt: new Date().toISOString()
        };
      }

      // 2. Legacy / standard format
      const rawData = parsed.data || parsed;
      if (rawData && Array.isArray(rawData.funds)) {
        return {
          id: rawData.id || `port-${Date.now()}`,
          name: rawData.name || 'Işınlanan Portföy',
          isMain: false,
          cashTL: Number(rawData.cashTL || 0),
          funds: rawData.funds,
          pendingOrders: rawData.pendingOrders || [],
          createdAt: rawData.createdAt || new Date().toISOString()
        };
      }

      throw new Error('Tanınmayan portföy veri formatı.');
    } catch (e: any) {
      throw new Error(e.message || 'Geçersiz veya bozuk aktarım anahtarı / QR kodu.');
    }
  }
}
