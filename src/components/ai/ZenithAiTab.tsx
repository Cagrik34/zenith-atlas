import React, { useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { FactorAttributionEngine } from '../../engines/FactorAttributionEngine';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { Bot, Send, Sparkles, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const ZenithAiTab: React.FC = () => {
  const { funds, cashTL, totalPortfolioValue } = usePortfolio();
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const ff = FactorAttributionEngine.calculate(funds);
    return [
      {
        id: 'msg-1',
        sender: 'ai',
        text: `Merhaba! Ben Zenith Intelligence Finansal Portföy Yapay Zekası.

Mevcut portföyünüzün toplam büyüklüğü **${formatTRY(totalPortfolioValue)}** seviyesindedir. Fama-French faktör analizine göre portföyünüz yıllıklaştırılmış **+${formatPercent(ff.jensensAlpha)}** alfa getirisi üretmektedir.

Bana portföyünüzün risk durumu, döviz şoklarına dayanıklılığı, stopaj muafiyetleri veya yeniden dengeleme stratejileri hakkında sorular sorabilirsiniz.`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: inputQuery.trim(),
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');

    // Akıllı Yanıt Üretici
    setTimeout(() => {
      let reply = '';
      const q = userMsg.text.toLowerCase();

      if (q.includes('stopaj') || q.includes('vergi')) {
        reply = `📜 **2026 Stopaj & Vergi Analizi:**
Portföyünüzdeki BIST Hisse Senedi yoğun fonlar (MAC, IJC vb. en az %80 hisse) **193 sayılı GVK Geçici 67. Madde** kapsamında **%0 Stopaj (Tam Muafiyet)** kalkanına sahiptir.

Para piyasası, altın ve fon sepeti fonlarında standart **%17,50 stopaj** uygulanmaktadır. HIFO (Highest-In, First-Out) vergi kayıp hasadı motorumuz zarardaki lotlarınızı otomatik olarak tespit etmektedir.`;
      } else if (q.includes('dolar') || q.includes('kur') || q.includes('döviz')) {
        reply = `💵 **Döviz Kuru & Devalüasyon Duyarlılığı:**
Portföyünüzdeki **AFT (Teknoloji)** ve **KZL (Altın)** fonları doğrudan USD/TRY paritesine pozitif duyarlıdır. Dolar kurundaki %10'luk bir yükseliş bu iki varlığın toplam TL değerini anında yukarı taşır. Para piyasası fonları (AIS, TP2) ise faiz kalkanı sağlar.`;
      } else if (q.includes('risk') || q.includes('sharpe') || q.includes('alfa')) {
        const ff = FactorAttributionEngine.calculate(funds);
        reply = `📊 **Kantitatif Risk Raporu:**
* **Jensen's Alpha:** +%${ff.jensensAlpha} / Yıl
* **Piyasa Betası (β):** ${ff.marketBeta}x
* **Açıklayıcılık (R²):** %${ff.rSquared}
* **Aktif Pay (Active Share):** %${ff.activeShare}

Portföyünüz piyasaya göre kontrollü bir beta seviyesinde olup, yüksek kaliteli aktif getiri sağlamaktadır.`;
      } else {
        reply = `🎯 **Zenith AI Portföy Tavsiyesi:**
TCMB'nin %37.00 politika faizi ortamında net pozitif reel faiz devam ederken; BIST hisse fonları (%0 stopaj), küresel teknoloji (AFT) ve altın (KZL) dengesi portföyünüzün Sharpe rasyosunu optimize etmektedir. Düzenli aralıklarla Black-Litterman sekmesinden ağırlıklarınızı kontrol etmenizi öneririm.`;
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    }, 600);
  };

  return (
    <div className="tab-pane active" id="tab-zenith-ai">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Zenith Intelligence — Portföy Copilot & Finansal AI</h2>
          <p className="tab-sub">Fama-French, Black-Litterman ve 2026 mevzuat kurallarına dayalı yapay zeka asistanı.</p>
        </div>
      </div>

      <div className="ai-chat-card card">
        <div className="ai-messages-container">
          {messages.map(msg => (
            <div key={msg.id} className={`ai-message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}>
              <div className="message-avatar">
                {msg.sender === 'ai' ? <Bot size={18} /> : '👤'}
              </div>
              <div className="message-bubble">
                <div className="message-content" style={{ whiteSpace: 'pre-line' }}>
                  {msg.text}
                </div>
                <span className="message-time">{msg.timestamp}</span>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="ai-input-form">
          <div className="ai-input-wrapper">
            <input
              type="text"
              className="ai-input"
              placeholder="Portföyünüz, stopaj muafiyetleri veya piyasa analizi hakkında bir soru sorun..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary ai-send-btn">
              <Send size={16} />
              <span>Gönder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
