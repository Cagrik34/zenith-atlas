import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { usePortfolio } from '../../context/PortfolioContext';
import { formatTRY, formatPercent } from '../../utils/formatters';
import { PieChart } from 'lucide-react';

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
    <div className="card chart-card">
      <div className="card-header">
        <h3 className="card-title">Varlık & Kategori Dağılımı</h3>
      </div>
      <div className="chart-container" style={{ position: 'relative', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <PieChart size={32} opacity={0.4} />
            <span style={{ fontSize: '0.8rem' }}>Varlık veya Nakit Bulunmuyor</span>
          </div>
        ) : (
          <Doughnut data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
};
