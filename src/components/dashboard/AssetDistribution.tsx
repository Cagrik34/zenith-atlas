import React from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { formatTRY } from '../../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend);

export const AssetDistribution: React.FC = () => {
  const { funds, cashTL, totalPortfolioValue } = usePortfolio();

  const categoryData = React.useMemo(() => {
    const cats: Record<string, number> = {};

    funds.forEach(f => {
      const cat = f.category || 'Diğer';
      const val = f.shares * f.currentPrice;
      cats[cat] = (cats[cat] || 0) + val;
    });

    if (cashTL > 0) {
      cats['Nakit TL'] = (cats['Nakit TL'] || 0) + cashTL;
    }

    const labels = Object.keys(cats);
    const data = Object.values(cats);

    const colorPalette = [
      '#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#14B8A6', '#F43F5E'
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colorPalette.slice(0, labels.length),
          borderColor: '#0C1021',
          borderWidth: 3
        }
      ]
    };
  }, [funds, cashTL]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#8B92A5',
          font: { family: 'Inter', size: 12 },
          boxWidth: 12,
          padding: 14
        }
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const val = context.raw || 0;
            const pct = totalPortfolioValue > 0 ? ((val / totalPortfolioValue) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${formatTRY(val)} (%${pct})`;
          }
        }
      }
    },
    cutout: '68%'
  };

  return (
    <div className="card distribution-card">
      <div className="card-header">
        <h3 className="card-title">Varlık & Kategori Dağılımı</h3>
      </div>
      <div className="chart-container-donut">
        {totalPortfolioValue > 0 ? (
          <Doughnut data={categoryData} options={options} />
        ) : (
          <div className="empty-state">Varlık bulunamadı.</div>
        )}
      </div>
    </div>
  );
};
