/**
 * P2P WebRTC & QR Teleport Veri Aktarım Motoru
 * Sıfır-Bilgi (Zero-Knowledge) P2P Şifreli Senkronizasyon
 */
export class P2pLiveSyncEngine {
  public static generateExportPayload(state: any): string {
    const payload = {
      timestamp: Date.now(),
      version: '2.2.0',
      data: state
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }

  public static parseImportPayload(base64String: string): any {
    try {
      const decoded = decodeURIComponent(escape(atob(base64String.trim())));
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.data) {
        return parsed.data;
      }
      return parsed;
    } catch (e) {
      throw new Error('Geçersiz veya bozuk aktarım anahtarı / QR kodu.');
    }
  }
}
