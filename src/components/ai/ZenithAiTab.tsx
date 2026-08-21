import React, { useState, useRef, useEffect } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { ZenithAiEngine, type AiResponse } from '../../engines/ZenithAiEngine';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Bot, Send, Sparkles, ShieldCheck, Zap, ArrowRight, HelpCircle, Activity } from 'lucide-react';
import { AgentHivePanel } from '../hive/AgentHivePanel';
import { CircuitBreakerModal } from '../hive/CircuitBreakerModal';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  responseObj?: AiResponse;
  timestamp: string;
}

export const ZenithAiTab: React.FC = () => {
  const { funds, cashTL, totalPortfolioValue, officialTefasDate } = usePortfolio();
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'hive'>('hive');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-1',
        sender: 'ai',
        text: `Merhaba! Ben **Zenith Intelligence** Kurumsal Portföy Yapay Zekası.

Mevcut portföyünüzün toplam büyüklüğü **${formatTRY(totalPortfolioValue)}** seviyesindedir. Fama-French ve Black-Litterman kantitatif modelleriyle portföyünüzün tüm dinamiklerini anlık olarak analiz edebilirim.

Bana **"Stopaj nedir?"**, **"Hangi fonlarım vergiden muaf?"**, **"Dolar yükselirse ne olur?"** veya **"Portföy risk analizi"** gibi aklınıza gelen her türlü soruyu sorabilirsiniz.`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (viewMode === 'chat') {
      scrollToBottom();
    }
  }, [messages, isTyping, viewMode]);

  const processQuery = (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = ZenithAiEngine.generateResponse(
        queryText,
        funds,
        cashTL,
        totalPortfolioValue,
        officialTefasDate
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponse.content,
        responseObj: aiResponse,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 400);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    processQuery(inputQuery);
  };

  const handlePromptClick = (promptText: string) => {
    processQuery(promptText);
  };

  return (
    <div className="tab-pane active" id="tab-zenith-ai">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Zenith Intelligence & Otonom Ajan Masası (Hive)</h2>
          <p className="tab-sub">Fama-French kantitatif zeka motoru, 5 otonom nöbetçi ajan ve finansal devre kesici.</p>
        </div>

        <div className="toggle-group">
          <button
            className={`toggle-btn ${viewMode === 'hive' ? 'active' : ''}`}
            onClick={() => setViewMode('hive')}
          >
            <Activity size={14} />
            <span>Ajan Masası (Quant Hive)</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'chat' ? 'active' : ''}`}
            onClick={() => setViewMode('chat')}
          >
            <Bot size={14} />
            <span>AI Asistanı (Sohbet)</span>
          </button>
        </div>
      </div>

      {viewMode === 'hive' ? (
        <AgentHivePanel />
      ) : (
        <div className="card ai-chat-container" style={{ display: 'flex', flexDirection: 'column', height: '620px', padding: 0, overflow: 'hidden' }}>
          {/* Messages Viewport */}
          <div className="ai-messages-list" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div className="bubble-content" style={{ background: msg.sender === 'user' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)', border: msg.sender === 'user' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px 18px', color: '#FFFFFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.75rem', color: msg.sender === 'user' ? '#A5B4FC' : '#818CF8', fontWeight: 600 }}>
                    {msg.sender === 'user' ? <span>👤 Portföy Yöneticisi</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={12} /> Zenith Intelligence</span>}
                  </div>

                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#CBD5E1' }}>
                    {msg.text}
                  </div>

                  {msg.responseObj?.metrics && msg.responseObj.metrics.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      {msg.responseObj.metrics.map((km: { label: string; value: string }, idx: number) => (
                        <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <span style={{ fontSize: '0.65rem', color: '#94A3B8', display: 'block' }}>{km.label}</span>
                          <strong style={{ fontSize: '0.82rem', color: '#FFFFFF' }}>{km.value}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.responseObj?.suggestedPrompts && (
                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#818CF8', fontWeight: '600', marginBottom: '6px' }}>Önerilen Takip Soruları:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {msg.responseObj.suggestedPrompts.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePromptClick(p)}
                            style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.72rem', color: '#C7D2FE', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>{p}</span>
                            <ArrowRight size={10} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '8px', textAlign: 'right' }}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#818CF8', fontSize: '0.8rem', padding: '8px 12px' }}>
                <Bot size={16} />
                <span>Zenith Intelligence yanıt hazırlıyor...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} style={{ padding: '14px 18px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              className="ai-chat-input"
              style={{ flex: 1, padding: '10px 16px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#FFFFFF', fontSize: '0.85rem' }}
              placeholder="Portföyünüz, stopaj muafiyetleri, Sharpe oranı veya piyasa analizi hakkında bir soru sorun..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} />
              <span>Gönder</span>
            </button>
          </form>
        </div>
      )}

      {/* HITL Devre Kesici Modalı */}
      <CircuitBreakerModal />
    </div>
  );
};
