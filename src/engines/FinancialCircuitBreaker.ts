/**
 * FinancialCircuitBreaker — Adaptive Quantitative Risk Breaker
 * Directly adapted from munder-difflin/src/main/breaker.ts architecture
 * 
 * Protects investor capital against runaway drawdowns, high volatility surges,
 * and anomalous multi-agent loop storms.
 */

import type { BreakerLevel, CircuitBreakerConfig, CircuitBreakerStatus } from '../types/hive';

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  enabled: true,
  maxDrawdownDailyPct: -3.0,     // -3.0% daily loss trips the breaker
  maxVolatilityAnnualPct: 35.0,   // 35.0% volatility cap
  repeatedSignalLimit: 5,        // Max 5 identical error signals
  cooldownMs: 30000,             // 30 seconds recovery grace
  hardStop: true
};

const LEVELS: BreakerLevel[] = ['HEALTHY', 'WARNED', 'STEERED', 'CONSTRAINED', 'TRIPPED'];

function rank(level: BreakerLevel): number {
  return LEVELS.indexOf(level);
}

export class FinancialCircuitBreaker {
  private config: CircuitBreakerConfig;
  private currentLevel: BreakerLevel = 'HEALTHY';
  private reason: string = 'Nominal portföy riski — Sistem normal';
  private repeatCount: number = 0;
  private lastSignalKey: string = '';
  private lastTripTime: number = 0;
  private noProgressBeats: number = 0;
  private lastDrawdownPct: number = 0;
  private lastVolatilityPct: number = 0;

  constructor(customConfig?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  public getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Evaluates current portfolio state against risk limits and velocity signals
   * Returns updated status and escalation decision
   */
  public evaluate(
    dailyDrawdownPct: number,
    annualVolatilityPct: number,
    errorSignal?: string
  ): CircuitBreakerStatus {
    if (!this.config.enabled) {
      this.currentLevel = 'HEALTHY';
      this.reason = 'Devre kesici devre dışı bırakıldı.';
      return this.getStatus();
    }

    this.lastDrawdownPct = dailyDrawdownPct;
    this.lastVolatilityPct = annualVolatilityPct;
    const now = Date.now();

    // 1. Signal & Loop Tracking (from munder-difflin)
    if (errorSignal) {
      if (errorSignal === this.lastSignalKey) {
        this.repeatCount += 1;
      } else {
        this.lastSignalKey = errorSignal;
        this.repeatCount = 1;
      }
    } else {
      this.repeatCount = Math.max(0, this.repeatCount - 1);
    }

    // 2. Risk Signals Evaluation
    let tripping = false;
    let tripReason = '';

    // (a) Daily Drawdown Limit Breach
    if (dailyDrawdownPct <= this.config.maxDrawdownDailyPct) {
      tripping = true;
      tripReason = `Günlük kayıp eşiği aşıldı: %${dailyDrawdownPct.toFixed(2)} <= %${this.config.maxDrawdownDailyPct.toFixed(2)}`;
    }
    // (b) Volatility Limit Breach
    else if (annualVolatilityPct >= this.config.maxVolatilityAnnualPct) {
      tripping = true;
      tripReason = `Portföy volatilitesi tavanı aştı: %${annualVolatilityPct.toFixed(1)} >= %${this.config.maxVolatilityAnnualPct.toFixed(1)}`;
    }
    // (c) Loop / Error Storm
    else if (this.repeatCount >= this.config.repeatedSignalLimit) {
      tripping = true;
      tripReason = `Tekrarlayan anomali fırtınası: ${this.repeatCount} ardışık hata (${this.lastSignalKey})`;
    }

    // 3. State Transition (Escalation / Recovery)
    if (tripping) {
      this.lastTripTime = now;
      const targetRank = Math.min(rank(this.currentLevel) + 1, rank(this.config.hardStop ? 'TRIPPED' : 'CONSTRAINED'));
      this.currentLevel = LEVELS[targetRank];
      this.reason = tripReason;
    } else {
      // Cooldown check for step-by-step recovery
      if (now - this.lastTripTime > this.config.cooldownMs && rank(this.currentLevel) > 0) {
        const targetRank = Math.max(rank(this.currentLevel) - 1, 0);
        this.currentLevel = LEVELS[targetRank];
        this.reason = this.currentLevel === 'HEALTHY' ? 'Nominal portföy riski — Sistem normal' : 'Kademeli risk iyileşmesi devrede';
      }
    }

    return this.getStatus();
  }

  /**
   * Manual reset by user / portfolio manager (Human-in-the-loop)
   */
  public manualReset(reason: string = 'Portföy yöneticisi tarafından onaylandı'): void {
    this.currentLevel = 'HEALTHY';
    this.reason = reason;
    this.repeatCount = 0;
    this.lastSignalKey = '';
    this.lastTripTime = 0;
  }

  public getStatus(): CircuitBreakerStatus {
    const now = Date.now();
    const elapsedSinceTrip = this.lastTripTime > 0 ? now - this.lastTripTime : this.config.cooldownMs;
    const recoveryProgressPct = Math.min(100, Math.round((elapsedSinceTrip / this.config.cooldownMs) * 100));

    return {
      level: this.currentLevel,
      reason: this.reason,
      trippedAt: this.lastTripTime > 0 ? new Date(this.lastTripTime).toLocaleTimeString('tr-TR') : null,
      signalsCount: this.repeatCount,
      lastDrawdownPct: this.lastDrawdownPct,
      lastVolatilityPct: this.lastVolatilityPct,
      recoveryProgressPct: this.currentLevel === 'HEALTHY' ? 100 : recoveryProgressPct
    };
  }
}
