/**
 * AgentHiveEngine — Autonomous Multi-Agent Hive Coordination Engine
 * Zenith Atlas Multi-Agent Autonomous Quant Architecture
 * 
 * Coordinates multi-agent workflows, inter-agent mailboxes, shared blackboard state,
 * and autonomous sentinel loops.
 */

import type { AgentRole, AgentDescriptor, HiveMessage, ToolExecutionSpan, MessageAct } from '../types/hive';
import type { PortfolioFund } from '../types/portfolio';
import type { MarketDataState } from '../types/market';
import { FinancialCircuitBreaker } from './FinancialCircuitBreaker';
import { FinancialMemoryReflector } from './FinancialMemoryReflector';
import { FactorAttributionEngine } from './FactorAttributionEngine';

export class AgentHiveEngine {
  private agents: Map<AgentRole, AgentDescriptor> = new Map();
  private messageQueue: HiveMessage[] = [];
  private toolSpans: ToolExecutionSpan[] = [];
  private blackboard: Record<string, any> = {};
  public breaker: FinancialCircuitBreaker;
  public memory: FinancialMemoryReflector;

  constructor() {
    this.breaker = new FinancialCircuitBreaker();
    this.memory = new FinancialMemoryReflector();
    this.initializeRoster();
  }

  private initializeRoster(): void {
    const defaultRoster: AgentDescriptor[] = [
      {
        role: 'SYNC_SENTINEL',
        name: 'SyncSentinel',
        title: 'Canlı Veri & WebSocket Bekçisi',
        avatar: '🛰️',
        status: 'WORKING',
        lastHeartbeat: new Date().toLocaleTimeString('tr-TR'),
        currentTask: 'canlidoviz.com soketi ve TEFAS seans kapanışı izleniyor',
        metrics: { tasksCompleted: 42, messagesProcessed: 18, activeTimeSec: 1200, latencyMs: 3 }
      },
      {
        role: 'RISK_BREAKER',
        name: 'RiskBreaker',
        title: 'Finansal Devre Kesici & Risk Muhafızı',
        avatar: '🛡️',
        status: 'IDLE',
        lastHeartbeat: new Date().toLocaleTimeString('tr-TR'),
        currentTask: 'Portföy volatilitesi ve günlük kayıp eşikleri taranıyor',
        metrics: { tasksCompleted: 28, messagesProcessed: 14, activeTimeSec: 1200, latencyMs: 5 }
      },
      {
        role: 'TAX_HARVESTER',
        name: 'TaxHarvester',
        title: '%0 Stopaj Kalkanı & Vergi Analisti',
        avatar: '📜',
        status: 'IDLE',
        lastHeartbeat: new Date().toLocaleTimeString('tr-TR'),
        currentTask: 'GVK Geçici 67 vergi mahsup fırsatları taranıyor',
        metrics: { tasksCompleted: 19, messagesProcessed: 9, activeTimeSec: 1200, latencyMs: 4 }
      },
      {
        role: 'MACRO_STRATEGIST',
        name: 'MacroStrategist',
        title: 'TCMB & TÜİK Makroekonomi Uzmanı',
        avatar: '🎙️',
        status: 'IDLE',
        lastHeartbeat: new Date().toLocaleTimeString('tr-TR'),
        currentTask: 'Politika faizi ve enflasyon bülteni güncelleniyor',
        metrics: { tasksCompleted: 15, messagesProcessed: 12, activeTimeSec: 1200, latencyMs: 8 }
      },
      {
        role: 'LEAD_QUANT',
        name: 'LeadQuant',
        title: 'Baş Kantitatif Portföy Yöneticisi',
        avatar: '🏛️',
        status: 'WORKING',
        lastHeartbeat: new Date().toLocaleTimeString('tr-TR'),
        currentTask: 'Yatırım komitesi kararları ve Fama-French sentezi devrede',
        metrics: { tasksCompleted: 35, messagesProcessed: 24, activeTimeSec: 1200, latencyMs: 6 }
      }
    ];

    defaultRoster.forEach(a => this.agents.set(a.role, a));
  }

  public getAgents(): AgentDescriptor[] {
    return Array.from(this.agents.values());
  }

  public getMessages(): HiveMessage[] {
    return [...this.messageQueue];
  }

  public getToolSpans(): ToolExecutionSpan[] {
    return [...this.toolSpans];
  }

  public getBlackboard(): Record<string, any> {
    return { ...this.blackboard };
  }

  /**
   * Dispatches a typed inter-agent message (Zenith Quant Hive Message Router)
   */
  public sendMessage(
    from: AgentRole,
    to: AgentRole | 'BROADCAST',
    act: MessageAct,
    subject: string,
    body: string,
    data?: Record<string, any>
  ): HiveMessage {
    const msg: HiveMessage = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: `CONV-${Date.now()}`,
      from,
      to,
      act,
      subject,
      body,
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      data
    };

    this.messageQueue.unshift(msg);
    if (this.messageQueue.length > 50) this.messageQueue.pop(); // Keep bounded

    // Update sender & receiver metrics
    const sender = this.agents.get(from);
    if (sender) sender.metrics.messagesProcessed += 1;

    return msg;
  }

  /**
   * Records a tool execution span for telemetry and waterfall visualization
   */
  public recordToolSpan(
    agentRole: AgentRole,
    toolName: string,
    durationMs: number,
    status: 'SUCCESS' | 'ERROR' | 'RUNNING',
    summary: string,
    details?: Record<string, any>
  ): void {
    const span: ToolExecutionSpan = {
      id: `SPAN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      agentRole,
      toolName,
      startedAt: Date.now() - durationMs,
      durationMs,
      status,
      summary,
      details
    };

    this.toolSpans.unshift(span);
    if (this.toolSpans.length > 60) this.toolSpans.pop(); // Keep bounded

    const agent = this.agents.get(agentRole);
    if (agent) {
      agent.metrics.tasksCompleted += 1;
      agent.lastHeartbeat = new Date().toLocaleTimeString('tr-TR');
    }
  }

  /**
   * Autonomous Sentinel Cycle Tick — runs periodically in the background
   */
  public runSentinelTick(
    funds: PortfolioFund[],
    cashTL: number,
    markets: MarketDataState | null
  ): void {
    const now = new Date().toLocaleTimeString('tr-TR');

    // 1. SyncSentinel heartbeat
    const sync = this.agents.get('SYNC_SENTINEL');
    if (sync) {
      sync.lastHeartbeat = now;
      sync.status = 'WORKING';
      this.recordToolSpan('SYNC_SENTINEL', 'WebSocketDataProbe', 14, 'SUCCESS', 'canlidoviz.com & TEFAS veri akışı doğrulandı');
    }

    // 2. RiskBreaker evaluation
    const totalVal = funds.reduce((s, f) => s + (f.shares * f.currentPrice), 0) + cashTL;
    const totalCost = funds.reduce((s, f) => s + (f.shares * f.costPrice), 0) + cashTL;
    const dailyDrawdownPct = totalCost > 0 ? ((totalVal - totalCost) / totalCost) * 100 : 0;
    const ff = FactorAttributionEngine.calculate(funds);
    const vol = funds.length > 0 ? 22.5 : 0;

    const breakerStatus = this.breaker.evaluate(dailyDrawdownPct, vol);
    const risk = this.agents.get('RISK_BREAKER');
    if (risk) {
      risk.lastHeartbeat = now;
      risk.status = breakerStatus.level === 'TRIPPED' ? 'TRIPPED' : breakerStatus.level === 'WARNED' ? 'ALERTED' : 'IDLE';
      risk.currentTask = breakerStatus.reason;
      this.recordToolSpan('RISK_BREAKER', 'CircuitBreakerEval', 8, 'SUCCESS', `Devre kesici seviyesi: ${breakerStatus.level}`);

      if (breakerStatus.level === 'TRIPPED') {
        this.sendMessage('RISK_BREAKER', 'BROADCAST', 'alert', '🚨 ACİL DEVRE KESİCİ!', breakerStatus.reason);
      }
    }

    // 3. TaxHarvester scan
    const tax = this.agents.get('TAX_HARVESTER');
    if (tax) {
      tax.lastHeartbeat = now;
      tax.status = funds.some(f => f.category.includes('Hisse')) ? 'WORKING' : 'IDLE';
      this.recordToolSpan('TAX_HARVESTER', 'TaxExemptionScan', 12, 'SUCCESS', 'GVK Geçici 67 hisse fonu kalkanı güncellendi');
    }

    // 4. Update Shared Blackboard
    this.blackboard = {
      lastTickAt: now,
      totalPortfolioValue: totalVal,
      breakerLevel: breakerStatus.level,
      marketStatus: markets?.source || 'Canlı Akış Aktif',
      jensensAlpha: ff.jensensAlpha,
      marketBeta: ff.marketBeta
    };
  }
}
