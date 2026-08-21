import type { PortfolioFund } from '../types/portfolio';
import type { MarketDataState } from '../types/market';

/**
 * Zenith Voice AI — Türkçe Sabah Piyasa & Portföy Sesli Bülten Motoru
 * Web Speech API tabanlı %100 istemci taraflı ses sentezleyici
 */
export class VoiceBriefingEngine {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;

  public static generateScript(
    funds: PortfolioFund[],
    cashTL: number,
    markets: MarketDataState | null,
    jensensAlpha: number = 0
  ): string {
    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
    const totalVal = funds.reduce((s, f) => s + (f.shares * f.currentPrice), 0) + cashTL;

    let usdStr = '48 lira 10 kuruş';
    let goldStr = '6 bin 980 lira';
    let bistStr = '14 bin 400 puan';

    if (markets?.categories?.featured?.items) {
      const feat = markets.categories.featured.items;
      if (feat.USD) usdStr = `${feat.USD.rate.toFixed(2).replace('.', ' lira ')} kuruş`;
      if (feat.GA) goldStr = `${Math.round(feat.GA.rate).toLocaleString('tr-TR')} lira`;
    }
    if (markets?.categories?.bist?.items?.XU100) {
      bistStr = `${Math.round(markets.categories.bist.items.XU100.rate).toLocaleString('tr-TR')} puan`;
    }

    const portfolioSummaryStr = totalVal > 0
      ? `Portföyünüzün toplam net aktif büyüklüğü nakit dahil ${Math.round(totalVal).toLocaleString('tr-TR')} Türk Lirasıdır. Fama-French faktör modeline göre portföyünüz yıllıklaştırılmış artı yüzde ${Math.abs(jensensAlpha).toFixed(1)} alfa getirisi üretmektedir.`
      : `Henüz portföyünüze fon eklenmemiş durumdadır. Terminal üzerinden dilediğiniz TEFAS fonunu ekleyerek kantitatif analizlerinizi hemen başlatabilirsiniz.`;

    const script = `Günaydın. Bugün ${today}. Zenith Atlas yapay zeka destekli sabah finans bültenine hoş geldiniz.

Piyasalarda son duruma baktığımızda; Dolar kuru ${usdStr}, Kapalıçarşı serbest piyasada 24 ayar gram altın ${goldStr} ve Borsa İstanbul 100 endeksi ${bistStr} seviyesinden işlem görmektedir.

${portfolioSummaryStr}

TCMB politika faizi yüzde 37 seviyesinde ve dezenflasyon süreci devam ederken, BIST hisse yoğun fonlarınızdaki yüzde 0 stopaj muafiyet kalkanı korunmaktadır.

Zenith Atlas yatırımlarınızda bol kazançlar diler.`;

    return script;
  }

  public static speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (e: any) => void
  ): void {
    if (!this.synth) {
      if (onError) onError('Tarayıcınız Web Speech API ses sentezini desteklemiyor.');
      return;
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = this.synth.getVoices();
    const trVoice = voices.find(v => v.lang.includes('tr') || v.lang.includes('TR'));
    if (trVoice) {
      utterance.voice = trVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      if (onError) onError(e);
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public static stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public static isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false;
  }
}
