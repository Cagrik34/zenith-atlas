import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatTRY, formatPercent } from '../../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AssetDistributionProps {
  onNavigateFunds?: () => void;
}

export const AssetDistribution: React.FC<AssetDistributionProps> = ({ onNavigateFunds }) => {
  const { funds, cashTL, totalPortfolioValue } = usePortfolio();

  // Kategori Dağılımı
  const distribution = React.useMemo(() => {
    const map: Record<string, number> = {};
    funds.forEach(f => {
      const val = f.shares * f.currentPrice;
      map[f.category] = (map[f.category] || 0) + val;
    });
    if (cashTL > 0) {
      map['Nakit TL'] = (map['Nakit TL'] || 0) + cashTL;
    }
    return map;
  }, [funds, cashTL]);

  const categories = Object.keys(distribution);
  const values = Object.values(distribution);

  const colors = [
    '#6366F1', // Indigo (Para Piyasası)
    '#8B5CF6', // Purple (Fon Sepeti)
    '#EC4899', // Pink (Hisse Senedi)
    '#06B6D4', // Cyan (Kıymetli Madenler)
    '#10B981', // Emerald (Nakit)
    '#F59E0B', // Amber
    '#3B82F6', // Blue
  ];

  const chartData = {
    labels: categories,
    datasets: [
      {
        data: values,
        backgroundColor: colors.slice(0, categories.length),
        borderColor: '#060913',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#8B92A5',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
            weight: 500,
          },
          padding: 14,
          usePointStyle: true,
          pointStyle: 'rectRounded',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(12, 16, 33, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        titleColor: '#FFFFFF',
        bodyColor: '#CBD5E1',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = totalPortfolioValue > 0 ? ((val / totalPortfolioValue) * 100).toFixed(1) : '0';
            return ` ${context.label}: ${formatTRY(val)} (%${pct})`;
          },
        },
      },
    },
  };

  return (
    <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px', marginBottom: '24px' }}>
      {/* 1. SOL: Varlık & Kategori Dağılımı Donut */}
      <div className="card chart-card">
        <div className="card-header">
          <h3>Varlık & Kategori Dağılımı</h3>
        </div>
        <div className="chart-container" style={{ position: 'relative', height: '280px' }}>
          <Doughnut data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* 2. SAĞ: Portföy Varlık Özeti Tablosu */}
      <div className="card">
        <div className="card-header">
          <h3>Portföy Varlık Özeti</h3>
          {onNavigateFunds && (
            <button className="btn-text" onClick={onNavigateFunds}>
              Tümünü Yönet &rarr;
            </button>
          )}
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>FON</th>
                <th>KATEGORİ</th>
                <th>ADET</th>
                <th>GÜNCEL FİYAT</th>
                <th>TOPLAM DEĞER</th>
                <th>KÂR / ZARAR</th>
              </tr>
            </thead>
            <tbody>
              {funds.map((f) => {
                const totalVal = f.shares * f.currentPrice;
                const costVal = f.shares * f.costPrice;
                const plTRY = totalVal - costVal;
                const plPct = costVal > 0 ? (plTRY / costVal) * 100 : 0;
                const isPos = plTRY >= 0;

                return (
                  <tr key={f.code}>
                    <td>
                      <div className="fund-cell">
                        <span className="fund-code-badge">{f.code}</span>
                        <span className="fund-name-text">{f.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-category">{f.category}</span>
                    </td>
                    <td>{f.shares.toLocaleString('tr-TR')}</td>
                    <td>{f.currentPrice.toFixed(4)} TL</td>
                    <td className="font-semibold">{formatTRY(totalVal)}</td>
                    <td className={isPos ? 'text-pos font-semibold' : 'text-neg font-semibold'}>
                      {isPos ? '+' : ''}{formatTRY(plTRY)} ({isPos ? '+' : ''}{formatPercent(plPct)})
                    </td>
                  </tr>
                );
              })}

              {cashTL > 0 && (
                <tr>
                  <td>
                    <div className="fund-cell">
                      <span className="fund-code-badge badge-cash">NAKİT</span>
                      <span className="fund-name-text">TL Nakit & Likit Bakiye</span>
                    </div>
                  </td>
                  <td><span className="badge-category">Likit Varlık</span></td>
                  <td>-</td>
                  <td>1.0000 TL</td>
                  <td className="font-semibold">{formatTRY(cashTL)}</td>
                  <td className="text-secondary">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
