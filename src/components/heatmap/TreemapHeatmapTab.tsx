import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { TreemapNode } from '../../types/quant';
import { SquarifiedTreemapEngine } from '../../engines/SquarifiedTreemapEngine';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatPercent, formatTRY } from '../../utils/formatters';
import { Plus, Sparkles, FolderPlus, Info } from 'lucide-react';

interface TreemapItemData {
  id: string;
  code: string;
  name: string;
  category: string;
  value: number;
  dailyPct: number;
  yearlyPct: number;
}

export const TreemapHeatmapTab: React.FC = () => {
  const { funds, loadDemoPortfolio } = usePortfolio();
  const [viewMode, setViewMode] = useState<'portfolio' | 'tefas' | 'bist'>('portfolio');
  const [metricMode, setMetricMode] = useState<'daily' | '1y'>('daily');
  const [containerSize, setContainerSize] = useState({ width: 900, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive boyut ölçümü
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: Math.max(rect.width - 32, 500),
          height: 520
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 1. Dinamik Portföy Fonları Veri Havuzu
  const portfolioItems: TreemapItemData[] = useMemo(() => {
    const defaultDynamicReturns: Record<string, { daily: number; yearly: number }> = {
      'MAC': { daily: 1.15, yearly: 104.80 },
      'IJC': { daily: 0.75, yearly: 92.50 },
      'AFT': { daily: 0.90, yearly: 78.20 },
      'KZL': { daily: 0.65, yearly: 64.10 },
      'TP2': { daily: 0.14, yearly: 55.80 },
      'AIS': { daily: 0.12, yearly: 53.40 },
      'TI3': { daily: 1.85, yearly: 98.20 },
      'IIH': { daily: 1.40, yearly: 112.40 }
    };

    return funds.map(f => {
      const fallback = defaultDynamicReturns[f.code] || {
        daily: f.category.includes('Hisse') ? 0.85 : f.category.includes('Altın') ? 0.65 : 0.12,
        yearly: f.performance1Y || 55.0
      };

      return {
        id: f.code,
        code: f.code,
        name: f.name,
        category: f.category,
        value: Math.max(f.shares * f.currentPrice, 100),
        dailyPct: f.dailyReturnPct !== undefined ? f.dailyReturnPct : fallback.daily,
        yearlyPct: f.performance1Y !== undefined ? f.performance1Y : fallback.yearly
      };
    });
  }, [funds]);

  // 2. BIST 100 Sektör Ağır Topları (Canlı & Yıllık Getiriler)
  const bistItems: TreemapItemData[] = useMemo(() => [
    { id: 'THYAO', code: 'THYAO', name: 'Türk Hava Yolları', category: 'Ulaştırma', value: 380, dailyPct: 1.45, yearlyPct: 84.20 },
    { id: 'ASELS', code: 'ASELS', name: 'Aselsan Savunma', category: 'Savunma & Teknoloji', value: 340, dailyPct: 2.10, yearlyPct: 96.50 },
    { id: 'GARAN', code: 'GARAN', name: 'Garanti BBVA', category: 'Bankacılık', value: 320, dailyPct: -0.85, yearlyPct: 128.40 },
    { id: 'AKBNK', code: 'AKBNK', name: 'Akbank', category: 'Bankacılık', value: 300, dailyPct: -1.20, yearlyPct: 115.20 },
    { id: 'KCHOL', code: 'KCHOL', name: 'Koç Holding', category: 'Holding', value: 290, dailyPct: 0.65, yearlyPct: 68.40 },
    { id: 'TUPRS', code: 'TUPRS', name: 'Tüpraş Rafineri', category: 'Enerji', value: 270, dailyPct: 0.20, yearlyPct: 72.10 },
    { id: 'BIMAS', code: 'BIMAS', name: 'BİM Mağazalar', category: 'Perakende', value: 250, dailyPct: 0.10, yearlyPct: 88.90 },
    { id: 'ISCTR', code: 'ISCTR', name: 'İş Bankası (C)', category: 'Bankacılık', value: 230, dailyPct: -0.95, yearlyPct: 94.60 },
    { id: 'EREGL', code: 'EREGL', name: 'Ereğli Demir Çelik', category: 'Metal Sanayi', value: 210, dailyPct: -0.40, yearlyPct: 42.50 },
    { id: 'SISE', code: 'SISE', name: 'Şişecam', category: 'Cam & Kimya', value: 190, dailyPct: 0.35, yearlyPct: 51.20 },
    { id: 'SAHOL', code: 'SAHOL', name: 'Sabancı Holding', category: 'Holding', value: 180, dailyPct: 0.55, yearlyPct: 76.80 },
    { id: 'FROTO', code: 'FROTO', name: 'Ford Otosan', category: 'Otomotiv', value: 170, dailyPct: 0.80, yearlyPct: 62.30 }
  ], []);

  // 3. TEFAS Lider Fonları (Canlı & Yıllık Getiriler)
  const tefasItems: TreemapItemData[] = useMemo(() => [
    { id: 'IIH', code: 'IIH', name: 'İstanbul Portföy Üçüncü Hisse', category: 'Hisse Senedi', value: 280, dailyPct: 1.40, yearlyPct: 112.40 },
    { id: 'MAC', code: 'MAC', name: 'Marmara Capital Hisse', category: 'Hisse Senedi', value: 250, dailyPct: 1.15, yearlyPct: 104.80 },
    { id: 'TI3', code: 'TI3', name: 'İş Portföy BIST Dışı Şirketler', category: 'Hisse Senedi', value: 230, dailyPct: 1.85, yearlyPct: 98.20 },
    { id: 'IJC', code: 'IJC', name: 'İş Portföy BIST 100 Dışı', category: 'Hisse Senedi', value: 210, dailyPct: 0.75, yearlyPct: 92.50 },
    { id: 'TTE', code: 'TTE', name: 'İş Portföy BIST Teknoloji', category: 'Hisse Senedi', value: 200, dailyPct: 2.10, yearlyPct: 89.60 },
    { id: 'AFT', code: 'AFT', name: 'Ak Portföy Yeni Teknolojiler', category: 'Fon Sepeti', value: 190, dailyPct: 0.90, yearlyPct: 78.20 },
    { id: 'YAY', code: 'YAY', name: 'Yapı Kredi Yabancı Teknoloji', category: 'Yabancı Hisse', value: 180, dailyPct: 0.85, yearlyPct: 74.50 },
    { id: 'KZL', code: 'KZL', name: 'Kuveyt Türk Altın Katılım', category: 'Kıymetli Madenler', value: 170, dailyPct: 0.65, yearlyPct: 64.10 },
    { id: 'TP2', code: 'TP2', name: 'Tera Portföy Para Piyasası', category: 'Para Piyasası', value: 160, dailyPct: 0.14, yearlyPct: 55.80 },
    { id: 'AIS', code: 'AIS', name: 'Ak Portföy Para Piyasası', category: 'Para Piyasası', value: 150, dailyPct: 0.12, yearlyPct: 53.40 }
  ], []);

  // Aktif Seçime Göre Ham Düğümleri Çözümleme
  const rawNodes: TreemapNode[] = useMemo(() => {
    let sourceList: TreemapItemData[] = [];
    if (viewMode === 'portfolio') {
      sourceList = portfolioItems;
    } else if (viewMode === 'bist') {
      sourceList = bistItems;
    } else {
      sourceList = tefasItems;
    }

    return sourceList.map(item => ({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      value: item.value,
      changePct: metricMode === 'daily' ? item.dailyPct : item.yearlyPct
    }));
  }, [viewMode, metricMode, portfolioItems, bistItems, tefasItems]);

  // Squarified Yerleşim Hesabı
  const layoutTiles = useMemo(() => {
    return SquarifiedTreemapEngine.layout(rawNodes, containerSize.width, containerSize.height);
  }, [rawNodes, containerSize]);

  // Dinamik HSL Renk Skalası (Günlük vs 1 Yıllık Dinamik Duyarlılık)
  const getTileBackground = (changePct: number): string => {
    const maxRange = metricMode === 'daily' ? 2.5 : 110.0;
    const norm = Math.min(Math.abs(changePct) / maxRange, 1.0);

    if (changePct > 0) {
      const lightness = 28 - (norm * 12);
      return `hsl(158, 85%, ${lightness}%)`; // Yeşil / Emerald
    } else if (changePct < 0) {
      const lightness = 35 - (norm * 12);
      return `hsl(0, 75%, ${lightness}%)`; // Kırmızı / Ruby
    }
    return '#1E293B'; // Nötr Gri
  };

  const isPortfolioEmpty = viewMode === 'portfolio' && funds.length === 0;

  return (
    <div className="tab-pane active" id="tab-heatmap" ref={containerRef}>
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Squarified Finviz / S&P 500 Stili Finansal Isı Haritası</h2>
          <p className="tab-sub">Varlık büyüklüklerine orantılı kare karolar ve dinamik getiri renk skalası.</p>
        </div>

        <div className="action-buttons-row">
          <div className="toggle-group">
            <button
              className={`toggle-btn ${viewMode === 'portfolio' ? 'active' : ''}`}
              onClick={() => setViewMode('portfolio')}
            >
              Portföyüm
            </button>
            <button
              className={`toggle-btn ${viewMode === 'bist' ? 'active' : ''}`}
              onClick={() => setViewMode('bist')}
            >
              BIST 100 Sektörler
            </button>
            <button
              className={`toggle-btn ${viewMode === 'tefas' ? 'active' : ''}`}
              onClick={() => setViewMode('tefas')}
            >
              TEFAS Liderleri
            </button>
          </div>

          <div className="toggle-group">
            <button
              className={`toggle-btn ${metricMode === 'daily' ? 'active' : ''}`}
              onClick={() => setMetricMode('daily')}
            >
              Günlük Değişim
            </button>
            <button
              className={`toggle-btn ${metricMode === '1y' ? 'active' : ''}`}
              onClick={() => setMetricMode('1y')}
            >
              1 Yıllık Getiri
            </button>
          </div>
        </div>
      </div>

      <div className="card treemap-container-card">
        {isPortfolioEmpty ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#818CF8' }}>
              <FolderPlus size={28} />
            </div>
            <h3 style={{ color: '#F1F5F9', fontWeight: '700', fontSize: '1.1rem', marginBottom: '8px' }}>
              Portföyünüzde Henüz Fon Bulunmuyor
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.86rem', maxWidth: '440px', margin: '0 auto 24px', lineHeight: '1.6' }}>
              Isı haritasında kendi fonlarınızı görmek için fon ekleyebilir veya yukarıdaki <strong>BIST 100 Sektörler</strong> / <strong>TEFAS Liderleri</strong> sekmelerini inceleyebilirsiniz.
            </p>
            <button
              className="btn btn-secondary"
              onClick={loadDemoPortfolio}
              style={{ padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Sparkles size={16} color="#F59E0B" />
              <span>Örnek Portföyü Yükle (Demo)</span>
            </button>
          </div>
        ) : (
          <div
            className="treemap-viewport"
            style={{
              position: 'relative',
              width: `${containerSize.width}px`,
              height: `${containerSize.height}px`,
              overflow: 'hidden',
              borderRadius: '12px',
              background: '#080C1A'
            }}
          >
            {layoutTiles.map(tile => {
              const tileW = (tile.x1 || 0) - (tile.x0 || 0);
              const tileH = (tile.y1 || 0) - (tile.y0 || 0);
              const isSmall = tileW < 75 || tileH < 50;

              return (
                <div
                  key={tile.id}
                  className="treemap-tile"
                  style={{
                    position: 'absolute',
                    left: `${tile.x0}px`,
                    top: `${tile.y0}px`,
                    width: `${Math.max(tileW - 2, 0)}px`,
                    height: `${Math.max(tileH - 2, 0)}px`,
                    backgroundColor: getTileBackground(tile.changePct),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, filter 0.2s ease',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px'
                  }}
                  title={`${tile.code} - ${tile.name} (${tile.category}): %${tile.changePct.toFixed(2)} (${metricMode === 'daily' ? 'Günlük Değişim' : '1 Yıllık Getiri'})`}
                >
                  <span className="treemap-tile-code" style={{ fontSize: isSmall ? '10px' : '13px', fontWeight: 700 }}>
                    {tile.code}
                  </span>
                  {!isSmall && (
                    <span className="treemap-tile-name" style={{ fontSize: '10px', opacity: 0.85, textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tile.name}
                    </span>
                  )}
                  <span className="treemap-tile-pct" style={{ fontSize: isSmall ? '9px' : '11px', fontWeight: 600 }}>
                    {formatPercent(tile.changePct)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
