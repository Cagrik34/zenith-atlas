import React, { useState, useEffect } from 'react';
import type { MacroNewsData, MacroBulletin } from '../../types/news';
import { ExternalLink, Flame, ShieldAlert, BookOpen } from 'lucide-react';

export const MacroNewsStrip: React.FC = () => {
  const [newsData, setNewsData] = useState<MacroNewsData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        let res = await fetch('/data/news.json?t=' + Date.now());
        if (!res.ok) res = await fetch('src/data/news.json?t=' + Date.now());
        if (res && res.ok) {
          const data: MacroNewsData = await res.json();
          setNewsData(data);
        }
      } catch (e) {
        console.warn('News load error:', e);
      }
    };
    fetchNews();
  }, []);

  const policy = newsData?.policyIndicators || {
    tcmbPolicyRate: { name: 'TCMB Politika Faizi', rate: 37.0, source: 'TCMB', sourceUrl: 'https://www.tcmb.gov.tr' },
    tuikInflation: { name: 'TÜİK Yıllık TÜFE', rate: 31.75, source: 'TÜİK', sourceUrl: 'https://www.tuik.gov.tr' },
    realInterestRate: { name: 'Net Reel Faiz', rate: 5.25, source: 'TCMB/TÜİK', sourceUrl: 'https://www.tcmb.gov.tr' }
  };

  const bulletins = React.useMemo(() => {
    if (!newsData?.bulletins) return [];
    if (activeCategory === 'all') return newsData.bulletins;
    return newsData.bulletins.filter(b => b.category === activeCategory);
  }, [newsData, activeCategory]);

  return (
    <div className="macro-news-section card">
      <div className="macro-news-header">
        <div className="macro-news-title">
          <span className="macro-icon">📢</span>
          <h3>Öne Çıkan Gelişmeler & Makroekonomi Bülteni</h3>
          <span className="macro-sync-badge">
            <span className="dot"></span>Resmi Kurum Senkronizasyonu
          </span>
        </div>

        {/* Gösterge Şeridi */}
        <div className="macro-indicators-strip">
          <a
            href={policy.tcmbPolicyRate?.sourceUrl || 'https://www.tcmb.gov.tr'}
            target="_blank"
            rel="noopener noreferrer"
            className="policy-indicator-chip"
            title="TCMB Resmi PPK Kararı Sayfasına Git"
          >
            <span className="chip-label">🏛 TCMB Politika Faizi:</span>
            <span className="chip-val">%{policy.tcmbPolicyRate?.rate?.toFixed(2) || '37.00'}</span>
            <ExternalLink size={12} className="chip-arrow" />
          </a>

          <a
            href={policy.tuikInflation?.sourceUrl || 'https://www.tuik.gov.tr'}
            target="_blank"
            rel="noopener noreferrer"
            className="policy-indicator-chip"
            title="TÜİK Resmi Enflasyon Bülteni Sayfasına Git"
          >
            <span className="chip-label">📊 TÜİK Yıllık TÜFE:</span>
            <span className="chip-val">%{policy.tuikInflation?.rate?.toFixed(2) || '31.75'}</span>
            <ExternalLink size={12} className="chip-arrow" />
          </a>

          <a
            href="https://www.tcmb.gov.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="policy-indicator-chip"
            title="Pozitif Net Reel Getiri Kalkanı"
          >
            <span className="chip-label">⚡ Net Reel Faiz:</span>
            <span className="chip-val text-pos">+%{policy.realInterestRate?.rate?.toFixed(2) || '5.25'}</span>
            <ExternalLink size={12} className="chip-arrow" />
          </a>

          <a
            href="https://www.resmigazete.gov.tr"
            target="_blank"
            rel="noopener noreferrer"
            className="policy-indicator-chip"
            title="2026 Gelir Vergisi Fon Stopaj Düzenlemesi"
          >
            <span className="chip-label">📜 Fon Stopajı:</span>
            <span className="chip-val">%17.5 / %0 (BIST)</span>
            <ExternalLink size={12} className="chip-arrow" />
          </a>
        </div>
      </div>

      {/* Kategori Filtreleri */}
      <div className="macro-filter-tabs">
        {[
          { id: 'all', label: 'Tüm Gelişmeler' },
          { id: 'tcmb', label: 'TCMB & Faiz' },
          { id: 'spk', label: 'SPK & Vergi' },
          { id: 'kap', label: 'KAP & BIST' },
          { id: 'global', label: 'Küresel Makro' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`macro-tab-btn ${activeCategory === tab.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bülten Kartları Izgarası */}
      <div className="macro-news-grid">
        {bulletins.map(b => (
          <div key={b.id} className="macro-card">
            <div className="macro-card-header">
              <span className={`macro-badge ${b.badge}`}>{b.categoryLabel}</span>
              <span className="macro-date">{b.date}</span>
            </div>
            <h4 className="macro-card-title">{b.title}</h4>
            <p className="macro-card-summary">{b.summary}</p>
            <div className="macro-card-footer">
              <a
                href={b.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="macro-source-link"
              >
                <span>{b.source}</span>
                <ExternalLink size={12} />
              </a>
              <span className={`impact-badge impact-${b.impact}`}>{b.impactLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
