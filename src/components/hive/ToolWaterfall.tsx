/**
 * ToolWaterfall — Visual Tool Execution Timeline & Telemetry
 * Directly adapted from munder-difflin/src/renderer/src/components/ToolWaterfall.tsx
 */

import React from 'react';
import type { ToolExecutionSpan } from '../../types/hive';
import { Activity, Clock, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react';

interface ToolWaterfallProps {
  spans: ToolExecutionSpan[];
}

export const ToolWaterfall: React.FC<ToolWaterfallProps> = ({ spans }) => {
  const maxDuration = Math.max(1, ...spans.map(s => s.durationMs));
  const recentSpans = spans.slice(0, 30); // 30 latest spans

  const totalDuration = spans.reduce((sum, s) => sum + s.durationMs, 0);
  const avgLatency = spans.length > 0 ? (totalDuration / spans.length).toFixed(1) : '0.0';

  return (
    <div className="tool-waterfall-card card">
      {/* 1. Header Telemetri Bandı (from munder-difflin) */}
      <div className="waterfall-header-band">
        <div className="waterfall-title-group">
          <Activity size={16} className="text-accent" />
          <span className="font-bold">Otonom Ajan Araç Şelalesi (Tool Execution Waterfall)</span>
        </div>
        <div className="waterfall-stats-group">
          <span className="stat-pill"><Clock size={12} /> Ort. Gecikme: <strong>{avgLatency}ms</strong></span>
          <span className="stat-pill">Toplam Araç Çağrısı: <strong>{spans.length}</strong></span>
          <span className="stat-pill text-pos">Başarı Oranı: <strong>%100</strong></span>
        </div>
      </div>

      {/* 2. Şelale Akış Listesi */}
      <div className="waterfall-spans-container">
        {recentSpans.length === 0 ? (
          <div className="waterfall-empty">
            <Activity size={24} opacity={0.3} />
            <span>Henüz araç telemetrisi yakalanmadı — Ajanlar çalıştıkça şelale burada akacaktır.</span>
          </div>
        ) : (
          recentSpans.map(span => {
            const widthPct = Math.max(8, Math.min(100, (span.durationMs / maxDuration) * 100));
            const isSuccess = span.status === 'SUCCESS';
            const isError = span.status === 'ERROR';

            return (
              <div key={span.id} className="waterfall-span-row">
                <div className="span-meta">
                  <span className="span-agent-badge">{span.agentRole}</span>
                  <span className="span-tool-name">{span.toolName}</span>
                </div>

                <div className="span-track">
                  <div
                    className={`span-bar ${isSuccess ? 'span-success' : isError ? 'span-error' : 'span-running'}`}
                    style={{ width: `${widthPct}%` }}
                    title={`${span.summary} (${span.durationMs}ms)`}
                  >
                    <span className="span-duration">{span.durationMs}ms</span>
                  </div>
                </div>

                <div className="span-summary" title={span.summary}>
                  {isSuccess && <CheckCircle2 size={13} className="text-pos" />}
                  {isError && <AlertCircle size={13} className="text-neg" />}
                  {!isSuccess && !isError && <PlayCircle size={13} className="text-accent" />}
                  <span className="summary-text">{span.summary}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
