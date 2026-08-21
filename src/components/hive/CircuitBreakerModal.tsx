/**
 * CircuitBreakerModal — Human-In-The-Loop (HITL) Emergency Risk & Rebalancing Gate
 * Adapted from munder-difflin/src/main/control.ts architecture
 */

import React from 'react';
import { useAgentHive } from '../../context/AgentHiveContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { formatPercent, formatTRY } from '../../utils/formatters';

export const CircuitBreakerModal: React.FC = () => {
  const { breakerStatus, resetBreaker, isBreakerModalOpen, setIsBreakerModalOpen } = useAgentHive();
  const { totalPortfolioValue } = usePortfolio();

  if (!isBreakerModalOpen) return null;

  const isTripped = breakerStatus.level === 'TRIPPED';
  const isWarned = breakerStatus.level === 'WARNED' || breakerStatus.level === 'STEERED' || breakerStatus.level === 'CONSTRAINED';

  return (
    <div className="modal-overlay active" style={{ zIndex: 9999 }}>
      <div className="modal-content modal-md" style={{ border: isTripped ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)', background: '#0A0E1F', boxShadow: isTripped ? '0 0 35px rgba(239, 68, 68, 0.25)' : '0 0 35px rgba(245, 158, 11, 0.25)' }}>
        <div className="modal-header">
          <div className="modal-title-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isTripped ? (
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                <ShieldAlert size={20} />
              </div>
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                <AlertTriangle size={20} />
              </div>
            )}
            <div>
              <h3 className="modal-title" style={{ color: isTripped ? '#EF4444' : '#F59E0B', margin: 0 }}>
                {isTripped ? '🚨 FİNANSAL DEVRE KESİCİ TETİKLENDİ!' : '⚠️ KANTİTATİF RİSK UYARISI'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Risk Seviyesi: <strong>{breakerStatus.level}</strong> ({breakerStatus.trippedAt || 'Canlı'})</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setIsBreakerModalOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.78rem', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>TETİKLENME SEBEBİ:</span>
            <p style={{ color: '#F1F5F9', fontSize: '0.9rem', fontWeight: 600, margin: 0, lineHeight: '1.5' }}>
              {breakerStatus.reason}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block' }}>Portföy Büyüklüğü</span>
              <strong style={{ fontSize: '0.95rem', color: '#FFFFFF' }}>{formatTRY(totalPortfolioValue)}</strong>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block' }}>İyileşme Durumu</span>
              <strong style={{ fontSize: '0.95rem', color: breakerStatus.recoveryProgressPct === 100 ? '#10B981' : '#F59E0B' }}>
                %{breakerStatus.recoveryProgressPct}
              </strong>
            </div>
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.08)', borderLeft: '3px solid #6366F1', padding: '12px 14px', borderRadius: '0 8px 8px 0', marginBottom: '20px', fontSize: '0.82rem', color: '#CBD5E1', lineHeight: '1.5' }}>
            <strong>🤖 Quant Ajan Masası Önerisi:</strong> Portföyünüzün hisse ağırlığını azaltıp TCMB %37 politika faiz kalkanı sunan <strong>Para Piyasası (TP2, AIS)</strong> ve <strong>Fiziki Altın (KZL)</strong> fonlarına acil defansif tahsisat yapılması tavsiye edilir.
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsBreakerModalOpen(false)}
              style={{ padding: '8px 16px', fontSize: '0.84rem' }}
            >
              Gözardı Et
            </button>
            <button
              className="btn btn-primary"
              onClick={() => resetBreaker('Portföy yöneticisi onayı ile devre kesici sıfırlandı')}
              style={{ padding: '8px 18px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px', background: isTripped ? '#EF4444' : '#6366F1' }}
            >
              <ShieldCheck size={16} />
              <span>{isTripped ? 'Onayla & Devre Kesiciyi Sıfırla' : 'Risk Uyarısını Onayla'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
