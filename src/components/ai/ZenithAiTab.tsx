import React, { useState, useRef, useEffect } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { ZenithAiEngine, type AiResponse } from '../../engines/ZenithAiEngine';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Bot, Send, Sparkles, ShieldCheck, Zap, ArrowRight, HelpCircle } from 'lucide-react';

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
    scrollToBottom();
  }, [messages, isTyping]);

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

      setIsTyping(false);
      setMessages(prev => [...prev, aiMsg]);
    }, 450);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    processQuery(inputQuery);
  };

  const handlePromptClick = (prompt: string) => {
    processQuery(prompt);
  };

  return (
    <div className="tab-pane active" id="tab-zenith-ai">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Zenith Intelligence — Portföy Copilot & Finansal AI</h2>
          <p className="tab-sub">Fama-French, Black-Litterman ve 2026 mevzuat kurallarına dayalı yapay zeka asistanı.</p>
        </div>
      </div>

      <div className="ai-chat-card card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '640px' }}>
        {/* Chat Header */}
        <div className="ai-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Bot size={18} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#FFFFFF' }}>Zenith Finansal Zeka Motoru</div>
              <div style={{ fontSize: '0.72rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                Aktif ve Bağlı (Portföy & Canlı TEFAS Veritabanı)
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', color: '#A5B4FC', padding: '3px 8px', borderRadius: '6px' }}>
            🔒 %100 İstemci İçi Gizlilik
          </span>
        </div>

        {/* Messages List */}
        <div className="ai-messages-container" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map(msg => (
            <div key={msg.id} className={`ai-message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`} style={{ display: 'flex', gap: '12px', maxWidth: msg.sender === 'user' ? '80%' : '90%', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
              <div className="message-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: msg.sender === 'user' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                {msg.sender === 'ai' ? <Bot size={16} color="#A5B4FC" /> : '👤'}
              </div>

              <div className="message-bubble" style={{ background: msg.sender === 'user' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25))' : 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px 18px', color: '#F1F3F9', fontSize: '0.84rem', lineHeight: '1.6' }}>
                {msg.responseObj && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontWeight: '700', color: '#C7D2FE', fontSize: '0.88rem' }}>{msg.responseObj.title}</span>
                    {msg.responseObj.badge && (
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#A5B4FC', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        {msg.responseObj.badge}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>

                {msg.responseObj?.metrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    {msg.responseObj.metrics.map(m => (
                      <div key={m.label} style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{m.label}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#FFFFFF', fontFamily: 'monospace' }}>{m.value}</div>
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
    </div>
  );
};
