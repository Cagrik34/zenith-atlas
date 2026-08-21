import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { TreemapNode } from '../../types/quant';
import { SquarifiedTreemapEngine } from '../../engines/SquarifiedTreemapEngine';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAgentHive } from '../../context/AgentHiveContext';
import { formatPercent, formatTRY } from '../../utils/formatters';
import { Plus, Sparkles, FolderPlus, Info, Bot, Activity } from 'lucide-react';

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
  const { sendMessage } = useAgentHive();
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
        value: f.shares * f.currentPrice,
        dailyPct: fallback.daily,
        yearlyPct: fallback.yearly
      };
    });
  }, [funds]);

  // 2. TEFAS Liderleri
  const tefasLeadersItems: TreemapItemData[] = useMemo(() => [
    { id: 'TI3', code: 'TI3', name: 'İş Portföy İhracatçı Hisse', category: 'Hisse Senedi Yoğun', value: 12450000000, dailyPct: 1.85, yearlyPct: 118.50 },
    { id: 'MAC', code: 'MAC', name: 'Marmara Capital Hisse', category: 'Hisse Senedi Yoğun', value: 9850000000, dailyPct: 1.15, yearlyPct: 104.80 },
    { id: 'IIH', code: 'IIH', name: 'İstanbul Portföy Üçüncü Hisse', category: 'Hisse Senedi Yoğun', value: 8900000000, dailyPct: 1.40, yearlyPct: 112.40 },
    { id: 'AFT', code: 'AFT', name: 'Ak Portföy Yeni Teknolojiler', category: 'Yabancı Hisse', value: 16800000000, dailyPct: 0.90, yearlyPct: 78.20 },
    { id: 'KZL', code: 'KZL', name: 'Kuveyt Türk Altın Katılım', category: 'Kıymetli Madenler', value: 14200000000, dailyPct: 0.65, yearlyPct: 64.10 },
    { id: 'TP2', code: 'TP2', name: 'Tera Portföy Para Piyasası', category: 'Para Piyasası', value: 24500000000, dailyPct: 0.14, yearlyPct: 55.80 },
    { id: 'IJC', code: 'IJC', name: 'İş Portföy BIST 100 Dışı', category: 'Hisse Senedi Yoğun', value: 6500000000, dailyPct: 0.75, yearlyPct: 92.50 },
    { id: 'AIS', code: 'AIS', name: 'Ak Portföy Para Piyasası', category: 'Para Piyasası', value: 18900000000, dailyPct: 0.12, yearlyPct: 53.40 }
  ], []);

  // 3. BIST 100 Sektörleri
  const bistSectorsItems: TreemapItemData[] = useMemo(() => [
    { id: 'XBANK', code: 'XBANK', name: 'Bankacılık Sektörü', category: 'Finans', value: 385000000000, dailyPct: 1.45, yearlyPct: 94.20 },
    { id: 'XUSIN', code: 'XUSIN', name: 'Sınai İmalat Sektörü', category: 'Sanayi', value: 520000000000, dailyPct: 0.68, yearlyPct: 72.80 },
    { id: 'XHOLD', code: 'XHOLD', name: 'Holding ve Yatırım', category: 'Holding', value: 310000000000, dailyPct: 0.82, yearlyPct: 81.50 },
    { id: 'XULAS', code: 'XULAS', name: 'Ulaştırma & Havacılık', category: 'Ulaştırma', value: 240000000000, dailyPct: -0.35, yearlyPct: 62.40 },
    { id: 'XILTM', code: 'XILTM', name: 'İletişim & Telekom', category: 'Teknoloji', value: 145000000000, dailyPct: 1.10, yearlyPct: 88.90 },
    { id: 'XELKT', code: 'XELKT', name: 'Elektrik & Enerji', category: 'Enerji', value: 195000000000, dailyPct: 0.45, yearlyPct: 58.60 },
    { id: 'XGIDA', code: 'XGIDA', name: 'Gıda ve İçecek', category: 'Tüketim', value: 160000000000, dailyPct: 0.25, yearlyPct: 66.30 },
    { id: 'XGMYO', code: 'XGMYO', name: 'Gayrimenkul Yatırım Ort.', category: 'GYO', value: 110000000000, dailyPct: -0.55, yearlyPct: 49.20 }
  ], []);

  // Aktif Veri Seti
  const activeDataset = useMemo(() => {
    if (viewMode === 'portfolio') return portfolioItems;
    if (viewMode === 'bist') return bistSectorsItems;
    return tefasLeadersItems;
  }, [viewMode, portfolioItems, bistSectorsItems, tefasLeadersItems]);

  // Squarified Treemap Algoritması
  const treemapNodes: TreemapNode[] = useMemo(() => {
    if (activeDataset.length === 0) return [];
    return SquarifiedTreemapEngine.layout(
      activeDataset.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        value: item.value,
        changePct: metricMode === 'daily' ? item.dailyPct : item.yearlyPct
      })),
      containerSize.width,
      containerSize.height
    );
  }, [activeDataset, metricMode, containerSize]);

  // HSL Renk Skalası
  const getNodeColor = (pct: number) => {
    if (pct > 2.0) return '#059669';
    if (pct > 0.5) return '#10B981';
    if (pct >= 0) return '#34D399';
    if (pct > -1.0) return '#F87171';
    return '#DC2626';
  };

  return (
    <div className="tab-pane active" id="tab-heatmap">
      <div className="tab-header-actions">
        <div className="tab-title-block">
          <h2>Squarified Finviz / S&P 500 Stili Finansal Isı Haritası</h2>
          <p className="tab-sub">Varlık büyüklüklerine orantılı kare karolar ve getiri renk skalası.</p>
        </div>

        <div className="toggle-controls-group">
          <span className="badge badge-primary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#A5B4FC', padding: '6px 12px' }}>
            <span>🗺️</span> LeadQuant & SyncSentinel Isı Haritası Motoru
          </span>

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

      <div className="card heatmap-container-card" ref={containerRef}>
        {viewMode === 'portfolio' && funds.length === 0 ? (
          <div style={{ height: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '30px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#818CF8' }}>
              <FolderPlus size={28} />
            </div>
            <h3 style={{ color: '#F1F5F9', fontWeight: '700', fontSize: '1.05rem', marginBottom: '8px' }}>
              Portföy Isı Haritası Boş
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.84rem', maxWidth: '400px', margin: '0 auto 20px', lineHeight: '1.5' }}>
              Portföyünüzde henüz fon bulunmuyor. Diğer sekmeleri inceleyebilir veya örnek portföyü yükleyebilirsiniz.
            </p>
            <button
              className="btn btn-ghost"
              onClick={loadDemoPortfolio}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', color: '#C7D2FE' }}
            >
              <Sparkles size={14} />
              <span>Örnek Portföyü Yükle</span>
            </button>
          </div>
        ) : (
          <div
            className="squarified-treemap-viewport"
            style={{
              position: 'relative',
              width: '100%',
              height: '520px',
              overflow: 'hidden',
              borderRadius: '8px',
              background: '#070A18'
            }}
          >
            {treemapNodes.map(node => {
              const isPos = node.changePct >= 0;
              const x = node.x0 || 0;
              const y = node.y0 || 0;
              const w = Math.max((node.x1 || 0) - x - 2, 0);
              const h = Math.max((node.y1 || 0) - y - 2, 0);
              const color = getNodeColor(node.changePct);

              return (
                <div
                  key={node.id}
                  className="treemap-tile"
                  style={{
                    position: 'absolute',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${w}px`,
                    height: `${h}px`,
                    backgroundColor: color,
                    borderRadius: '6px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
                    transition: 'transform 0.15s ease, filter 0.15s ease'
                  }}
                  title={`${node.code} - ${node.name}\nBüyüklük: ${formatTRY(node.value)}\n${metricMode === 'daily' ? 'Günlük' : '1 Yıllık'}: ${isPos ? '+' : ''}${node.changePct.toFixed(2)}%`}
                >
                  <strong style={{ fontSize: w > 120 ? '1.05rem' : '0.85rem', color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {node.code}
                  </strong>
                  {h > 45 && (
                    <span style={{ fontSize: w > 120 ? '0.82rem' : '0.72rem', fontWeight: 700, color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      {isPos ? '+' : ''}{node.changePct.toFixed(2)}%
                    </span>
                  )}
                  {w > 130 && h > 75 && (
                    <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                      {node.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
