/**
 * Zenith Quant Hive — Multi-Agent Types & Protocols
 * Zenith Atlas Institutional Multi-Agent Protocols
 */

export type AgentRole =
  | 'SYNC_SENTINEL'      // WebSocket & TEFAS pipeline auto-sync sentinel
  | 'RISK_BREAKER'       // Portfolio drawdown & volatility circuit breaker
  | 'TAX_HARVESTER'      // GVK Geçici 67 %0 tax exemption & HIFO optimizer
  | 'MACRO_STRATEGIST'   // TCMB interest rate & inflation macro researcher
  | 'LEAD_QUANT';        // Executive portfolio coordinator

export type AgentStatus = 'IDLE' | 'WORKING' | 'ALERTED' | 'TRIPPED' | 'REVIEWING';

export type MessageAct =
  | 'request'   // Request action from another agent
  | 'inform'    // Share market data or calculation results
  | 'propose'   // Propose rebalancing or hedging
  | 'query'     // Ask status or risk metrics
  | 'agree'     // Approve proposal
  | 'refuse'    // Reject proposal
  | 'alert'     // High priority warning
  | 'done';     // Signal task completion

export interface HiveMessage {
  id: string;
  conversationId: string;
  inReplyTo?: string | null;
  from: AgentRole;
  to: AgentRole | 'BROADCAST';
  act: MessageAct;
  subject: string;
  body: string;
  timestamp: string;
  data?: Record<string, any>;
  requiresReply?: boolean;
}

export type BreakerLevel = 'HEALTHY' | 'WARNED' | 'STEERED' | 'CONSTRAINED' | 'TRIPPED';

export interface CircuitBreakerConfig {
  enabled: boolean;
  maxDrawdownDailyPct: number;     // e.g. -3.0% daily portfolio loss trips breaker
  maxVolatilityAnnualPct: number;   // e.g. 35.0% annualized vol cap
  repeatedSignalLimit: number;      // Loop detection (e.g. 5 duplicate alarms)
  cooldownMs: number;               // Recovery cooldown (e.g. 30000ms)
  hardStop: boolean;                // Completely pause automated actions if tripped
}

export interface CircuitBreakerStatus {
  level: BreakerLevel;
  reason: string;
  trippedAt?: string | null;
  signalsCount: number;
  lastDrawdownPct: number;
  lastVolatilityPct: number;
  recoveryProgressPct: number;
}

export interface ToolExecutionSpan {
  id: string;
  agentRole: AgentRole;
  toolName: string;
  startedAt: number;
  durationMs: number;
  status: 'SUCCESS' | 'ERROR' | 'RUNNING';
  summary: string;
  details?: Record<string, any>;
}

export interface MemoryReflectionEntry {
  pinnedFacts: string[];
  condensedHistory: string[];
  recentObservations: Array<{
    timestamp: string;
    topic: string;
    content: string;
  }>;
}

export interface AgentDescriptor {
  role: AgentRole;
  name: string;
  title: string;
  avatar: string;
  status: AgentStatus;
  lastHeartbeat: string;
  currentTask?: string;
  metrics: {
    tasksCompleted: number;
    messagesProcessed: number;
    activeTimeSec: number;
    latencyMs: number;
  };
}
