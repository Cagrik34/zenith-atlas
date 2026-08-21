/**
 * AgentHivePanel — Quant War Room & Multi-Agent Autonomous Command Center
 * Zenith Quant War Room & Command Center
 */

import React, { useState } from 'react';
import { useAgentHive } from '../../context/AgentHiveContext';
import { ToolWaterfall } from './ToolWaterfall';
import { Bot, Shield, Activity, Database, Send, Radio, AlertTriangle, CheckCircle, Sparkles, BookOpen, Layers, Terminal, ArrowRight } from 'lucide-react';
import { formatTRY } from '../../utils/formatters';

export const AgentHivePanel: React.FC = () => {
  const { agents, messages, toolSpans, blackboard, breakerStatus, memorySnapshot, sendMessage, setIsBreakerModalOpen } = useAgentHive();
  const [activeTab, setActiveTab] = useState<'roster' | 'dialogue' | 'waterfall' | 'memory' | 'blackboard'>('roster');
  const [customMsg, setCustomMsg] = useState('');

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    sendMessage('LEAD_QUANT', 'BROADCAST', 'request', 'Yatırım Komitesi Direktifi', customMsg);
    setCustomMsg('');
  };

  const handleQuickDirective = (directiveText: string) => {
    sendMessage('LEAD_QUANT', 'BROADCAST', 'request', 'Yatırım Komitesi Direktifi', directiveText);
    setActiveTab('dialogue');
  };

  return (
    <div className="agent-hive-panel card" style={{ marginTop: '20px', border: '1px solid rgba(99, 102, 241, 0.25)', background: '#070A18' }}>
      {/* 1. ÜST BAŞLIK VE HIVE SEKME MENÜSÜ */}
      <div className="card-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8' }}>
            <Bot size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, background: 'linear-gradient(135deg, #FFFFFF, #CBD5E1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Zenith Quant Hive — Otonom Ajan Masası & Devre Kesici
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
              5 Otonom Nöbetçi Ajan • Canlı Arka Plan Senkronizasyonu • Devre Kesici: <strong style={{ color: breakerStatus.level === 'HEALTHY' ? '#10B981' : '#EF4444' }}>{breakerStatus.level}</strong>
            </span>
          </div>
        </div>

        {/* Alt Sekmeler */}
        <div className="toggle-group" style={{ margin: 0 }}>
          <button
            className={`toggle-btn ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <Bot size={13} /> Ajan Masası (5)
          </button>
          <button
            className={`toggle-btn ${activeTab === 'dialogue' ? 'active' : ''}`}
            onClick={() => setActiveTab('dialogue')}
          >
            <Radio size={13} /> Ajan Posta Kutusu ({messages.length})
          </button>
          <button
            className={`toggle-btn ${activeTab === 'waterfall' ? 'active' : ''}`}
            onClick={() => setActiveTab('waterfall')}
          >
            <Activity size={13} /> Araç Şelalesi ({toolSpans.length})
          </button>
          <button
            className={`toggle-btn ${activeTab === 'memory' ? 'active' : ''}`}
            onClick={() => setActiveTab('memory')}
          >
            <BookOpen size={13} /> Hafıza ({memorySnapshot.pinnedFacts.length + memorySnapshot.recentObservations.length})
          </button>
          <button
            className={`toggle-btn ${activeTab === 'blackboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('blackboard')}
          >
            <Database size={13} /> Karatahta
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* TAB 1: 5 AJAN KARTLARI (ROSTER) */}
        {activeTab === 'roster' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {agents.map(agent => (
                <div
                  key={agent.role}
                  className="card"
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '14px',
                    borderRadius: '10px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.4rem' }}>{agent.avatar}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#FFFFFF' }}>{agent.name}</strong>
                        <span className={`badge ${agent.status === 'WORKING' ? 'badge-primary' : agent.status === 'TRIPPED' ? 'badge-danger' : 'badge-category'}`} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                          {agent.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {agent.title}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.74rem', color: '#CBD5E1', margin: '0 0 10px', lineHeight: '1.4', minHeight: '32px' }}>
                    {agent.currentTask || 'Nöbet devam ediyor...'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '8px', fontSize: '0.68rem', color: '#64748B' }}>
                    <span>Son Nabız: <strong>{agent.lastHeartbeat}</strong></span>
                    <span>Gecikme: <strong>{agent.metrics.latencyMs}ms</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Hızlı Direktif Gönderme Butonları */}
            <div style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.72rem', color: '#818CF8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                ⚡ Hızlı Yatırım Komitesi Direktifleri:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickDirective('Tüm ajanlar güncel portföy ve risk durumunu raporlasın.')}
                  className="btn btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '0.74rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', color: '#C7D2FE' }}
                >
                  📊 Durum Raporu İste
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDirective('Devre kesici ve risk limitlerini analiz edin.')}
                  className="btn btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '0.74rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#FCA5A5' }}
                >
                  🛡️ Risk & Devre Kesici
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDirective('GVK Geçici 67 vergi kalkanı ve stopaj muafiyetlerini kontrol edin.')}
                  className="btn btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '0.74rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#6EE7B7' }}
                >
                  📜 Vergi Kalkanı Raporu
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDirective('TCMB %37 faiz kararı ve makro piyasa dengesini özetleyin.')}
                  className="btn btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '0.74rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#FCD34D' }}
                >
                  🎙️ Makroekonomi Özeti
                </button>
              </div>
            </div>

            {/* Devre Kesici & Acil Durum Çubuğu */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '12px 16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={18} color={breakerStatus.level === 'HEALTHY' ? '#10B981' : '#EF4444'} />
                <span style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>
                  Devre Kesici Durumu: <strong style={{ color: breakerStatus.level === 'HEALTHY' ? '#10B981' : '#EF4444' }}>{breakerStatus.level}</strong> — {breakerStatus.reason}
                </span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setIsBreakerModalOpen(true)}
                style={{ padding: '6px 14px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Shield size={14} /> Devre Kesici Kapısını İncele
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: AJAN POSTA KUTUSU & DİYALOG AKIŞI */}
        {activeTab === 'dialogue' && (
          <div>
            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', paddingRight: '4px' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748B', padding: '30px' }}>
                  Henüz ajan mesajlaşması bulunmuyor. Aşağıdan bir direktif göndererek 5 ajanın anlık raporunu alabilirsiniz.
                </div>
              ) : (
                messages.map(m => (
                  <div
                    key={m.id}
                    style={{
                      background: m.act === 'alert' ? 'rgba(239, 68, 68, 0.08)' : m.from === 'LEAD_QUANT' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: m.act === 'alert' ? '1px solid rgba(239, 68, 68, 0.25)' : m.from === 'LEAD_QUANT' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '10px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${m.from === 'LEAD_QUANT' ? 'badge-primary' : m.from === 'RISK_BREAKER' ? 'badge-danger' : m.from === 'TAX_HARVESTER' ? 'badge-success' : 'badge-category'}`} style={{ fontSize: '0.65rem' }}>
                          {m.from}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>&rarr; {m.to}</span>
                        <span className="badge badge-category" style={{ fontSize: '0.62rem' }}>{m.act.toUpperCase()}</span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>{m.timestamp}</span>
                    </div>
                    <strong style={{ fontSize: '0.82rem', color: '#FFFFFF', display: 'block', marginBottom: '2px' }}>{m.subject}</strong>
                    <p style={{ fontSize: '0.78rem', color: '#CBD5E1', margin: 0, lineHeight: '1.4' }}>{m.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Mesaj Gönder */}
            <form onSubmit={handleSendBroadcast} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Yatırım komitesi adına tüm ajanlara direktif gönder..."
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                style={{ flex: 1, padding: '8px 14px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#FFFFFF', fontSize: '0.82rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={14} /> Yayınla
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: ARAÇ ŞELALESİ */}
        {activeTab === 'waterfall' && (
          <ToolWaterfall spans={toolSpans} />
        )}

        {/* TAB 4: SEMANTİK HAFIZA (3-REGION MODEL) */}
        {activeTab === 'memory' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.84rem', color: '#C7D2FE', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📌 Sabitlenmiş Kalıcı Gerçekler (Durable Pinned Facts)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {memorySnapshot.pinnedFacts.map((fact, idx) => (
                  <div key={idx} style={{ background: 'rgba(99, 102, 241, 0.06)', borderLeft: '3px solid #6366F1', padding: '8px 12px', borderRadius: '0 6px 6px 0', fontSize: '0.78rem', color: '#CBD5E1' }}>
                    {fact}
                  </div>
                ))}
              </div>
            </div>

            {memorySnapshot.recentObservations.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.84rem', color: '#38BDF8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚡ Canlı Gözlemler (Live Dynamic Observations)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {memorySnapshot.recentObservations.map((obs, idx) => (
                    <div key={idx} style={{ background: 'rgba(56, 189, 248, 0.06)', borderLeft: '3px solid #38BDF8', padding: '8px 12px', borderRadius: '0 6px 6px 0', fontSize: '0.78rem', color: '#CBD5E1', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{obs.topic}:</strong> {obs.content}</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>{obs.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {memorySnapshot.condensedHistory.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.84rem', color: '#FCD34D', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🗜️ Yoğunlaştırılmış Tarihçe (Condensed History)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {memorySnapshot.condensedHistory.map((hist, idx) => (
                    <div key={idx} style={{ background: 'rgba(245, 158, 11, 0.06)', borderLeft: '3px solid #F59E0B', padding: '8px 12px', borderRadius: '0 6px 6px 0', fontSize: '0.78rem', color: '#CBD5E1' }}>
                      {hist}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: KARATAHTA (BLACKBOARD) */}
        {activeTab === 'blackboard' && (
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#10B981', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(blackboard, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
