/**
 * FinancialMemoryReflector — Bounded 3-Region Semantic Financial Memory
 * Zenith 3-Region Semantic Financial Memory Model
 * 
 * Manages long-term investor preferences, strategy learnings, and observation condensation.
 */

import type { MemoryReflectionEntry } from '../types/hive';

const MEMORY_STORAGE_KEY = 'zenith_quant_memory_v1';
const MAX_RECENT_OBSERVATIONS = 12;

const INITIAL_PINNED_FACTS: string[] = [
  'Yatırım Evreni: 1.051 TEFAS Yatırım Fonu, BIST 100 Sektörleri, Kapalıçarşı Fiziki Altın/Döviz ve TCMB.',
  'Vergi Kalkanı Kuralı: BIST Hisse Senedi Yoğun fonlarda %0 Stopaj Muafiyeti (GVK Geçici 67), diğer fonlarda %17.50 stopaj uygulanır.',
  'Risk Yönetimi: Yıllık volatilite tavanı %35, maksimum günlük portföy kayıp toleransı %-3.0.',
  'Optimizasyon Standardı: Marcos Lopez de Prado HRP ve Black-Litterman Bayesyen Denge modelleri esastır.'
];

export class FinancialMemoryReflector {
  private state: MemoryReflectionEntry;

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): MemoryReflectionEntry {
    try {
      const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.pinnedFacts)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('MemoryReflector read error:', e);
    }

    return {
      pinnedFacts: [...INITIAL_PINNED_FACTS],
      condensedHistory: [
        'Portföy 2026 TCMB %37 politika faizi ve dezenflasyon sürecine göre defansif büyüme stratejisiyle yapılandırıldı.',
        'Hisselerde BIST 100 dışı çarpan iskonto avantajına sahip fonlar ve yabancı teknoloji fonları dengelendi.'
      ],
      recentObservations: []
    };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('MemoryReflector save error:', e);
    }
  }

  /**
   * Adds an observation and triggers automatic memory condensation if threshold is reached
   */
  public recordObservation(topic: string, content: string): void {
    const obs = {
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      topic,
      content
    };

    this.state.recentObservations.push(obs);

    // Condensation Threshold (Adapted from reflect.ts 3-region model)
    if (this.state.recentObservations.length > MAX_RECENT_OBSERVATIONS) {
      this.condense();
    } else {
      this.saveToStorage();
    }
  }

  /**
   * Condenses older recent observations into the condensedHistory rolling summary
   */
  public condense(): void {
    if (this.state.recentObservations.length <= 4) return;

    const toCondense = this.state.recentObservations.slice(0, -4);
    const toKeep = this.state.recentObservations.slice(-4);

    const condensedSummary = `[Özet ${new Date().toLocaleDateString('tr-TR')}]: ` +
      toCondense.map(o => `${o.topic}: ${o.content}`).join(' | ');

    this.state.condensedHistory.push(condensedSummary);
    if (this.state.condensedHistory.length > 8) {
      this.state.condensedHistory.shift(); // Keep bounded window
    }

    this.state.recentObservations = toKeep;
    this.saveToStorage();
  }

  public getMemorySnapshot(): MemoryReflectionEntry {
    return {
      pinnedFacts: [...this.state.pinnedFacts],
      condensedHistory: [...this.state.condensedHistory],
      recentObservations: [...this.state.recentObservations]
    };
  }

  public addPinnedFact(fact: string): void {
    if (fact && !this.state.pinnedFacts.includes(fact)) {
      this.state.pinnedFacts.push(fact);
      this.saveToStorage();
    }
  }

  public clearMemory(): void {
    this.state = {
      pinnedFacts: [...INITIAL_PINNED_FACTS],
      condensedHistory: [],
      recentObservations: []
    };
    this.saveToStorage();
  }
}
