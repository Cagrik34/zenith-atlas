# 🏛️ Zenith Atlas — High-Performance Quantitative Analytics Terminal

> Open-source, high-performance TEFAS mutual funds analytics, multi-asset portfolio management & quantitative strategy engine running 100% client-side.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React 19](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8_Strict-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite 6](https://img.shields.io/badge/Vite-6.x-646cff.svg)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-orange.svg)](https://web.dev/progressive-web-apps/)

[🇹🇷 Türkçe Dokümantasyon için tıklayınız](./README.tr.md)

---

## 📌 Executive Overview

**Zenith Atlas** is an open-source, high-performance financial analytics and risk modeling terminal designed for asset managers, researchers, and individual investors tracking Turkish and global capital markets (1,051 TEFAS mutual funds, Borsa Istanbul equities, FX, commodities, and CBRT macroeconomic indicators).

Operating under a **Client-Side Memory Architecture**, zero portfolio telemetry or trade data is transmitted to external servers. All factor regressions, Bayesian allocations, and 10,000-path Monte Carlo simulations execute entirely in-browser memory.

---

## 🏗️ Architecture & Data Flow

```mermaid
graph TD
    subgraph CLIENT [🖥️ Modern React 19 + TypeScript Terminal]
        UI[User Interface: Dashboard, Funds, Screener, Heatmap, Quant, Strategy, Engine]
        WS_CLIENT[Live WebSocket Client]
        IDB[(IndexedDB & LocalStorage Portfolio Store)]
        
        subgraph MODULES [⚙️ Modular Quant Engine: 5 Specialized Modules]
            A1[SyncSentinel: TEFAS Session & Data Reconciliation]
            A2[LeadQuant: Fama-French Alpha & Factor Attribution]
            A3[RiskBreaker: Circuit Breaker & Volatility Audit]
            A4[TaxHarvester: Withholding & Tax Optimization]
            A5[MacroStrategist: CBRT & Inflation Macro Allocation]
        end

        subgraph ENGINES [📐 11 Quantitative Mathematical Engines]
            E1[FactorAttributionEngine: Fama-French 5-Factor]
            E2[RollingCorrelationEngine: 30D/90D/365D Correlation & PCA]
            E3[BlackLittermanEngine: Bayesian Asset Allocation]
            E4[HrpEngine: Hierarchical Risk Parity]
            E5[MonteCarloEngine: 10,000-Path Simulation]
            E6[TaxLossHarvestingEngine: HIFO Tax Shield]
            E7[SyntheticStressEngine: Historical & Synthetic Crisis Stress]
            E8[SquarifiedTreemapEngine: Finviz-Style Treemap]
            E9[VoiceBriefingEngine: Web Speech AI Voice Engine]
            E10[P2pLiveSyncEngine: WebRTC & QR Teleport]
            E11[FinancialCircuitBreaker: 3-Tier Circuit Breaker]
        end
    end

    subgraph SOURCES [🌐 Official Data Feeds]
        S1[Takasbank TEFAS Dataset: 1,051 Funds]
        S2[wss://s.canlidoviz.com: Live FX, Gold & BIST]
        S3[CBRT & TUIK: Repo Rate %37 & CPI %31.75]
    end

    S2 -->|Real-Time WebSocket| WS_CLIENT
    S1 & S3 -->|Automated Sync & Bundled Data| IDB
    WS_CLIENT --> UI
    IDB --> MODULES
    MODULES --> ENGINES
    ENGINES --> UI
```

---

## 🚀 Core Capabilities & Modules

### 1. ⚙️ Modular Quant Engine (5 Specialized Modules)
* **SyncSentinel:** Monitors 1,051 TEFAS mutual funds and reconciles daily Takasbank 20:00 session settlement pricing.
* **LeadQuant:** Computes Fama-French 5-Factor attribution, Jensen's Alpha, Beta, Sharpe, Sortino, and Calmar risk-adjusted performance ratios.
* **RiskBreaker:** Continuously tracks volatility thresholds and portfolio concentration, enforcing a 3-tier circuit breaker (`HEALTHY`, `WARNING`, `TRIPPED`).
* **TaxHarvester:** Simulates HIFO tax loss harvesting and optimizes allocations under Turkish Presidential Decree 9075 (0% withholding tax equity funds).
* **MacroStrategist:** Evaluates macro regimes based on CBRT policy rates and inflation dynamics to recommend asset allocation tilts.

### 2. 📐 Advanced Quantitative Portfolio Analytics
* **Fama-French 5-Factor Decomposition:** Decomposes returns across Market ($\beta$), Size (SMB), Value (HML), Profitability (RMW), and Investment (CMA) factors to isolate pure managerial alpha.
* **Black-Litterman Model:** Blends market equilibrium with subjective investor views using Bayesian statistical shrinkage.
* **Hierarchical Risk Parity (HRP):** Executes machine learning-based hierarchical tree clustering (Marcos Lopez de Prado) for robust diversification without matrix inversion instabilities.
* **Monte Carlo Simulation:** 10,000-path Geometric Brownian Motion (GBM) projecting 1-to-5-year probabilistic return cones.
* **Crisis Stress Testing:** Simulates portfolio drawdown under historical shocks: 2008 Global Financial Crisis, 2020 Pandemic Shock, and 2021 Turkish Lira FX Shock.

### 3. 🔍 1,051 Mutual Funds Screener & Recognition Engine
* Embedded offline database indexing all 1,051 official TEFAS mutual funds.
* Sub-millisecond code lookup auto-populates fund metadata, category classification, and Takasbank settlement pricing.
* Multi-criteria sorting and filtering by AUM, expense ratio, annualized alpha, and category.

### 4. 📊 Squarified Treemap Heatmap
* Visualizes 1,051 TEFAS funds and user portfolios via the **Bruls-Huizing-van Wijk** tiling algorithm using HSL dynamic color scales.

### 5. 📑 Automated 4-Page A4 PDF Institutional Report Generator
* Generates comprehensive, high-resolution 4-page A4 executive PDF summaries client-side via jsPDF, containing factor attributions, risk metrics, and simulation paths.

### 6. 🎙️ Voice Market Briefing
* Web Speech API-powered voice engine synthesizing daily portfolio summaries, net asset values, and market opening briefings in Turkish.

### 7. 📲 Serverless P2P Mobile Teleportation
* Zero-cloud, camera-based mobile portfolio synchronization via high-density URL hash QR teleportation.
* Mobile-first responsive UI featuring bottom dock navigation, swipeable tabs, and touch drawers.

### 8. 🛡️ Fault-Tolerant React 19 Error Boundary
* Runtime resilience layer preventing white-screen crashes, isolating UI state faults, and enabling graceful local data recovery.

---

## 💻 Getting Started

### Live Terminal
Access the production build directly in your browser with zero setup:
👉 **[https://cagrik34.github.io/zenith-atlas/](https://cagrik34.github.io/zenith-atlas/)**

### Local Development

**Prerequisites:**
* Node.js v20+ (v22+ LTS recommended)
* npm v10+

```bash
# 1. Clone repository
git clone https://github.com/Cagrik34/zenith-atlas.git
cd zenith-atlas

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Build for production (Strict TypeScript & PWA)
npm run build

# 5. Preview production build locally
npm run preview
```

---

## 📁 Directory Structure

```text
zenith-atlas/
├── .github/                # CI/CD GitHub Actions deployment workflows
├── public/                 # Static PWA assets, manifest, and icons
├── scripts/                # Python-based data ingestion & sync utilities (sync.py)
├── src/
│   ├── components/         # Modular UI components (Dashboard, Quant, Screener, etc.)
│   ├── context/            # React Contexts (Portfolio, Market, AgentHive)
│   ├── data/               # Bundled static datasets
│   ├── engines/            # 11 Quantitative mathematical analysis engines
│   ├── hooks/              # Custom reactive hooks (useAutoSync, useLivePrices)
│   ├── styles/             # Enterprise Glassmorphism design system
│   ├── types/              # Strict TypeScript definitions
│   ├── utils/              # Export formats, math helpers, and storage drivers
│   ├── App.tsx             # Root Application & Modals
│   └── main.tsx            # React 19 Entry Point
├── index.html              # HTML5 Entry Document
├── package.json            # Node.js dependencies and build scripts
├── tsconfig.json           # Strict TypeScript configuration
└── vite.config.ts          # Vite 6 + manualChunks Rollup optimization
```

---

## 🔒 Security & Client-Side Privacy

* **Client-Side Execution:** Portfolio balances, trade histories, and cost positions remain strictly in local browser storage (`IndexedDB` / `localStorage`).
* **Input Sanitization:** Native React 19 DOM escaping safeguards.
* **Formula Injection Defense:** CSV/Excel export cells sanitized via `sanitizeCsvCell` against Dynamic Data Exchange (DDE) formula execution (`=`, `+`, `-`, `@`).

---

## 📄 License & Copyright

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

**Author:** Çağrı Giray Keşan  
**Copyright:** © 2026 Çağrı Giray Keşan. All Rights Reserved.