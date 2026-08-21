import React from 'react';
import { LayoutDashboard, Briefcase, Search, Cpu, Bot, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenMenu
}) => {
  const navButtons = [
    { id: 'dashboard', label: 'Özet', icon: LayoutDashboard },
    { id: 'funds', label: 'Fonlar', icon: Briefcase },
    { id: 'add-fund', label: 'Arama', icon: Search },
    { id: 'quant', label: 'Quant', icon: Cpu },
    { id: 'zenith-ai', label: 'AI Hive', icon: Bot },
  ];

  return (
    <nav className="mobile-bottom-dock" aria-label="Mobil Hızlı Navigasyon">
      <div className="mobile-dock-inner">
        {navButtons.map((btn) => {
          const Icon = btn.icon;
          const isActive = activeTab === btn.id;

          return (
            <button
              key={btn.id}
              className={`mobile-dock-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(btn.id)}
            >
              <div className="mobile-dock-icon-wrap">
                <Icon size={18} />
                {isActive && <div className="mobile-dock-glow" />}
              </div>
              <span className="mobile-dock-label">{btn.label}</span>
            </button>
          );
        })}

        <button
          className="mobile-dock-btn mobile-dock-menu-btn"
          onClick={onOpenMenu}
        >
          <div className="mobile-dock-icon-wrap">
            <Menu size={18} />
          </div>
          <span className="mobile-dock-label">Menü</span>
        </button>
      </div>
    </nav>
  );
};
