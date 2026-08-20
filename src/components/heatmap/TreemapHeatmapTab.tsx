import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { TreemapNode } from '../../types/quant';
import { SquarifiedTreemapEngine } from '../../engines/SquarifiedTreemapEngine';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatPercent } from '../../utils/formatters';

export const TreemapHeatmapTab: React.FC = () => {
  const { funds } = usePortfolio();
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
          width: Math.max(rect.width - 32, 600),
          height: 520
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const rawNodes: TreemapNode[] = useMemo(() => {
    if (viewMode === 'portfolio') {
      return funds.map(f => ({
        id: f.code,
        code: f.code,
        name: f.name,
        category: f.category,
        value: Math.max(f.shares * f.currentPrice, 100),
        changePct: metricMode === 'daily' ? (f.dailyReturnPct || 0.45) : (f.performance1Y || 65.0)
      }));
    } else if (viewMode === 'bist') {
      // 2026 BIST 100 Ağırlıklı Sektör Hisseleri
      return [
        { id: 'THYAO', code: 'THYAO', name: 'Türk Hava Yolları', category: 'Ulaştırma', value: 380, changePct: 1.45 },
        { id: 'GARAN', code: 'GARAN', name: 'Garanti BBVA', category: 'Bankacılık', value: 340, changePct: -0.85 },
        { id: 'AKBNK', code: 'AKBNK', name: 'Akbank', category: 'Bankacılık', value: 310, changePct: -1.20 },
        { id: 'KCHOL', code: 'KCHOL', name: 'Koç Holding', category: 'Holding', value: 290, changePct: 0.65 },
        { id: 'TUPRS', code: 'TUPRS', name: 'Tüpraş', category: 'Enerji', value: 270, changePct: 0.20 },
        { id: 'ASELS', code: 'ASELS', name: 'Aselsan', category: 'Savunma', value: 250, changePct: 2.10 },
        { id: 'BIMAS', code: 'BIMAS', name: 'BİM Mağazalar', category: 'Perakende', value: 240, changePct: 0.10 },
        { id: 'EREGL', code: 'EREGL', name: 'Ereğli Demir Çelik', category: 'Metal', value: 210, changePct: -0.40 },
        { id: 'ISCTR', code: 'ISCTR', name: 'İş Bankası (C)', category: 'Bankacılık', value: 200, changePct: -0.95 },
        { id: 'SISE', code: 'SISE', name: 'Şişecam', category: 'Cam & Sanayi', value: 180, changePct: 0.35 }
      ];
    } else {
      // TEFAS Öne Çıkan Fonlar
      return [
        { id: 'MAC', code: 'MAC', name: 'Marmara Capital Hisse', category: 'Hisse Senedi', value: 240, changePct: 1.15 },
        { id: 'TI3', code: 'TI3', name: 'İş Portföy BIST Dışı', category: 'Hisse Senedi', value: 210, changePct: 1.85 },
        { id: 'AFT', code: 'AFT', name: 'Ak Portföy Teknoloji', category: 'Fon Sepeti', value: 190, changePct: 0.90 },
        { id: 'KZL', code: 'KZL', name: 'Kuveyt Türk Altın', category: 'Kıymetli Madenler', value: 180, changePct: 0.65 },
        { id: 'IJC', code: 'IJC', name: 'İş Portföy BIST 100', category: 'Hisse Senedi', value: 170, changePct: -0.25 },
        { id: 'AIS', code: 'AIS', name: 'Ak Portföy Para Piyasası', category: 'Para Piyasası', value: 160, changePct: 0.12 },
        { id: 'TP2', code: 'TP2', name: 'Tera Portföy Para Piy.', category: 'Para Piyasası', value: 150, changePct: 0.14 }
      ];
    }
  }, [viewMode, metricMode, funds]);

  // Squarified Yerleşim Hesabı
  const layoutTiles = useMemo(() => {
    return SquarifiedTreemapEngine.layout(rawNodes, containerSize.width, containerSize.height);
  }, [rawNodes, containerSize]);

  // Dinamik HSL Renk Skalası
  const getTileBackground = (changePct: number): string => {
    if (changePct > 0) {
      const intensity = Math.min(Math.abs(changePct) / 3.0, 1.0);
      const lightness = 28 - (intensity * 12);
      return `hsl(158, 85%, ${lightness}%)`; // Yeşil
    } else if (changePct < 0) {
      const intensity = Math.min(Math.abs(changePct) / 3.0, 1.0);
      const lightness = 35 - (intensity * 12);
      return `hsl(0, 75%, ${lightness}%)`; // Kırmızı
    }
    return '#1E293B'; // Nötr Gri
  };

  return (
    <div className="tab-pane active" id="tab-heatmap" ref={containerRef}>
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Squarified Finviz / S&P 500 Stili Finansal Isı Haritası</h2>
          <p className="tab-sub">Varlık büyüklüklerine orantılı kare karolar ve getiri renk skalası.</p>
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
                  transition: 'transform 0.2s ease',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px'
                }}
                title={`${tile.name} (${tile.category}): %${tile.changePct.toFixed(2)}`}
              >
                <span className="treemap-tile-code" style={{ fontSize: isSmall ? '10px' : '13px', fontWeight: 700 }}>
                  {tile.code}
                </span>
                {!isSmall && (
                  <span className="treemap-tile-name" style={{ fontSize: '10px', opacity: 0.85, textAlign: 'center' }}>
                    {tile.name.slice(0, 16)}...
                  </span>
                )}
                <span className="treemap-tile-pct" style={{ fontSize: isSmall ? '9px' : '11px', fontWeight: 600 }}>
                  {formatPercent(tile.changePct)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
