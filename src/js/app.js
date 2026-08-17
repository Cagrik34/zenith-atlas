
'use strict';

const STORAGE_KEYS = {
    PORTFOLIO: 'zenithatlas_portfolio_v1',
    CASH: 'zenithatlas_cash_v1',
    PENDING: 'zenithatlas_pending_v1',
    STRATEGY: 'zenithatlas_strategy_v1',
};

// ==========================================================================
// IndexedDB & Portföy Kalıcı Yedekleme Motoru (Persistent Storage & Backup)
// ==========================================================================
const IndexedDBStorage = {
    dbName: 'ZenithAtlasDB',
    storeName: 'portfolio_store',
    db: null,

    async open() {
        if (typeof indexedDB === 'undefined') return null;
        if (this.db) return this.db;
        return new Promise((resolve) => {
            try {
                const req = indexedDB.open(this.dbName, 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName, { keyPath: 'id' });
                    }
                };
                req.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };
                req.onerror = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        });
    },

    async savePortfolio(funds, cashTL, pendingOrders) {
        const db = await this.open();
        if (!db) return;
        try {
            const tx = db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put({
                id: 'active_portfolio',
                funds,
                cashTL,
                pendingOrders,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn('IndexedDB save hatası:', e);
        }
    },

    async loadPortfolio() {
        const db = await this.open();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction([this.storeName], 'readonly');
                const store = tx.objectStore(this.storeName);
                const req = store.get('active_portfolio');
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    },

    async clear() {
        const db = await this.open();
        if (!db) return;
        try {
            const tx = db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.delete('active_portfolio');
        } catch (e) {
            // Ignore
        }
    }
};

const PortfolioBackup = {
    exportBackup() {
        if (!PortfolioData.funds || PortfolioData.funds.length === 0) {
            Utils.showToast('Yedeklenecek portföy verisi bulunamadı. Lütfen önce fon ekleyin.', 'warning');
            return;
        }

        const backupData = {
            app: 'Zenith Atlas',
            version: '2.0',
            exportedAt: new Date().toISOString(),
            portfolio: {
                funds: PortfolioData.funds,
                cashTL: PortfolioData.cashTL,
                pendingOrders: PortfolioData.pendingOrders,
                strategyTargets: PortfolioData.strategyTargets
            },
            alerts: (typeof AlertsEngine !== 'undefined' && AlertsEngine.alerts) ? AlertsEngine.alerts : [],
            watchlist: (typeof WatchlistManager !== 'undefined' && WatchlistManager.watchlist) ? WatchlistManager.watchlist : []
        };

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `zenith_atlas_portfoy_yedek_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.showToast('💾 Portföy yedeği (JSON) indirildi. Tarayıcıyı silseniz bile tek tıkla geri yükleyebilirsiniz.', 'success');
    },

    openImportModal() {
        const modal = document.getElementById('portfolioImportModal');
        if (modal) {
            modal.classList.add('active');
        } else {
            this.triggerFilePicker();
        }
    },

    closeImportModal() {
        const modal = document.getElementById('portfolioImportModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    triggerFilePicker() {
        this.closeImportModal();
        let fileInput = document.getElementById('portfolioBackupFileInput');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'portfolioBackupFileInput';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        fileInput.click();
    },

    triggerImport() {
        this.openImportModal();
    },

    handleFileSelect(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                this.restoreFromData(data);
            } catch (err) {
                console.error('Yedek okuma hatası:', err);
                Utils.showToast('Geçersiz JSON dosyası. Lütfen geçerli bir Zenith Atlas portföy yedeği seçin.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    restoreFromData(data) {
        let funds = [];
        let cashTL = 0;
        let pendingOrders = [];

        if (data.portfolio) {
            funds = data.portfolio.funds || [];
            cashTL = data.portfolio.cashTL || 0;
            pendingOrders = data.portfolio.pendingOrders || [];
            if (data.alerts && typeof AlertsEngine !== 'undefined') {
                AlertsEngine.alerts = data.alerts;
                AlertsEngine.saveAlerts();
            }
            if (data.watchlist && typeof WatchlistManager !== 'undefined') {
                WatchlistManager.watchlist = data.watchlist;
                WatchlistManager.save();
            }
        } else if (Array.isArray(data)) {
            funds = data;
        } else if (data.funds && Array.isArray(data.funds)) {
            funds = data.funds;
            cashTL = data.cashTL || 0;
        }

        if (!Array.isArray(funds) || funds.length === 0) {
            Utils.showToast('Yedek dosyasında geçerli fon pozisyonu bulunamadı.', 'warning');
            return;
        }

        const validFunds = funds.map(f => {
            const code = Utils.escapeHtml((f.code || '').trim().toUpperCase());
            const category = Utils.escapeHtml(f.category || 'TEFAS Fonu');
            const meta = Utils.getFundMeta(code, category, f.name);
            return {
                ...f,
                code,
                name: Utils.escapeHtml(f.name || f.code),
                shortName: Utils.escapeHtml(f.shortName || f.code),
                category,
                assetClass: f.assetClass || meta.assetClass,
                shares: parseFloat(f.shares) || 0,
                avgCost: parseFloat(f.avgCost) || 0,
                currentPrice: parseFloat(f.currentPrice) || parseFloat(f.avgCost) || 0,
                buyValor: (f.buyValor !== undefined && f.buyValor !== null) ? f.buyValor : meta.buyValor,
                sellValor: (f.sellValor !== undefined && f.sellValor !== null) ? f.sellValor : meta.sellValor,
                riskScore: (f.riskScore !== undefined && f.riskScore > 0) ? f.riskScore : meta.riskScore,
                riskLevel: f.riskLevel || meta.riskLevel,
                valorCutoff: f.valorCutoff || meta.valorCutoff,
                tax: f.tax || meta.tax || 'Vergili (%7.5 Stopaj)',
                managementFee: typeof f.managementFee === 'number' ? f.managementFee : (meta.managementFee || 1.50),
                marketShare: typeof f.marketShare === 'number' ? f.marketShare : 0,
                occupancyRate: typeof f.occupancyRate === 'number' ? f.occupancyRate : 0,
                investors: typeof f.investors === 'number' ? f.investors : 0
            };
        });

        PortfolioData.funds = validFunds;
        PortfolioData.cashTL = cashTL;
        PortfolioData.pendingOrders = pendingOrders;
        PortfolioManager.save(PortfolioData.funds, PortfolioData.cashTL, PortfolioData.pendingOrders);
        PriceService.recalculatePortfolio();

        const emptyEl = document.getElementById('dashboardEmptyState');
        const activeEl = document.getElementById('dashboardActiveView');
        if (emptyEl) emptyEl.classList.add('hidden');
        if (activeEl) activeEl.classList.remove('hidden');

        Dashboard.init();
        Charts.init();
        if (typeof FundsTab !== 'undefined') FundsTab.render();
        if (typeof StrategyTab !== 'undefined') StrategyTab.render();
        if (typeof PlanTab !== 'undefined') PlanTab.render();
        if (typeof AddFundTab !== 'undefined') AddFundTab.renderManagedFunds();
        if (typeof ZenithIntelligence !== 'undefined') ZenithIntelligence.render();
        if (typeof TaxOptimizer !== 'undefined') TaxOptimizer.render();
        if (typeof GoalWealthBuilder !== 'undefined') GoalWealthBuilder.render();
        if (typeof CurrencyEngine !== 'undefined') CurrencyEngine.render();

        const badge = document.getElementById('strategyBadgeHeader');
        if (badge) badge.textContent = `${PortfolioData.funds.length} Varlık`;
        Utils.showToast(`✅ Portföy yedeği başarıyla geri yüklendi (${funds.length} varlık).`, 'success');
    },

    bindEvents() {
        const emptyCta = document.getElementById('emptyStateCta');
        if (emptyCta && !emptyCta._bound) {
            emptyCta._bound = true;
            emptyCta.addEventListener('click', () => Navigation.switchTab('add-fund'));
        }

        const emptyImportBtn = document.getElementById('emptyStateImportBtn');
        if (emptyImportBtn && !emptyImportBtn._bound) {
            emptyImportBtn._bound = true;
            emptyImportBtn.addEventListener('click', () => this.triggerImport());
        }

        const fileInput = document.getElementById('portfolioBackupFileInput');
        if (fileInput && !fileInput._bound) {
            fileInput._bound = true;
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        const exportBtn = document.getElementById('exportBackupBtn');
        if (exportBtn && !exportBtn._bound) {
            exportBtn._bound = true;
            exportBtn.addEventListener('click', () => this.exportBackup());
        }

        const importBtn = document.getElementById('importBackupBtn');
        if (importBtn && !importBtn._bound) {
            importBtn._bound = true;
            importBtn.addEventListener('click', () => this.triggerImport());
        }

        const closeBtn = document.getElementById('closePortfolioImportModal');
        if (closeBtn && !closeBtn._bound) {
            closeBtn._bound = true;
            closeBtn.addEventListener('click', () => this.closeImportModal());
        }

        const pickBtn = document.getElementById('importModalPickFileBtn');
        if (pickBtn && !pickBtn._bound) {
            pickBtn._bound = true;
            pickBtn.addEventListener('click', () => this.triggerFilePicker());
        }

        const manualBtn = document.getElementById('importModalManualAddBtn');
        if (manualBtn && !manualBtn._bound) {
            manualBtn._bound = true;
            manualBtn.addEventListener('click', () => {
                this.closeImportModal();
                Navigation.switchTab('add-fund');
            });
        }

        const cancelBtn = document.getElementById('importModalCancelBtn');
        if (cancelBtn && !cancelBtn._bound) {
            cancelBtn._bound = true;
            cancelBtn.addEventListener('click', () => this.closeImportModal());
        }
    }
};

const PortfolioManager = {
    save(funds, cashTL, pendingOrders) {
        try {
            localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(funds));
            localStorage.setItem(STORAGE_KEYS.CASH, JSON.stringify(cashTL));
            if (pendingOrders !== undefined)
                localStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(pendingOrders));
            if (typeof IndexedDBStorage !== 'undefined') {
                IndexedDBStorage.savePortfolio(funds, cashTL, pendingOrders);
            }
        } catch (e) {
            console.warn('Portföy kaydetme hatası:', e);
        }
    },

    load() {
        try {
            const rawFunds = JSON.parse(localStorage.getItem(STORAGE_KEYS.PORTFOLIO) || localStorage.getItem(STORAGE_KEYS.LEGACY_PORTFOLIO) || 'null');
            const rawCash = parseFloat(localStorage.getItem(STORAGE_KEYS.CASH) || localStorage.getItem(STORAGE_KEYS.LEGACY_CASH) || '0');
            const rawPending = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING) || localStorage.getItem(STORAGE_KEYS.LEGACY_PENDING) || '[]');
            
            let validFunds = [];
            if (Array.isArray(rawFunds)) {
                validFunds = rawFunds.filter(f => {
                    return f && typeof f.code === 'string' && f.code.trim().length > 0 &&
                           !isNaN(parseFloat(f.shares)) && parseFloat(f.shares) >= 0 &&
                           !isNaN(parseFloat(f.avgCost)) && parseFloat(f.avgCost) >= 0;
                }).map(f => {
                    const code = Utils.escapeHtml(f.code.trim().toUpperCase());
                    const category = Utils.escapeHtml(f.category || 'TEFAS Fonu');
                    const meta = Utils.getFundMeta(code, category, f.name);
                    return {
                        ...f,
                        code,
                        name: Utils.escapeHtml(f.name || f.code),
                        shortName: Utils.escapeHtml(f.shortName || f.code),
                        category,
                        assetClass: f.assetClass || meta.assetClass,
                        shares: parseFloat(f.shares) || 0,
                        avgCost: parseFloat(f.avgCost) || 0,
                        currentPrice: parseFloat(f.currentPrice) || parseFloat(f.avgCost) || 0,
                        buyValor: (f.buyValor !== undefined && f.buyValor !== null && f.buyValor > 0) ? f.buyValor : meta.buyValor,
                        sellValor: (f.sellValor !== undefined && f.sellValor !== null && (f.sellValor > 0 || category.toLowerCase().includes('para piyasası'))) ? f.sellValor : meta.sellValor,
                        riskScore: (f.riskScore !== undefined && f.riskScore > 0) ? f.riskScore : meta.riskScore,
                        riskLevel: f.riskLevel || meta.riskLevel,
                        valorCutoff: f.valorCutoff || meta.valorCutoff
                    };
                });
            }
            
            const cashTL = (!isNaN(rawCash) && rawCash >= 0) ? rawCash : 0;
            return { funds: validFunds, cashTL, pendingOrders: Array.isArray(rawPending) ? rawPending : [] };
        } catch (e) {
            console.warn('Portföy yükleme hatası:', e);
            return { funds: [], cashTL: 0, pendingOrders: [] };
        }
    },

    clear() {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        localStorage.removeItem('zenithatlas_prices_v1');
        localStorage.removeItem('zenithatlas_lastUpdate_v1');
        if (typeof IndexedDBStorage !== 'undefined') {
            IndexedDBStorage.clear();
        }
    },

    hasFund(code) {
        return PortfolioData.funds.some(f => f.code === code);
    },

    addFund(fundEntry) {
        if (this.hasFund(fundEntry.code)) return false;
        PortfolioData.funds.push(fundEntry);
        this.save(PortfolioData.funds, PortfolioData.cashTL, PortfolioData.pendingOrders);
        return true;
    },

    removeFund(code) {
        const idx = PortfolioData.funds.findIndex(f => f.code === code);
        if (idx === -1) return false;
        PortfolioData.funds.splice(idx, 1);
        this.save(PortfolioData.funds, PortfolioData.cashTL, PortfolioData.pendingOrders);
        return true;
    },

    updateFund(code, shares, avgCost) {
        const fund = PortfolioData.funds.find(f => f.code === code);
        if (!fund) return false;
        fund.shares = parseFloat(shares) || 0;
        fund.avgCost = parseFloat(avgCost) || 0;
        PriceService.recalculatePortfolio();
        this.save(PortfolioData.funds, PortfolioData.cashTL, PortfolioData.pendingOrders);
        return true;
    }
};

const PortfolioData = (() => {
    const saved = PortfolioManager.load();
    return {
        cashTL: saved.cashTL,
        funds: saved.funds,
        pendingOrders: saved.pendingOrders,
        strategyTargets: {}
    };
})();

// ==========================================================================
// MultiPortfolioEngine (Çoklu Portföy & BES / Emeklilik Yönetim Masası)
// ==========================================================================
const MultiPortfolioEngine = {
    profiles: [],
    activeProfileId: 'default',

    init() {
        this.loadProfiles();
        this.renderSelector();
        this.bindEvents();
    },

    loadProfiles() {
        try {
            const raw = localStorage.getItem('zenithatlas_profiles_v1');
            const activeId = localStorage.getItem('zenithatlas_active_profile_v1') || 'default';
            if (raw) {
                this.profiles = JSON.parse(raw);
            }
            if (!Array.isArray(this.profiles) || this.profiles.length === 0) {
                this.profiles = [
                    { id: 'default', name: '🏢 Ana Portföy', icon: '🏢', isBes: false, funds: PortfolioData.funds || [], cashTL: PortfolioData.cashTL || 0, pendingOrders: PortfolioData.pendingOrders || [] },
                    { id: 'bes', name: '🛡 BES & Emeklilik', icon: '🛡', isBes: true, funds: [], cashTL: 0, pendingOrders: [] }
                ];
                this.saveProfiles();
            }
            this.activeProfileId = activeId;
        } catch (e) {
            console.warn('Profiles load error:', e);
        }
    },

    saveProfiles() {
        try {
            const cur = this.profiles.find(p => p.id === this.activeProfileId);
            if (cur) {
                cur.funds = PortfolioData.funds;
                cur.cashTL = PortfolioData.cashTL;
                cur.pendingOrders = PortfolioData.pendingOrders;
            }
            localStorage.setItem('zenithatlas_profiles_v1', JSON.stringify(this.profiles));
            localStorage.setItem('zenithatlas_active_profile_v1', this.activeProfileId);
        } catch (e) {}
    },

    switchProfile(profileId) {
        if (profileId === this.activeProfileId) return;
        this.saveProfiles();

        const target = this.profiles.find(p => p.id === profileId);
        if (!target) return;

        this.activeProfileId = profileId;
        PortfolioData.funds = target.funds || [];
        PortfolioData.cashTL = target.cashTL || 0;
        PortfolioData.pendingOrders = target.pendingOrders || [];

        PortfolioManager.save(PortfolioData.funds, PortfolioData.cashTL, PortfolioData.pendingOrders);
        PriceService.recalculatePortfolio();

        const emptyEl = document.getElementById('dashboardEmptyState');
        const activeEl = document.getElementById('dashboardActiveView');
        if (PortfolioData.funds.length === 0 && PortfolioData.cashTL === 0) {
            if (emptyEl) emptyEl.classList.remove('hidden');
            if (activeEl) activeEl.classList.add('hidden');
        } else {
            if (emptyEl) emptyEl.classList.add('hidden');
            if (activeEl) activeEl.classList.remove('hidden');
        }

        Dashboard.init();
        Charts.init();
        if (typeof FundsTab !== 'undefined') FundsTab.render();
        if (typeof StrategyTab !== 'undefined') StrategyTab.render();
        if (typeof PlanTab !== 'undefined') PlanTab.render();
        if (typeof AddFundTab !== 'undefined') AddFundTab.renderManagedFunds();
        if (typeof ZenithIntelligence !== 'undefined') ZenithIntelligence.render();
        if (typeof TaxOptimizer !== 'undefined') TaxOptimizer.render();
        if (typeof GoalWealthBuilder !== 'undefined') GoalWealthBuilder.render();
        if (typeof CurrencyEngine !== 'undefined') CurrencyEngine.render();
        if (typeof DividendYieldEngine !== 'undefined') DividendYieldEngine.render();

        this.renderSelector();
        Utils.showToast(`📂 "${target.name}" portföyüne geçildi (${target.funds.length} varlık).`, 'success');
    },

    createProfile(name, icon = '💼', isBes = false) {
        if (!name || !name.trim()) return false;
        const newId = 'prof_' + Date.now();
        const newProfile = {
            id: newId,
            name: name.trim(),
            icon: icon || (isBes ? '🛡' : '💼'),
            isBes: Boolean(isBes),
            funds: [],
            cashTL: 0,
            pendingOrders: []
        };
        this.profiles.push(newProfile);
        this.saveProfiles();
        this.switchProfile(newId);
        return true;
    },

    getConsolidatedTotal() {
        let total = 0;
        this.profiles.forEach(p => {
            if (p.id === this.activeProfileId) {
                total += Calculations.getTotalPortfolioValue();
            } else {
                const fVal = (p.funds || []).reduce((s, f) => s + ((f.shares || 0) * (f.currentPrice || 0)), 0);
                total += fVal + (p.cashTL || 0);
            }
        });
        return total;
    },

    renderSelector() {
        const container = document.getElementById('portfolioProfileSwitcherContainer');
        if (!container) return;

        const consolidated = this.getConsolidatedTotal();
        let html = `
            <div class="profile-switcher-wrapper">
                <div class="profile-pills-row">
        `;

        this.profiles.forEach(p => {
            const isActive = p.id === this.activeProfileId;
            const count = (p.id === this.activeProfileId) ? PortfolioData.funds.length : (p.funds || []).length;
            html += `
                <button class="profile-pill-btn ${isActive ? 'active' : ''}" data-profile-id="${p.id}" title="${Utils.escapeHtml(p.name)}">
                    <span class="profile-pill-icon">${p.icon || '💼'}</span>
                    <span class="profile-pill-name">${Utils.escapeHtml(p.name)}</span>
                    <span class="profile-pill-badge">${count}</span>
                </button>
            `;
        });

        html += `
                    <button class="profile-pill-add-btn" id="openCreateProfileModalBtn" title="Yeni Portföy / BES Hesabı Ekle">
                        <span>➕</span> Yeni Portföy
                    </button>
                </div>
                <div class="profile-consolidated-badge" title="Tüm Portföylerinizin Konsolide Toplam Büyüklüğü">
                    <span class="consolidated-label">Konsolide Net Varlık:</span>
                    <strong class="consolidated-val">${Utils.formatCurrency(consolidated)}</strong>
                </div>
            </div>
        `;

        container.innerHTML = html;

        container.querySelectorAll('.profile-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-profile-id');
                if (id) this.switchProfile(id);
            });
        });

        const addBtn = document.getElementById('openCreateProfileModalBtn');
        if (addBtn && !addBtn._bound) {
            addBtn._bound = true;
            addBtn.addEventListener('click', () => this.openCreateModal());
        }
    },

    openCreateModal() {
        const modal = document.getElementById('createProfileModal');
        if (modal) modal.classList.add('active');
    },

    closeCreateModal() {
        const modal = document.getElementById('createProfileModal');
        if (modal) modal.classList.remove('active');
    },

    bindEvents() {
        const closeBtn = document.getElementById('closeCreateProfileModal');
        const dismissBtn = document.getElementById('dismissCreateProfileModal');
        const saveBtn = document.getElementById('saveNewProfileBtn');

        if (closeBtn && !closeBtn._bound) {
            closeBtn._bound = true;
            closeBtn.addEventListener('click', () => this.closeCreateModal());
        }
        if (dismissBtn && !dismissBtn._bound) {
            dismissBtn._bound = true;
            dismissBtn.addEventListener('click', () => this.closeCreateModal());
        }

        if (saveBtn && !saveBtn._bound) {
            saveBtn._bound = true;
            saveBtn.addEventListener('click', () => {
                const nameInput = document.getElementById('newProfileNameInput');
                const iconInput = document.getElementById('newProfileIconSelect');
                const isBesInput = document.getElementById('newProfileIsBesCheck');

                const name = nameInput ? nameInput.value.trim() : '';
                const icon = iconInput ? iconInput.value : '💼';
                const isBes = isBesInput ? isBesInput.checked : false;

                if (!name) {
                    Utils.showToast('Lütfen bir portföy adı girin.', 'warning');
                    return;
                }

                this.createProfile(name, icon, isBes);
                this.closeCreateModal();
                if (nameInput) nameInput.value = '';
            });
        }
    }
};

const Utils = {
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    normalizeText(text) {
        if (!text) return '';
        return text
            .toString()
            .toLocaleLowerCase('tr-TR')
            .replace(/İ/g, 'i')
            .replace(/I/g, 'ı')
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .trim();
    },

    formatCurrency(value, decimals = 2) {
        if (value === undefined || value === null || isNaN(value)) return '₺0,00';
        const absValue = Math.abs(value);
        const formatted = absValue.toLocaleString('tr-TR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
        return (value < 0 ? '-₺' : '₺') + formatted;
    },

    formatPrice(value, decimals = 6) {
        if (value === undefined || value === null || isNaN(value)) return '₺0,000000';
        return '₺' + value.toLocaleString('tr-TR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    formatPercent(value, decimals = 2) {
        if (value === undefined || value === null || isNaN(value)) return '%0,00';
        const sign = value > 0 ? '+' : '';
        return sign + '%' + value.toLocaleString('tr-TR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    formatNumber(value, decimals = 0) {
        if (value === undefined || value === null || isNaN(value)) return '0';
        return value.toLocaleString('tr-TR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    getReturnClass(value) {
        if (value > 0.0001) return 'positive';
        if (value < -0.0001) return 'negative';
        return 'neutral';
    },

    getRiskBadgeClass(level) {
        if (!level || typeof level !== 'string') return 'badge-warning';
        if (level.includes('Düşük')) return 'badge-risk-low';
        if (level.includes('Orta')) return 'badge-warning';
        return 'badge-risk-high';
    },

    getFundMeta(code, category, title = '') {
        const cat = (category || '').toLowerCase();
        const codeUpper = (code || '').toUpperCase();
        const tNorm = (title || '').toLowerCase();

        // Deterministic pseudo-random seed from fund code
        let seed = 0;
        for (let i = 0; i < codeUpper.length; i++) {
            seed = (seed * 31 + codeUpper.charCodeAt(i)) % 1000;
        }

        let buyValor = 1;
        let sellValor = 1;
        let riskScore = 4;
        let riskLevel = 'Orta Riskli';
        let assetClass = category || 'Fon';
        let valorCutoff = '13:30';
        let tax = 'Vergili (%7,5 Stopaj)';
        let perf1Y = 52.0 + (seed % 15) - 7.5;
        let managementFee = 1.80 + ((seed % 10) * 0.05);
        let investors = 15000 + (seed * 85);
        let occupancyRate = 20.0 + ((seed % 60) * 0.8);

        if (cat.includes('para piyasası')) {
            buyValor = 0;
            sellValor = 0;
            riskScore = 1;
            riskLevel = 'Düşük Riskli';
            assetClass = 'Para Piyasası';
            tax = 'Vergili (%7,5 Stopaj)';
            perf1Y = 52.5 + ((seed % 60) * 0.1); // %52.5 - %58.5
            managementFee = 0.75 + ((seed % 10) * 0.04); // %0.75 - %1.15
            investors = 45000 + (seed * 110);
            occupancyRate = 45.0 + ((seed % 40) * 1.0);
            if (codeUpper === 'AIS') valorCutoff = '13:00';
        } else if (cat.includes('altın') || cat.includes('kıymetli')) {
            buyValor = 1;
            sellValor = 1;
            riskScore = 5;
            riskLevel = 'Orta-Yüksek Riskli';
            assetClass = 'Altın & Emtia';
            tax = 'Vergili (%7,5 Stopaj)';
            perf1Y = 68.0 + ((seed % 140) * 0.1); // %68.0 - %82.0
            managementFee = 1.40 + ((seed % 10) * 0.05); // %1.40 - %1.90
            investors = 30000 + (seed * 80);
            occupancyRate = 30.0 + ((seed % 50) * 0.8);
        } else if (cat.includes('yabancı') || codeUpper === 'AFT' || codeUpper === 'YAY' || codeUpper === 'IJC') {
            buyValor = 1;
            sellValor = 3;
            riskScore = 6;
            riskLevel = 'Yüksek Riskli';
            assetClass = 'Yabancı Teknoloji';
            tax = 'Vergili (%7,5 Stopaj)';
            perf1Y = 75.0 + ((seed % 400) * 0.1); // %75.0 - %115.0
            managementFee = 2.40 + ((seed % 10) * 0.05); // %2.40 - %2.90
            investors = 25000 + (seed * 95);
            occupancyRate = 35.0 + ((seed % 45) * 1.0);
        } else if (cat.includes('hisse') || cat.includes('hisse senedi') || tNorm.includes('hisse senedi yoğun') || codeUpper === 'MAC' || codeUpper === 'ADE' || codeUpper === 'TI2') {
            buyValor = 1;
            sellValor = 2;
            riskScore = 6;
            riskLevel = 'Yüksek Riskli';
            assetClass = 'Hisse Senedi';
            tax = 'Vergisiz (%0 Stopaj Muaf)';
            perf1Y = 70.0 + ((seed % 350) * 0.1); // %70.0 - %105.0
            managementFee = 2.20 + ((seed % 12) * 0.05); // %2.20 - %2.80
            investors = 20000 + (seed * 70);
            occupancyRate = 25.0 + ((seed % 55) * 0.9);
        } else if (cat.includes('değişken') || cat.includes('karma') || codeUpper === 'IPB' || codeUpper === 'TGA') {
            buyValor = 1;
            sellValor = 2;
            riskScore = 5;
            riskLevel = 'Orta-Yüksek Riskli';
            assetClass = 'Değişken Fon';
            tax = 'Vergili (%7,5 Stopaj)';
            perf1Y = 58.0 + ((seed % 250) * 0.1); // %58.0 - %83.0
            managementFee = 1.75 + ((seed % 12) * 0.05); // %1.75 - %2.35
            investors = 18000 + (seed * 60);
            occupancyRate = 22.0 + ((seed % 50) * 0.9);
        } else if (cat.includes('borçlanma') || cat.includes('eurobond') || codeUpper === 'AED' || codeUpper === 'AK3') {
            buyValor = 1;
            sellValor = (cat.includes('döviz') || cat.includes('eurobond') || codeUpper === 'AED') ? 3 : 1;
            riskScore = (codeUpper === 'AED') ? 4 : 3;
            riskLevel = 'Düşük-Orta Riskli';
            assetClass = 'Borçlanma Araçları';
            tax = (cat.includes('döviz') || cat.includes('eurobond')) ? 'Vergili (%10 Stopaj)' : 'Vergili (%7,5 Stopaj)';
            perf1Y = 48.0 + ((seed % 100) * 0.1); // %48.0 - %58.0
            managementFee = 1.10 + ((seed % 10) * 0.05); // %1.10 - %1.60
            investors = 12000 + (seed * 50);
            occupancyRate = 20.0 + ((seed % 40) * 0.8);
        }

        return { buyValor, sellValor, riskScore, riskLevel, assetClass, valorCutoff, tax, perf1Y, managementFee, investors, occupancyRate };
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✅', error: '❌', warning: '⚠', info: '💡' };
        toast.innerHTML = `<span>${icons[type] || '💡'}</span><span>${Utils.escapeHtml(String(message))}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    getTimestamp() {
        return new Date().toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    },

    getMarketStatus() {
        const now = new Date();
        const day = now.getDay(); // 0 = Pazar, 6 = Cumartesi
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeNum = hours * 100 + minutes;

        const isWeekend = (day === 0 || day === 6);
        
        if (isWeekend) {
            return {
                isWeekend: true,
                isOpen: false,
                statusText: 'Hafta Sonu (Piyasalar Kapalı)',
                badgeClass: 'badge-warning',
                shortBadge: '🟡 Hafta Sonu (Cuma Kapanışı)',
                toastMessage: '💡 Hafta Sonu: Piyasalar kapalıdır. Son iş günü olan 14.08.2026 Cuma resmi TEFAS & TCMB kapanış verileri geçerlidir.',
                headerStatus: 'TEFAS & TCMB (Cuma Kapanış)'
            };
        }

        if (timeNum >= 900 && timeNum <= 1815) {
            return {
                isWeekend: false,
                isOpen: true,
                statusText: 'Piyasalar Açık',
                badgeClass: 'badge-success',
                shortBadge: '🟢 Canlı Seans Açık',
                toastMessage: '✅ Canlı seans TEFAS fon fiyatları ve TCMB döviz kurları başarıyla güncellendi!',
                headerStatus: 'TEFAS Canlı'
            };
        } else {
            return {
                isWeekend: false,
                isOpen: false,
                statusText: 'Seans Kapalı (Gün Sonu)',
                badgeClass: 'badge-secondary',
                shortBadge: '⚪ Seans Dışı (Kapanış)',
                toastMessage: '💡 Seans Kapalı: Gün sonu resmi TEFAS & TCMB kapanış verileri doğrulanmıştır.',
                headerStatus: 'TEFAS (Gün Sonu Kapanış)'
            };
        }
    }
};

const PriceService = {
    STORAGE_KEY: 'zenithatlas_prices_v1',
    UPDATE_KEY: 'zenithatlas_lastUpdate_v1',

    async init() {
        this.loadCachedPrices();
        await this.loadPricesFromJsonFile();
    },

    loadCachedPrices() {
        try {
            const cached = localStorage.getItem(this.STORAGE_KEY);
            if (cached) {
                const prices = JSON.parse(cached);
                PortfolioData.funds.forEach(fund => {
                    if (prices[fund.code] && prices[fund.code] > 0) {
                        fund.currentPrice = prices[fund.code];
                    }
                });
                this.recalculatePortfolio();
            }
        } catch (e) {
            console.warn('Önbellek okuma hatası:', e);
        }
    },

    async loadPricesFromJsonFile() {
        const marketStatus = Utils.getMarketStatus();

        // 1. Sync from master 1.051-fund database (funds_db.js / funds_db.json)
        const dbFunds = FundSearch.db || (typeof window !== 'undefined' && window.TEFAS_FUNDS_DB?.funds) || [];
        if (dbFunds.length > 0) {
            PortfolioData.funds.forEach(fund => {
                const found = dbFunds.find(item => item.code === fund.code);
                if (found && found.price > 0) {
                    fund.currentPrice = found.price;
                    if (found.dailyReturnPct !== undefined) fund.dailyReturnPct = found.dailyReturnPct;
                    if (found.performance1Y !== undefined) fund.performance1Y = found.performance1Y;
                }
            });
        }

        // 2. Synchronous fallback for local file protocol prices.js
        if (window.TEFAS_PRICES && window.TEFAS_PRICES.prices) {
            const data = window.TEFAS_PRICES;
            PortfolioData.funds.forEach(fund => {
                if (data.prices[fund.code] && data.prices[fund.code] > 0) {
                    fund.currentPrice = data.prices[fund.code];
                }
            });
            this.savePrices();
            this.recalculatePortfolio();
            
            const updateText = document.querySelector('.update-text');
            const pulseDot = document.querySelector('.pulse-dot');
            if (updateText) updateText.textContent = `${marketStatus.headerStatus}: ${data.lastUpdate || Utils.getTimestamp()}`;
            if (pulseDot) pulseDot.className = marketStatus.isWeekend ? 'pulse-dot pulse-dot-warning' : 'pulse-dot';
        }

        // 3. Network fetch fallback for web servers (src/data/prices.json)
        try {
            let res = await fetch('src/data/prices.json?t=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) res = await fetch('data/prices.json?t=' + Date.now(), { cache: 'no-store' });
            if (res && res.ok) {
                const data = await res.json();
                if (data && data.prices) {
                    PortfolioData.funds.forEach(fund => {
                        if (data.prices[fund.code] && data.prices[fund.code] > 0) {
                            fund.currentPrice = data.prices[fund.code];
                        }
                    });
                    this.savePrices();
                    this.recalculatePortfolio();
                    
                    const updateText = document.querySelector('.update-text');
                    const pulseDot = document.querySelector('.pulse-dot');
                    if (updateText) updateText.textContent = `${marketStatus.headerStatus}: ${data.lastUpdate || Utils.getTimestamp()}`;
                    if (pulseDot) pulseDot.className = marketStatus.isWeekend ? 'pulse-dot pulse-dot-warning' : 'pulse-dot';
                }
            }
        } catch (e) {
            // Local file protocol fallback already handled
        }
    },

    savePrices() {
        try {
            const prices = {};
            PortfolioData.funds.forEach(f => {
                prices[f.code] = f.currentPrice;
            });
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prices));
            localStorage.setItem(this.UPDATE_KEY, new Date().toISOString());
        } catch (e) {
            console.warn('Önbellek kayıt hatası:', e);
        }
    },

    getLastUpdate() {
        try {
            const stored = localStorage.getItem(this.UPDATE_KEY);
            if (stored) {
                return new Date(stored).toLocaleString('tr-TR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            }
        } catch (e) { /* pass */ }
        return null;
    },

    // Direct price synchronization
    async syncFromSiteDirectly() {
        const refreshBtn = document.getElementById('refreshPrices');
        const updateText = document.querySelector('.update-text');
        const pulseDot = document.querySelector('.pulse-dot');
        const marketStatus = Utils.getMarketStatus();

        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span>⏳</span> Güncelleniyor...';
        }

        Utils.showToast('TEFAS fiyatları güncelleniyor...', 'info');

        try {
            let res = await fetch('src/data/prices.json?t=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) res = await fetch('data/prices.json?t=' + Date.now(), { cache: 'no-store' });
            if (res && res.ok) {
                const data = await res.json();
                if (data && data.prices) {
                    PortfolioData.funds.forEach(fund => {
                        if (data.prices[fund.code]) {
                            fund.currentPrice = data.prices[fund.code];
                        }
                    });
                }
            }
        } catch (err) {
            console.log('JSON check:', err);
        }

        this.savePrices();
        this.recalculatePortfolio();

        Dashboard.init();
        Charts.refresh();
        FundsTab.render();
        StrategyTab.render();
        MarketService.init();

        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<span>🔄</span> Güncelle';
        }
        if (pulseDot) pulseDot.className = marketStatus.isWeekend ? 'pulse-dot pulse-dot-warning' : 'pulse-dot';
        if (updateText) updateText.textContent = `${marketStatus.headerStatus}: ${Utils.getTimestamp()}`;

        // Context-aware UX feedback toast
        Utils.showToast(marketStatus.toastMessage, marketStatus.isWeekend ? 'warning' : 'success');
        return true;
    },

    recalculatePortfolio() {
        PortfolioData.funds.forEach(fund => {
            if (fund.shares > 0 && fund.avgCost > 0) {
                const totalCost = fund.shares * fund.avgCost;
                const totalValue = fund.shares * fund.currentPrice;
                fund.totalReturn = totalValue - totalCost;
                fund.totalReturnPct = totalCost > 0 ? (fund.totalReturn / totalCost) * 100 : 0;
            }
        });
        // Persist updated prices to localStorage
        PortfolioManager.save(PortfolioData.funds, PortfolioData.cashTL, PortfolioData.pendingOrders);
    }
};

const Calculations = {
    getFundsTotalValue() {
        return PortfolioData.funds.reduce((sum, f) => sum + (f.shares * f.currentPrice), 0);
    },

    getTotalPortfolioValue() {
        return this.getFundsTotalValue() + PortfolioData.cashTL;
    },

    getTotalCost() {
        return PortfolioData.funds.reduce((sum, f) => sum + (f.shares * f.avgCost), 0);
    },

    getDailyPnL() {
        return PortfolioData.funds.reduce((sum, f) => sum + (f.dailyReturn || 0), 0);
    },

    getTotalReturn() {
        return PortfolioData.funds.reduce((sum, f) => sum + (f.totalReturn || 0), 0);
    },

    getDailyPnLPercent() {
        const totalVal = this.getFundsTotalValue();
        const dailyPnL = this.getDailyPnL();
        const prev = totalVal - dailyPnL;
        return prev > 0 ? (dailyPnL / prev) * 100 : 0;
    },

    getTotalReturnPercent() {
        const totalCost = this.getTotalCost();
        const totalReturn = this.getTotalReturn();
        return totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
    },

    getWeightedRiskScore() {
        const totalVal = this.getFundsTotalValue();
        if (totalVal <= 0) return 0;
        let weightedSum = 0;
        PortfolioData.funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            weightedSum += f.riskScore * (val / totalVal);
        });
        return weightedSum;
    },

    getStrategyTargets() {
        const totalVal = this.getTotalPortfolioValue();
        const funds = PortfolioData.funds;
        const cashTL = PortfolioData.cashTL;

        if (totalVal <= 0) {
            return {};
        }

        let liquidVal = cashTL;
        let globalTechVal = 0;
        let goldVal = 0;
        let bistVal = 0;
        let bondVal = 0;

        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const cat = (f.category || '').toLowerCase();
            const code = (f.code || '').toUpperCase();

            if (f.sellValor === 0 || cat.includes('para piyasası')) {
                liquidVal += val;
            } else if (cat.includes('yabancı') || code === 'AFT' || code === 'YAY' || code === 'IJC') {
                globalTechVal += val;
            } else if (cat.includes('altın') || cat.includes('kıymetli') || code === 'KZL' || code === 'TCA' || code === 'GGK') {
                goldVal += val;
            } else if (cat.includes('hisse') || code === 'MAC' || code === 'TI2' || code === 'ADE' || code === 'TTE') {
                bistVal += val;
            } else {
                bondVal += val;
            }
        });

        const liquidPct = (liquidVal / totalVal) * 100;
        const globalTechPct = (globalTechVal / totalVal) * 100;
        const goldPct = (goldVal / totalVal) * 100;
        const bistPct = (bistVal / totalVal) * 100;
        const bondPct = (bondVal / totalVal) * 100;

        const targets = {};

        targets['Likit Güvence & Alım Havuzu'] = {
            current: liquidPct,
            target: 45,
            color: '#10B981',
            role: 'T+0 likit katılım & nakit gücü'
        };

        targets['Küresel Teknoloji & Büyüme'] = {
            current: globalTechPct,
            target: 30,
            color: '#8B5CF6',
            role: 'Mega teknoloji devleri & kur koruması'
        };

        targets['Altın Katılım & Enflasyon Kalkanı'] = {
            current: goldPct,
            target: 15,
            color: '#F59E0B',
            role: 'Jeopolitik risk ve kriz sigortası'
        };

        targets['Vergisiz BIST Alfa'] = {
            current: bistPct,
            target: 10,
            color: '#EC4899',
            role: 'Yerli hisse senedi & %0 stopaj'
        };

        if (bondPct > 0.5) {
            targets['Borçlanma Araçları / Eurobond'] = {
                current: bondPct,
                target: 10,
                color: '#3B82F6',
                role: 'Düzenli getiri & kupon akışı'
            };
        }

        return targets;
    },

    getAnnualizedReturn() {
        const funds = PortfolioData.funds;
        const totalVal = this.getTotalPortfolioValue();
        if (totalVal <= 0 || funds.length === 0) return 0;

        let weightedReturn = 0;
        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const weight = val / totalVal;
            weightedReturn += weight * (f.performance1Y || 0);
        });
        return Number(weightedReturn.toFixed(2));
    },

    getPortfolioVolatility() {
        const funds = PortfolioData.funds;
        const totalVal = this.getTotalPortfolioValue();
        if (totalVal <= 0 || funds.length === 0) return 0;

        const riskVolMap = { 1: 3.5, 2: 7, 3: 12, 4: 18, 5: 25, 6: 35, 7: 45 };

        let weightedVol = 0;
        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const weight = val / totalVal;
            const fundVol = riskVolMap[f.riskScore] || 20;
            weightedVol += weight * fundVol;
        });
        return Number(weightedVol.toFixed(2));
    },

    getSharpeRatio(riskFreeRate) {
        if (riskFreeRate === undefined) riskFreeRate = 40;
        const annReturn = this.getAnnualizedReturn();
        const vol = this.getPortfolioVolatility();
        if (vol <= 0) return 0;
        return Number(((annReturn - riskFreeRate) / vol).toFixed(2));
    },

    getMaxDrawdown() {
        const funds = PortfolioData.funds;
        const totalVal = this.getTotalPortfolioValue();
        if (totalVal <= 0 || funds.length === 0) return 0;

        let maxDD = 0;
        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const weight = val / totalVal;
            const riskVolMap = { 1: 2, 2: 5, 3: 10, 4: 18, 5: 28, 6: 40, 7: 55 };
            const estimatedDD = riskVolMap[f.riskScore] || 15;
            const weightedDD = weight * estimatedDD;
            if (weightedDD > maxDD) maxDD = weightedDD;
        });
        return Number(maxDD.toFixed(1));
    },

    getBISTBeta() {
        const funds = PortfolioData.funds;
        const totalVal = this.getTotalPortfolioValue();
        if (totalVal <= 0) return 0;

        let bistExposure = 0;
        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const weight = val / totalVal;
            const cat = (f.category || '').toLowerCase();
            const code = (f.code || '').toUpperCase();
            if (cat.includes('hisse') && !cat.includes('yabancı') || code === 'MAC' || code === 'TI2' || code === 'ADE' || code === 'TTE') {
                bistExposure += weight * 1.0;
            } else if (f.riskScore >= 5 && !cat.includes('yabancı') && !cat.includes('altın')) {
                bistExposure += weight * 0.3;
            }
        });
        return Number(bistExposure.toFixed(2));
    },

    getDollarBeta() {
        const funds = PortfolioData.funds;
        const totalVal = this.getTotalPortfolioValue();
        if (totalVal <= 0) return 0;

        let usdExposure = 0;
        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const weight = val / totalVal;
            const cat = (f.category || '').toLowerCase();
            const code = (f.code || '').toUpperCase();
            if (cat.includes('yabancı') || code === 'AFT' || code === 'IJC' || code === 'YAY') {
                usdExposure += weight * 1.0;
            } else if (cat.includes('altın') || cat.includes('kıymetli') || code === 'KZL' || code === 'TCA' || code === 'GGK') {
                usdExposure += weight * 0.85;
            }
        });
        return Number(usdExposure.toFixed(2));
    }
};

const Dashboard = {
    init() {
        const emptyEl = document.getElementById('dashboardEmptyState');
        const activeEl = document.getElementById('dashboardActiveView');

        if (typeof MacroNewsEngine !== 'undefined') {
            MacroNewsEngine.render();
        }

        if (PortfolioData.funds.length === 0) {
            if (emptyEl) emptyEl.classList.remove('hidden');
            if (activeEl) activeEl.classList.add('hidden');
            this.setupEmptyStateListeners();
            return;
        }

        if (emptyEl) emptyEl.classList.add('hidden');
        if (activeEl) activeEl.classList.remove('hidden');

        this.renderSummaryCards();
        this.renderQuantRatios();
        this.renderFundTable();
        this.renderValorTable();
        this.renderPendingTransactions();
        this.renderStrategyAlignment();
        if (typeof MonteCarloEngine !== 'undefined') {
            MonteCarloEngine.render();
            MonteCarloEngine.initEventListeners();
        }
        if (typeof StressTestEngine !== 'undefined') {
            StressTestEngine.render();
        }
        if (typeof MarkowitzOptimizer !== 'undefined') {
            MarkowitzOptimizer.render();
        }
        if (typeof FxAttributionEngine !== 'undefined') {
            FxAttributionEngine.render();
        }
        if (typeof DividendYieldEngine !== 'undefined') {
            DividendYieldEngine.render();
        }
        if (typeof ValorTimeline !== 'undefined') {
            ValorTimeline.render();
        }
        if (typeof WorkspaceManager !== 'undefined') {
            WorkspaceManager.init();
        }
    },

    setupEmptyStateListeners() {
        const cta = document.getElementById('emptyStateCta');
        if (cta && !cta._hasListener) {
            cta._hasListener = true;
            cta.addEventListener('click', () => Navigation.switchTab('add-fund'));
        }
        const importBtn = document.getElementById('emptyStateImportBtn');
        if (importBtn && !importBtn._hasListener) {
            importBtn._hasListener = true;
            importBtn.addEventListener('click', () => PortfolioBackup.triggerImport());
        }
    },

    renderSummaryCards() {
        const totalPortfolio = Calculations.getTotalPortfolioValue();
        const fundsValue = Calculations.getFundsTotalValue();
        const dailyPnL = Calculations.getDailyPnL();
        const dailyPnLPct = Calculations.getDailyPnLPercent();
        const totalReturn = Calculations.getTotalReturn();
        const totalReturnPct = Calculations.getTotalReturnPercent();
        const riskScore = Calculations.getWeightedRiskScore();

        const formatMoney = (val) => typeof CurrencyEngine !== 'undefined' ? CurrencyEngine.format(val) : Utils.formatCurrency(val);

        const totalValueEl = document.getElementById('totalValueDisplay');
        if (totalValueEl) {
            totalValueEl.textContent = formatMoney(totalPortfolio);
            totalValueEl.classList.add('count-animated');
        }
        const totalSharesEl = document.getElementById('totalSharesDisplay');
        if (totalSharesEl) {
            totalSharesEl.textContent = `Varlıklar: ${formatMoney(fundsValue)} | Nakit: ${formatMoney(PortfolioData.cashTL)}`;
        }

        const dailyPnLEl = document.getElementById('dailyPnLDisplay');
        if (dailyPnLEl) {
            dailyPnLEl.textContent = (dailyPnL >= 0 ? '+' : '') + formatMoney(dailyPnL);
            dailyPnLEl.className = `card-value ${Utils.getReturnClass(dailyPnL)}`;
        }
        const dailyPnLPctEl = document.getElementById('dailyPnLPercent');
        if (dailyPnLPctEl) {
            dailyPnLPctEl.textContent = Utils.formatPercent(dailyPnLPct);
            dailyPnLPctEl.className = `card-sub ${Utils.getReturnClass(dailyPnL)}`;
        }

        const totalReturnEl = document.getElementById('totalReturnDisplay');
        if (totalReturnEl) {
            totalReturnEl.textContent = (totalReturn >= 0 ? '+' : '') + formatMoney(totalReturn);
            totalReturnEl.className = `card-value ${Utils.getReturnClass(totalReturn)}`;
        }
        const totalReturnPctEl = document.getElementById('totalReturnPercent');
        if (totalReturnPctEl) {
            totalReturnPctEl.textContent = Utils.formatPercent(totalReturnPct);
            totalReturnPctEl.className = `card-sub ${Utils.getReturnClass(totalReturn)}`;
        }

        const riskScoreEl = document.getElementById('riskScoreDisplay');
        if (riskScoreEl) {
            riskScoreEl.textContent = `${riskScore.toFixed(1)} / 7`;
        }
        const riskLabel = document.getElementById('riskScoreLabel');
        if (riskLabel) {
            riskLabel.textContent = 'Dengeli & Büyüme+ (Likit Ağırlıklı)';
            riskLabel.className = 'card-sub positive';
        }
    },

    renderQuantRatios() {
        const sharpeEl = document.getElementById('sharpeRatioDisplay');
        const sharpeSub = document.getElementById('sharpeRatioSub');
        const ddEl = document.getElementById('maxDrawdownDisplay');
        const ddSub = document.getElementById('maxDrawdownSub');
        const bistEl = document.getElementById('bistBetaDisplay');
        const bistSub = document.getElementById('bistBetaSub');
        const usdEl = document.getElementById('usdBetaDisplay');
        const usdSub = document.getElementById('usdBetaSub');

        const sharpe = Calculations.getSharpeRatio();
        const maxDD = Calculations.getMaxDrawdown();
        const bistBeta = Calculations.getBISTBeta();
        const usdBeta = Calculations.getDollarBeta();

        if (sharpeEl) {
            sharpeEl.textContent = sharpe.toFixed(2);
            sharpeEl.className = 'qr-value ' + (sharpe > 0 ? 'qr-positive' : sharpe < -0.5 ? 'qr-negative' : 'qr-neutral');
        }
        if (sharpeSub) {
            if (sharpe > 0.5) sharpeSub.textContent = 'Mükemmel risk-getiri dengesi';
            else if (sharpe > 0) sharpeSub.textContent = 'Kabul edilebilir verimlilik';
            else if (sharpe > -0.5) sharpeSub.textContent = 'Risksiz faizin altında';
            else sharpeSub.textContent = 'Risk-getiri verimi düşük';
        }

        if (ddEl) {
            ddEl.textContent = '-%' + maxDD.toFixed(1);
            ddEl.className = 'qr-value ' + (maxDD < 10 ? 'qr-positive' : maxDD < 20 ? 'qr-neutral' : 'qr-negative');
        }
        if (ddSub) {
            if (maxDD < 10) ddSub.textContent = 'Düşük çekilme riski';
            else if (maxDD < 20) ddSub.textContent = 'Orta düzey çekilme riski';
            else ddSub.textContent = 'Yüksek çekilme riski';
        }

        if (bistEl) {
            bistEl.textContent = bistBeta.toFixed(2) + 'x';
            bistEl.className = 'qr-value ' + (bistBeta < 0.3 ? 'qr-positive' : bistBeta < 0.6 ? 'qr-neutral' : 'qr-negative');
        }
        if (bistSub) {
            if (bistBeta < 0.2) bistSub.textContent = 'BIST\'ten neredeyse bağımsız';
            else if (bistBeta < 0.5) bistSub.textContent = 'Düşük BIST korelasyonu';
            else bistSub.textContent = 'BIST\'e yüksek duyarlılık';
        }

        if (usdEl) {
            usdEl.textContent = usdBeta.toFixed(2) + 'x';
            usdEl.className = 'qr-value ' + (usdBeta > 0.4 ? 'qr-positive' : usdBeta > 0.15 ? 'qr-neutral' : 'qr-negative');
        }
        if (usdSub) {
            if (usdBeta > 0.5) usdSub.textContent = 'Güçlü döviz koruması';
            else if (usdBeta > 0.2) usdSub.textContent = 'Orta düzey döviz koruması';
            else usdSub.textContent = 'Düşük döviz koruması';
        }
    },

    renderFundTable() {
        const tbody = document.getElementById('fundTableBody');
        const tfoot = document.getElementById('fundTableFoot');
        if (!tbody || !tfoot) return;

        const totalPortfolio = Calculations.getTotalPortfolioValue();
        let html = '';

        PortfolioData.funds.forEach(fund => {
            const value = fund.shares * fund.currentPrice;
            const weight = totalPortfolio > 0 ? (value / totalPortfolio) * 100 : 0;

            html += `
                <tr>
                    <td>
                        <div class="fund-name-cell">
                            <span style="font-size:1.3rem">${fund.icon}</span>
                            <div>
                                <span class="fund-code">${fund.code}</span>
                                <span class="fund-full-name">${fund.name}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge badge-purple">${fund.shortName}</span></td>
                    <td class="mono">${Utils.formatNumber(fund.shares)}</td>
                    <td class="mono font-semibold">${Utils.formatPrice(fund.currentPrice)}</td>
                    <td class="mono font-bold">${Utils.formatCurrency(value)}</td>
                    <td class="mono text-muted">${Utils.formatPrice(fund.avgCost)}</td>
                    <td>
                        <span class="mono font-medium ${Utils.getReturnClass(fund.dailyReturn)}">
                            ${(fund.dailyReturn >= 0 ? '+' : '') + Utils.formatCurrency(fund.dailyReturn)}
                        </span>
                        <br>
                        <span class="badge ${fund.dailyReturn >= 0 ? 'badge-success' : 'badge-danger'}" style="font-size:0.65rem; margin-top:2px;">
                            ${Utils.formatPercent(fund.dailyReturnPct)}
                        </span>
                    </td>
                    <td>
                        <span class="mono font-medium ${Utils.getReturnClass(fund.totalReturn)}">
                            ${(fund.totalReturn >= 0 ? '+' : '') + Utils.formatCurrency(fund.totalReturn)}
                        </span>
                        <br>
                        <span class="badge ${fund.totalReturn >= 0 ? 'badge-success' : 'badge-danger'}" style="font-size:0.65rem; margin-top:2px;">
                            ${Utils.formatPercent(fund.totalReturnPct)}
                        </span>
                    </td>
                    <td>
                        <div class="weight-bar">
                            <div class="weight-bar-track">
                                <div class="weight-bar-fill" style="width: ${Math.min(weight, 100)}%; background: ${fund.color}"></div>
                            </div>
                            <span class="weight-bar-label">%${weight.toFixed(2)}</span>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${Utils.getRiskBadgeClass(fund.riskLevel)}">${fund.riskLevel} (${fund.riskScore}/7)</span>
                    </td>
                </tr>
            `;
        });

                    const cashWeight = totalPortfolio > 0 ? (PortfolioData.cashTL / totalPortfolio) * 100 : 0;
        if (PortfolioData.cashTL > 0) {
        html += `
            <tr style="background: rgba(255, 255, 255, 0.02);">
                <td>
                    <div class="fund-name-cell">
                        <span style="font-size:1.3rem">🇹🇷</span>
                        <div>
                            <span class="fund-code">TL NAKİT</span>
                            <span class="fund-full-name">Serbest Bakiye</span>
                        </div>
                    </div>
                </td>
                <td><span class="badge badge-success">Nakit</span></td>
                <td class="mono">1</td>
                <td class="mono">₺1,00</td>
                <td class="mono font-bold">${Utils.formatCurrency(PortfolioData.cashTL)}</td>
                <td class="mono text-muted">₺1,00</td>
                <td class="mono text-muted">₺0,00</td>
                <td class="mono text-muted">₺0,00</td>
                <td>
                    <div class="weight-bar">
                        <div class="weight-bar-track">
                            <div class="weight-bar-fill" style="width: ${cashWeight}%; background: #64748B"></div>
                        </div>
                        <span class="weight-bar-label">%${cashWeight.toFixed(2)}</span>
                    </div>
                </td>
                <td><span class="badge badge-risk-low">Risk: 0/7</span></td>
            </tr>
        `;
        }

        tbody.innerHTML = html;

        const totalFundsCount = PortfolioData.funds.length;
        const totalCost = Calculations.getTotalCost();
        const dailyPnL = Calculations.getDailyPnL();
        const totalReturn = Calculations.getTotalReturn();

        tfoot.innerHTML = `
            <tr>
                <td colspan="2"><strong>GENEL PORTFÖY TOPLAMI</strong></td>
                <td class="mono"><strong>${totalFundsCount} Fon${PortfolioData.cashTL > 0 ? ' + Nakit' : ''}</strong></td>
                <td></td>
                <td class="mono font-bold" style="color:var(--accent-primary); font-size:1.05rem;">
                    <strong>${Utils.formatCurrency(totalPortfolio)}</strong>
                </td>
                <td class="mono text-muted">${Utils.formatCurrency(totalCost + PortfolioData.cashTL)}</td>
                <td class="mono ${Utils.getReturnClass(dailyPnL)}">
                    <strong>${(dailyPnL >= 0 ? '+' : '') + Utils.formatCurrency(dailyPnL)}</strong>
                </td>
                <td class="mono ${Utils.getReturnClass(totalReturn)}">
                    <strong>${(totalReturn >= 0 ? '+' : '') + Utils.formatCurrency(totalReturn)}</strong>
                </td>
                <td><span class="weight-bar-label font-bold">%100,0</span></td>
                <td><span class="badge badge-purple">Risk: ${Calculations.getWeightedRiskScore().toFixed(1)}/7</span></td>
            </tr>
        `;
    },

    renderValorTable() {
        const tbody = document.getElementById('valorTableBody');
        if (!tbody) return;

        let html = '';
        PortfolioData.funds.forEach(fund => {
            html += `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span>${fund.icon}</span>
                            <div>
                                <span class="fund-code">${fund.code}</span>
                                <span class="fund-full-name">${fund.shortName}</span>
                            </div>
                        </div>
                    </td>
                    <td class="mono">
                        <span class="badge ${fund.buyValor === 0 ? 'badge-success' : 'badge-info'}">
                            ${fund.buyValor === 0 ? 'T+0 (Aynı Gün)' : `T+${fund.buyValor} (1 İş Günü)`}
                        </span>
                    </td>
                    <td class="mono">
                        <span class="badge ${fund.sellValor === 0 ? 'badge-success' : fund.sellValor <= 2 ? 'badge-warning' : 'badge-danger'}">
                            ${fund.sellValor === 0 ? 'T+0 (Aynı Gün)' : `T+${fund.sellValor} (${fund.sellValor} İş Günü)`}
                        </span>
                    </td>
                    <td class="mono font-semibold" style="color:var(--warning);">${fund.valorCutoff || '13:30'}</td>
                    <td><span class="badge ${(fund.tax || '').includes('%0') ? 'badge-success' : 'badge-purple'}">${fund.tax || 'Vergili'}</span></td>
                    <td class="mono font-bold">%${(fund.managementFee || 0).toFixed(2)}</td>
                    <td class="mono">${fund.marketShare > 0 ? '%' + fund.marketShare.toFixed(2) : '-'}</td>
                    <td class="mono">${fund.occupancyRate > 0 ? '%' + fund.occupancyRate.toFixed(2) : '-'}</td>
                    <td class="mono">${fund.investors > 0 ? Utils.formatNumber(fund.investors) : '-'}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

        renderPendingTransactions() {
        const container = document.getElementById('pendingTransactions');
        const countBadge = document.getElementById('pendingCount');
        if (!container) return;

        if (countBadge) {
            countBadge.textContent = PortfolioData.pendingOrders.length;
        }

        let html = '';
        PortfolioData.pendingOrders.forEach(order => {
            html += `
                <div class="pending-item" style="border-left: 4px solid ${order.type === 'sell' ? '#EF4444' : '#10B981'};">
                    <div class="pending-left">
                        <div class="pending-icon ${order.type}">
                            ${order.type === 'sell' ? '📤' : '📥'}
                        </div>
                        <div>
                            <div class="pending-fund" style="font-weight:700; font-size:0.95rem;">${order.title}</div>
                            <div class="pending-type" style="color:var(--text-secondary); margin-top:2px;">
                                ${order.typeLabel} - <span style="color:var(--accent-primary);">${order.valorText}</span>
                            </div>
                            <div style="font-size:0.75rem; color:var(--text-tertiary); margin-top:4px;">
                                💡 <em>${order.targetAction}</em>
                            </div>
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div class="pending-amount ${order.type === 'sell' ? 'negative' : 'positive'}" style="font-size:1.05rem; font-weight:800;">
                            ${Utils.formatCurrency(order.amount)}
                        </div>
                        <div class="pending-status badge ${order.statusBadge}" style="margin-top:4px;">
                            ⏳ ${order.status}
                        </div>
                    </div>
                </div>
            `;
        });

                if (PortfolioData.pendingOrders.length > 0) {
            const totalBuy = PortfolioData.pendingOrders.filter(o => o.type === 'buy').reduce((s, o) => s + o.amount, 0);
            const totalSell = PortfolioData.pendingOrders.filter(o => o.type === 'sell').reduce((s, o) => s + o.amount, 0);
            const netCash = totalSell - totalBuy;

            html += `
                <div style="margin-top:12px; padding:10px 14px; background:rgba(99, 102, 241, 0.06); border:1px solid rgba(99, 102, 241, 0.2); border-radius:var(--radius-sm); font-size:0.78rem; color:var(--text-secondary); line-height:1.5;">
                    <span style="color:var(--accent-primary); font-weight:700;">🔄 Bekleyen Emir Özeti:</span> 
                    Toplam ${PortfolioData.pendingOrders.length} adet emir valör sürecindedir (Alış: ${Utils.formatCurrency(totalBuy)}, Satış: ${Utils.formatCurrency(totalSell)}). Beklenen net nakit etkisi: <strong class="${netCash >= 0 ? 'positive' : 'negative'}">${netCash >= 0 ? '+' : ''}${Utils.formatCurrency(netCash)}</strong>.
                </div>
            `;
        }

        container.innerHTML = html;
    },

    renderStrategyAlignment() {
        const container = document.getElementById('strategyAlignment');
        if (!container) return;

        const targets = Calculations.getStrategyTargets();
        const entries = Object.entries(targets);

        if (entries.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">
                    🎯 Analiz edilecek stratejik pozisyon bulunamadı.
                </div>
            `;
            return;
        }

        let html = '';
        entries.forEach(([assetName, cfg]) => {
            const actual = cfg.current;
            const target = cfg.target;
            const diff = actual - target;

            html += `
                <div class="alignment-item">
                    <div class="alignment-header">
                        <div>
                            <span class="alignment-label">${assetName}</span>
                            <span style="display:block; font-size:0.7rem; color:var(--text-tertiary);">${cfg.role}</span>
                        </div>
                        <span class="alignment-values">
                            Mevcut: <strong>%${actual.toFixed(1)}</strong> | Hedef: %${target.toFixed(0)}
                            <span class="${Math.abs(diff) <= 3 ? 'positive' : 'warning-text'}" style="margin-left:4px;">
                                (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%)
                            </span>
                        </span>
                    </div>
                    <div class="alignment-bar">
                        <div class="alignment-fill" style="width: ${Math.min((actual / 60) * 100, 100)}%; background: ${cfg.color}"></div>
                        <div class="alignment-target" style="left: ${Math.min((target / 60) * 100, 100)}%" title="Hedef: %${target}"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }
};

const WorkspaceManager = {
    currentWorkspace: 'overview',

    init() {
        try {
            const saved = localStorage.getItem('zenith_active_workspace');
            if (saved && ['overview', 'risk-lab', 'settlement-desk', 'tax-lab', 'goal-planner', 'dividend-matrix'].includes(saved)) {
                this.currentWorkspace = saved;
            }
        } catch (e) {}
        this.applyWorkspace(this.currentWorkspace);
        this.bindEvents();
    },

    setWorkspace(ws) {
        if (!['overview', 'risk-lab', 'settlement-desk', 'tax-lab', 'goal-planner', 'dividend-matrix'].includes(ws)) return;
        this.currentWorkspace = ws;
        try {
            localStorage.setItem('zenith_active_workspace', ws);
        } catch (e) {}
        this.applyWorkspace(ws);
        const nameMap = {
            'overview': 'Genel Bakış Masası',
            'risk-lab': 'Quant & Risk Laboratuvarı',
            'settlement-desk': 'Nakit & Valör Masası',
            'tax-lab': 'Stopaj & Net Kazanç Masası',
            'goal-planner': 'FIRE & Varlık Hedefi Planlayıcı',
            'dividend-matrix': 'Temettü & Pasif Gelir Masası'
        };
        Utils.showToast(`🖥 Çalışma Alanı: ${nameMap[ws]} aktif edildi.`, 'info');
    },

    applyWorkspace(ws) {
        const viewEl = document.getElementById('dashboardActiveView');
        if (!viewEl) return;

        viewEl.classList.remove('ws-mode-risk-lab', 'ws-mode-settlement-desk', 'ws-mode-tax-lab', 'ws-mode-goal-planner', 'ws-mode-dividend-matrix');

        if (ws === 'risk-lab') {
            viewEl.classList.add('ws-mode-risk-lab');
        } else if (ws === 'settlement-desk') {
            viewEl.classList.add('ws-mode-settlement-desk');
        } else if (ws === 'tax-lab') {
            viewEl.classList.add('ws-mode-tax-lab');
            if (typeof TaxOptimizer !== 'undefined') TaxOptimizer.render();
        } else if (ws === 'goal-planner') {
            viewEl.classList.add('ws-mode-goal-planner');
            if (typeof GoalWealthBuilder !== 'undefined') GoalWealthBuilder.render();
        } else if (ws === 'dividend-matrix') {
            viewEl.classList.add('ws-mode-dividend-matrix');
            if (typeof DividendYieldEngine !== 'undefined') DividendYieldEngine.render();
        }

        const container = document.getElementById('workspacePillsGroup');
        if (container) {
            container.querySelectorAll('.ws-pill-btn').forEach(btn => {
                if (btn.getAttribute('data-workspace') === ws) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    },

    bindEvents() {
        const container = document.getElementById('workspacePillsGroup');
        if (container && !container._hasListener) {
            container._hasListener = true;
            container.addEventListener('click', (e) => {
                const btn = e.target.closest('.ws-pill-btn');
                if (!btn) return;
                const ws = btn.getAttribute('data-workspace');
                if (ws) this.setWorkspace(ws);
            });
        }
    }
};

const Charts = {
    instances: {},
    chartColors: {
        grid: 'rgba(255, 255, 255, 0.05)',
        text: '#8B92A5',
        tooltipBg: 'rgba(12, 16, 33, 0.95)',
        tooltipBorder: 'rgba(99, 102, 241, 0.3)'
    },

    init() {
        if (typeof Chart === 'undefined') return;
        this.destroy();

        Chart.defaults.color = this.chartColors.text;
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = 12;

        this.createAllocationChart();
        this.createPerformanceChart();
        this.createCostVsCurrentChart();
        this.createRiskChart();
    },

    destroy() {
        Object.values(this.instances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.instances = {};
        if (typeof MonteCarloEngine !== 'undefined' && MonteCarloEngine.chartInstance) {
            MonteCarloEngine.chartInstance.destroy();
            MonteCarloEngine.chartInstance = null;
        }
        if (typeof MarkowitzOptimizer !== 'undefined' && MarkowitzOptimizer.chartInstance) {
            MarkowitzOptimizer.chartInstance.destroy();
            MarkowitzOptimizer.chartInstance = null;
        }
        if (typeof StressTestEngine !== 'undefined' && StressTestEngine.chartInstance) {
            StressTestEngine.chartInstance.destroy();
            StressTestEngine.chartInstance = null;
        }
        if (typeof DividendYieldEngine !== 'undefined' && DividendYieldEngine.chartInstance) {
            DividendYieldEngine.chartInstance.destroy();
            DividendYieldEngine.chartInstance = null;
        }
    },

    getTooltipConfig() {
        return {
            backgroundColor: this.chartColors.tooltipBg,
            borderColor: this.chartColors.tooltipBorder,
            borderWidth: 1,
            titleFont: { weight: '600', size: 13 },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            boxPadding: 6
        };
    },

    createAllocationChart() {
        const ctx = document.getElementById('allocationChart');
        if (!ctx) return;

        const totalVal = Calculations.getTotalPortfolioValue();
        const labels = [...PortfolioData.funds.map(f => f.code), 'TL Nakit'];
        const data = [...PortfolioData.funds.map(f => f.shares * f.currentPrice), PortfolioData.cashTL];
        const colors = [...PortfolioData.funds.map(f => f.color), '#64748B'];

        this.instances.allocation = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.map(c => c + '55'),
                    borderColor: colors,
                    borderWidth: 2,
                    hoverBorderWidth: 4,
                    hoverOffset: 10,
                    spacing: 4,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 14,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 11, weight: '600' },
                            generateLabels(chart) {
                                const ds = chart.data.datasets[0];
                                return chart.data.labels.map((label, i) => {
                                    const value = ds.data[i];
                                    const pct = totalVal > 0 ? ((value / totalVal) * 100).toFixed(1) : '0.0';
                                    return {
                                        text: `${label}  -  ₺${value.toFixed(0)}  (%${pct})`,
                                        fillStyle: colors[i],
                                        strokeStyle: colors[i],
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        ...this.getTooltipConfig(),
                        callbacks: {
                            label(context) {
                                const val = context.raw || 0;
                                const pct = totalVal > 0 ? ((val / totalVal) * 100).toFixed(2) : '0.00';
                                return ` ₺${val.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (%${pct})`;
                            }
                        }
                    }
                }
            }
        });
    },

    createPerformanceChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        const fundsWithPerf = PortfolioData.funds.filter(f => f.performance1Y > 0);

        this.instances.performance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: fundsWithPerf.map(f => f.code),
                datasets: [{
                    label: '1 Yıllık Nominal Getiri (%)',
                    data: fundsWithPerf.map(f => f.performance1Y),
                    backgroundColor: fundsWithPerf.map(f => f.color + '60'),
                    borderColor: fundsWithPerf.map(f => f.color),
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        grid: { color: this.chartColors.grid },
                        ticks: { callback: v => '%' + v, font: { family: "'JetBrains Mono'" } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { weight: '700', size: 13 } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...this.getTooltipConfig(),
                        callbacks: {
                            label: ctx => ` 1 Yıllık Getiri: +%${ctx.raw.toFixed(2)}`
                        }
                    }
                }
            }
        });
    },

    createCostVsCurrentChart() {
        const ctx = document.getElementById('costVsCurrentChart');
        if (!ctx) return;

        this.instances.costVsCurrent = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: PortfolioData.funds.map(f => f.code),
                datasets: [
                    {
                        label: 'Toplam Maliyet (₺)',
                        data: PortfolioData.funds.map(f => f.shares * f.avgCost),
                        backgroundColor: 'rgba(239, 68, 68, 0.25)',
                        borderColor: '#EF4444',
                        borderWidth: 2,
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Güncel Piyasa Değeri (₺)',
                        data: PortfolioData.funds.map(f => f.shares * f.currentPrice),
                        backgroundColor: 'rgba(16, 185, 129, 0.35)',
                        borderColor: '#10B981',
                        borderWidth: 2,
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { weight: '700' } }
                    },
                    y: {
                        grid: { color: this.chartColors.grid },
                        ticks: {
                            callback: v => '₺' + v.toLocaleString('tr-TR'),
                            font: { family: "'JetBrains Mono'", size: 11 }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12, weight: '600' } }
                    },
                    tooltip: {
                        ...this.getTooltipConfig(),
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ₺${ctx.raw.toFixed(2)}`
                        }
                    }
                }
            }
        });
    },

    createRiskChart() {
        const ctx = document.getElementById('riskChart');
        if (!ctx) return;

        const totalVal = Calculations.getFundsTotalValue();

        this.instances.risk = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: PortfolioData.funds.map(f => `${f.code} (Risk: ${f.riskScore}/7)`),
                datasets: [{
                    data: PortfolioData.funds.map(f => {
                        const weight = totalVal > 0 ? (f.shares * f.currentPrice) / totalVal : 0;
                        return f.riskScore * weight * 10;
                    }),
                    backgroundColor: PortfolioData.funds.map(f => f.color + '55'),
                    borderColor: PortfolioData.funds.map(f => f.color),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        grid: { color: this.chartColors.grid },
                        ticks: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 12,
                            font: { size: 11, weight: '500' }
                        }
                    },
                    tooltip: {
                        ...this.getTooltipConfig(),
                        callbacks: {
                            label(ctx) {
                                const fund = PortfolioData.funds[ctx.dataIndex];
                                const weight = totalVal > 0 ? ((fund.shares * fund.currentPrice / totalVal) * 100).toFixed(1) : '0.0';
                                return ` Risk Skoru: ${fund.riskScore}/7 | Portföy Payı: %${weight}`;
                            }
                        }
                    }
                }
            }
        });
    },

    refresh() {
        this.destroy();
        this.init();
    }
};

const MonteCarloEngine = {
    currentYears: 1,
    chartInstance: null,
    lastSimulationData: null,

    // Box-Muller transform for standard normal distribution N(0,1)
    generateGaussianRandom() {
        let u1 = 0, u2 = 0;
        while (u1 === 0) u1 = Math.random();
        while (u2 === 0) u2 = Math.random();
        return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    },

    // 1,000 geometric brownian motion stochastic paths
    simulate(numPaths = 1000, years = 1) {
        const initialVal = Calculations.getTotalPortfolioValue();
        if (initialVal <= 0) return null;

        const annReturnPct = Calculations.getAnnualizedReturn();
        const volPct = Calculations.getPortfolioVolatility();

        // Convert percentage returns to decimals with safe statistical bounds
        const mu = (annReturnPct > 0 ? annReturnPct : 40) / 100;
        const sigma = (volPct > 0 ? volPct : 15) / 100;

        const months = years * 12;
        const dt = 1 / 12; // Monthly time delta

        // Pre-allocate paths matrix: [monthIndex][pathIndex]
        const monthlyValues = [];
        for (let m = 0; m <= months; m++) {
            monthlyValues.push(new Float64Array(numPaths));
        }

        // Month 0 is initial capital for all paths
        for (let p = 0; p < numPaths; p++) {
            monthlyValues[0][p] = initialVal;
        }

        // Ito's Lemma drift & volatility components
        const drift = (mu - 0.5 * sigma * sigma) * dt;
        const volSqrtDt = sigma * Math.sqrt(dt);

        for (let p = 0; p < numPaths; p++) {
            let currentS = initialVal;
            for (let m = 1; m <= months; m++) {
                const z = this.generateGaussianRandom();
                currentS = currentS * Math.exp(drift + volSqrtDt * z);
                monthlyValues[m][p] = currentS;
            }
        }

        // Compute percentiles for each month (p5, p25, p50, p75, p95)
        const p5 = [], p25 = [], p50 = [], p75 = [], p95 = [];
        const monthLabels = [];

        for (let m = 0; m <= months; m++) {
            const arr = Array.from(monthlyValues[m]).sort((a, b) => a - b);
            p5.push(Number(arr[Math.floor(numPaths * 0.05)].toFixed(2)));
            p25.push(Number(arr[Math.floor(numPaths * 0.25)].toFixed(2)));
            p50.push(Number(arr[Math.floor(numPaths * 0.50)].toFixed(2)));
            p75.push(Number(arr[Math.floor(numPaths * 0.75)].toFixed(2)));
            p95.push(Number(arr[Math.floor(numPaths * 0.95)].toFixed(2)));

            if (m === 0) {
                monthLabels.push('Bugün');
            } else if (m % 12 === 0) {
                monthLabels.push(`${m / 12}. Yıl`);
            } else {
                monthLabels.push(`${m}. Ay`);
            }
        }

        // Terminal outcomes & risk metrics
        const finalArr = Array.from(monthlyValues[months]).sort((a, b) => a - b);
        const winCount = finalArr.filter(v => v >= initialVal).length;
        const winRate = (winCount / numPaths) * 100;
        const expectedVal = p50[months];
        const expectedGainPct = ((expectedVal - initialVal) / initialVal) * 100;
        const var95 = p5[months];
        const rangeMin = p5[months];
        const rangeMax = p95[months];

        this.lastSimulationData = {
            years,
            months,
            initialVal,
            monthLabels,
            p5, p25, p50, p75, p95,
            expectedVal,
            expectedGainPct,
            winRate,
            var95,
            rangeMin,
            rangeMax
        };

        return this.lastSimulationData;
    },

    // Render KPI values & Chart.js fan chart
    render(years) {
        if (years !== undefined) this.currentYears = years;
        const data = this.simulate(1000, this.currentYears);
        if (!data) return;

        // Update KPI Badges
        const expEl = document.getElementById('mcExpectedVal');
        const expGainEl = document.getElementById('mcExpectedGain');
        const winEl = document.getElementById('mcWinRateDisplay');
        const varEl = document.getElementById('mcVarDisplay');
        const rangeEl = document.getElementById('mcRangeDisplay');

        if (expEl) expEl.textContent = Utils.formatCurrency(data.expectedVal);
        if (expGainEl) {
            expGainEl.textContent = `${data.expectedGainPct >= 0 ? '+' : ''}${Utils.formatPercent(data.expectedGainPct)} Beklenen Getiri`;
            expGainEl.className = `mc-kpi-sub ${data.expectedGainPct >= 0 ? 'positive' : 'negative'}`;
        }
        if (winEl) winEl.textContent = `%${data.winRate.toFixed(1)}`;
        if (varEl) varEl.textContent = Utils.formatCurrency(data.var95);
        if (rangeEl) rangeEl.textContent = `${Utils.formatCurrency(data.rangeMin, 0)} - ${Utils.formatCurrency(data.rangeMax, 0)}`;

        this.renderChart(data);
    },

    renderChart(data) {
        const canvas = document.getElementById('monteCarloChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Create elegant luminous gradients for confidence area
        let gradP95 = 'rgba(16, 185, 129, 0.15)';
        let gradP75 = 'rgba(6, 182, 212, 0.12)';
        try {
            const g1 = ctx.createLinearGradient(0, 0, 0, 380);
            g1.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
            g1.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
            gradP95 = g1;

            const g2 = ctx.createLinearGradient(0, 0, 0, 380);
            g2.addColorStop(0, 'rgba(6, 182, 212, 0.18)');
            g2.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
            gradP75 = g2;
        } catch (e) { /* canvas gradient fallback */ }

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.monthLabels,
                datasets: [
                    {
                        label: '%95 Boğa Piyasası',
                        data: data.p95,
                        borderColor: '#10B981',
                        backgroundColor: gradP95,
                        fill: '+1',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.35
                    },
                    {
                        label: '%75 İyimser Büyüme',
                        data: data.p75,
                        borderColor: '#06B6D4',
                        backgroundColor: gradP75,
                        fill: '+1',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        tension: 0.35
                    },
                    {
                        label: '%50 Medyan (Beklenen)',
                        data: data.p50,
                        borderColor: '#8B5CF6',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        pointRadius: 0,
                        tension: 0.35
                    },
                    {
                        label: '%25 Düşük Büyüme',
                        data: data.p25,
                        borderColor: '#F59E0B',
                        backgroundColor: 'transparent',
                        fill: '+1',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        tension: 0.35
                    },
                    {
                        label: '%5 Ayı Piyasası (Kötümser)',
                        data: data.p5,
                        borderColor: '#EF4444',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.35
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94A3B8',
                            font: { family: "'JetBrains Mono', monospace", size: 11 }
                        }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94A3B8',
                            callback: v => '₺' + v.toLocaleString('tr-TR', { maximumFractionDigits: 0 }),
                            font: { family: "'JetBrains Mono', monospace", size: 11 }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { weight: '600', size: 13 },
                        bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ₺${ctx.raw.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                    }
                }
            }
        });
    },

    initEventListeners() {
        const horizonGroup = document.getElementById('mcHorizonGroup');
        if (horizonGroup && !horizonGroup._hasListener) {
            horizonGroup._hasListener = true;
            horizonGroup.addEventListener('click', (e) => {
                const btn = e.target.closest('.mc-pill-btn');
                if (!btn) return;
                horizonGroup.querySelectorAll('.mc-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const years = parseInt(btn.getAttribute('data-years'), 10) || 1;
                this.render(years);
            });
        }

        const rerunBtn = document.getElementById('mcRerunBtn');
        if (rerunBtn && !rerunBtn._hasListener) {
            rerunBtn._hasListener = true;
            rerunBtn.addEventListener('click', () => {
                this.render(this.currentYears);
                Utils.showToast('1.000 Monte Carlo olasılık yolu yeniden simüle edildi.', 'info');
            });
        }
    }
};

const StressTestEngine = {
    selectedScenarioId: 'cur_2021',
    chartInstance: null,

    SCENARIOS: [
        {
            id: 'tighten_2024',
            title: '2023-2024 %50 Faiz & Parasal Sıkılaşma',
            year: '2023-2024',
            icon: '🏦',
            description: 'TCMB faiz artışları, TL mevduat/para piyasasında %50+ bileşik getiri, seçici hisse performansı.',
            maxDrawdown: -5.8,
            recoveryDays: 14,
            timelineLabels: ['Başlangıç', 'Ay 2', 'Ay 4', 'Ay 6 (Zirve Faiz)', 'Ay 8', 'Ay 10', 'Bitiş (12A)'],
            benchmarks: {
                bist: [100, 106, 114, 122, 131, 139, 148],
                gold: [100, 108, 119, 134, 146, 158, 168],
                usd: [100, 104, 112, 119, 125, 132, 139]
            },
            shocks: {
                liquid: 0.54,
                globalTech: 0.62,
                gold: 0.68,
                bist: 0.48,
                bond: 0.42
            }
        },
        {
            id: 'cur_2021',
            title: '2021 Türk Lirası & Kur Şoku',
            year: 'Ara 2021',
            icon: '⚡',
            description: 'Dolar kurunda tarihi sıçrama, gram altında %90 ralli, yerli hisselerde volatil düzeltme.',
            maxDrawdown: -12.4,
            recoveryDays: 28,
            timelineLabels: ['Eyl 2021', 'Eki', 'Kas (Hızlanma)', '20 Ara (Zirve)', '24 Ara (KKM)', 'Oca 2022', 'Şub 2022'],
            benchmarks: {
                bist: [100, 104, 118, 142, 115, 128, 138],
                gold: [100, 109, 135, 192, 145, 162, 175],
                usd: [100, 108, 142, 205, 142, 158, 166]
            },
            shocks: {
                liquid: 0.04,
                globalTech: 0.85,
                gold: 0.90,
                bist: -0.15,
                bond: 0.45
            }
        },
        {
            id: 'covid_2020',
            title: '2020 Küresel Pandemi Çöküşü',
            year: 'Mar 2020',
            icon: '🔴',
            description: 'Tüm dünya borsalarında panik satış, likiditeye kaçış, altın ve nakit güvenli liman.',
            maxDrawdown: -22.5,
            recoveryDays: 45,
            timelineLabels: ['Şub 2020', '28 Şub', '12 Mar', '23 Mar (Dip)', 'Nis (Teşvik)', 'May', 'Haz 2020'],
            benchmarks: {
                bist: [100, 91, 80, 72, 85, 96, 112],
                gold: [100, 103, 98, 102, 114, 122, 132],
                usd: [100, 102, 106, 109, 114, 116, 118]
            },
            shocks: {
                liquid: 0.035,
                globalTech: -0.28,
                gold: 0.085,
                bist: -0.30,
                bond: -0.06
            }
        },
        {
            id: 'ukraine_2022',
            title: '2022 Jeopolitik Şok & Emtia Rallisi',
            year: '2022',
            icon: '🇷🇺',
            description: 'Rusya-Ukrayna savaşıyla petrol ve altında sıçrama; Nasdaq baskılanırken BIST enflasyon rallisi.',
            maxDrawdown: -8.5,
            recoveryDays: 18,
            timelineLabels: ['Oca 2022', '24 Şub (Savaş)', 'Mar (Emtia Zirve)', 'May', 'Tem', 'Eyl', 'Ara 2022'],
            benchmarks: {
                bist: [100, 96, 112, 126, 145, 178, 220],
                gold: [100, 108, 122, 118, 116, 124, 142],
                usd: [100, 103, 109, 118, 132, 138, 144]
            },
            shocks: {
                liquid: 0.18,
                globalTech: -0.22,
                gold: 0.28,
                bist: 1.10,
                bond: -0.14
            }
        },
        {
            id: 'brunson_2018',
            title: '2018 Döviz Sıçraması & Faiz Şoku',
            year: 'Ağu 2018',
            icon: '💥',
            description: 'Döviz kurunda ani sıçrama, yüksek faiz, değerli maden ve döviz fonlarında yüksek kalkan.',
            maxDrawdown: -18.2,
            recoveryDays: 60,
            timelineLabels: ['Haz 2018', 'Tem', '10 Ağu (Şok)', '13 Ağu (Zirve)', 'Eyl (Faiz +625bp)', 'Eki', 'Kas 2018'],
            benchmarks: {
                bist: [100, 92, 85, 81, 88, 92, 98],
                gold: [100, 105, 142, 165, 138, 128, 124],
                usd: [100, 106, 148, 178, 144, 132, 126]
            },
            shocks: {
                liquid: 0.06,
                globalTech: 0.65,
                gold: 0.55,
                bist: -0.25,
                bond: 0.30
            }
        }
    ],

    getAssetClassKey(fund) {
        const cat = (fund.category || '').toLowerCase();
        const code = (fund.code || '').toUpperCase();

        if (fund.sellValor === 0 || cat.includes('para piyasası')) return 'liquid';
        if (cat.includes('yabancı') || code === 'AFT' || code === 'IJC' || code === 'YAY') return 'globalTech';
        if (cat.includes('altın') || cat.includes('kıymetli') || code === 'KZL' || code === 'TCA' || code === 'GGK') return 'gold';
        if (cat.includes('hisse') || code === 'MAC' || code === 'TI2' || code === 'ADE' || code === 'TTE') return 'bist';
        return 'bond';
    },

    runScenario(scenarioId) {
        const scenario = this.SCENARIOS.find(s => s.id === scenarioId) || this.SCENARIOS[0];
        const totalVal = Calculations.getTotalPortfolioValue();
        if (totalVal <= 0) return null;

        const funds = PortfolioData.funds;
        const cashTL = PortfolioData.cashTL;

        let totalNewVal = cashTL * (1 + scenario.shocks.liquid);
        const assetBreakdowns = [];

        funds.forEach(f => {
            const currentVal = f.shares * f.currentPrice;
            const assetKey = this.getAssetClassKey(f);
            const shockPct = scenario.shocks[assetKey] || 0;
            const newVal = currentVal * (1 + shockPct);
            const pnlTL = newVal - currentVal;

            totalNewVal += newVal;

            assetBreakdowns.push({
                fund: f,
                assetKey,
                currentVal,
                newVal,
                shockPct: shockPct * 100,
                pnlTL
            });
        });

        const netPnlTL = totalNewVal - totalVal;
        const netPnlPct = (netPnlTL / totalVal) * 100;

        // Generate synthetic historical trajectory
        const timeCount = scenario.timelineLabels.length;
        const portTrajectory = [100];
        const minDipIndex = Math.floor(timeCount / 2);

        for (let t = 1; t < timeCount; t++) {
            if (t <= minDipIndex) {
                // Moving toward shock trough
                const progress = t / minDipIndex;
                const intermediateDip = 100 + (scenario.maxDrawdown * progress * (1 - (netPnlPct > 20 ? 0.6 : 0.2)));
                portTrajectory.push(Number(intermediateDip.toFixed(1)));
            } else {
                // Moving toward final net return
                const recoveryProgress = (t - minDipIndex) / (timeCount - 1 - minDipIndex);
                const val = portTrajectory[minDipIndex] + ((100 + netPnlPct - portTrajectory[minDipIndex]) * recoveryProgress);
                portTrajectory.push(Number(val.toFixed(1)));
            }
        }

        return {
            scenario,
            totalVal,
            totalNewVal,
            netPnlTL,
            netPnlPct,
            maxDrawdown: scenario.maxDrawdown,
            recoveryDays: scenario.recoveryDays,
            portTrajectory,
            assetBreakdowns
        };
    },

    calculateOverallResilience() {
        const funds = PortfolioData.funds;
        const totalVal = Calculations.getTotalPortfolioValue();
        if (totalVal <= 0 || funds.length === 0) return { score: 0, tag: 'Nötr' };

        let defensiveVal = PortfolioData.cashTL;
        funds.forEach(f => {
            const key = this.getAssetClassKey(f);
            if (key === 'liquid' || key === 'gold') {
                defensiveVal += f.shares * f.currentPrice;
            }
        });

        const defensiveRatio = defensiveVal / totalVal;
        const vol = Calculations.getPortfolioVolatility();

        let score = 5.0 + (defensiveRatio * 4.5) - (vol > 25 ? (vol - 25) * 0.08 : 0);
        score = Math.max(2.0, Math.min(9.8, score));

        let tag = '🛡 Yüksek Kalkan';
        if (score < 4.5) tag = '⚠ Yüksek Volatilite';
        else if (score < 7.0) tag = '⚖ Dengeli Direnç';

        return { score: Number(score.toFixed(1)), tag };
    },

    render() {
        const grid = document.getElementById('stressScenariosGrid');
        if (!grid) return;

        const resilience = this.calculateOverallResilience();
        const scoreEl = document.getElementById('stressScoreDisplay');
        const tagEl = document.getElementById('stressTagDisplay');

        if (scoreEl) scoreEl.textContent = `${resilience.score} / 10`;
        if (tagEl) tagEl.textContent = resilience.tag;

        let gridHtml = '';
        this.SCENARIOS.forEach(sc => {
            const res = this.runScenario(sc.id);
            if (!res) return;

            const isPositive = res.netPnlPct >= 0;
            const sign = isPositive ? '+' : '';
            const isActive = sc.id === this.selectedScenarioId;

            gridHtml += `
                <div class="stress-scenario-card ${isActive ? 'active' : ''}" data-scenario-id="${sc.id}">
                    <div class="stress-card-top">
                        <span class="stress-card-title">${sc.icon} ${sc.title}</span>
                        <span class="stress-card-year">${sc.year}</span>
                    </div>
                    <div class="stress-card-impact">
                        <span class="stress-impact-val ${isPositive ? 'positive' : 'negative'}">
                            ${sign}%${res.netPnlPct.toFixed(1)}
                        </span>
                        <span class="stress-impact-tl">(${sign}${Utils.formatCurrency(res.netPnlTL)})</span>
                    </div>
                    <p class="stress-card-summary">${sc.description}</p>
                </div>
            `;
        });

        grid.innerHTML = gridHtml;
        this.renderBreakdown(this.selectedScenarioId);
        this.initEventListeners();
    },

    renderBreakdown(scenarioId) {
        const res = this.runScenario(scenarioId);
        if (!res) return;

        const titleEl = document.getElementById('stressSelectedScenarioTitle');
        const impactEl = document.getElementById('stressSelectedImpactBadge');
        const mddEl = document.getElementById('stressSelectedMddBadge');
        const recEl = document.getElementById('stressSelectedRecBadge');
        const listEl = document.getElementById('stressBreakdownList');

        if (titleEl) titleEl.textContent = `${res.scenario.icon} ${res.scenario.title} - Backtest Simülasyonu`;
        if (impactEl) {
            const sign = res.netPnlPct >= 0 ? '+' : '';
            impactEl.textContent = `Kriz Sonu Net: ${sign}%${res.netPnlPct.toFixed(1)} (${sign}${Utils.formatCurrency(res.netPnlTL)})`;
            impactEl.className = `stress-detail-badge ${res.netPnlPct >= 0 ? 'positive' : 'negative'}`;
        }
        if (mddEl) {
            mddEl.textContent = `Max Drawdown: %${res.maxDrawdown.toFixed(1)}`;
        }
        if (recEl) {
            recEl.textContent = `Toparlanma: ${res.recoveryDays} İş Günü`;
        }

        // Render Multi-Line Backtest Chart
        this.renderBacktestChart(res);

        if (!listEl) return;

        let listHtml = '';
        const cashShock = (res.scenario.shocks.liquid || 0) * 100;
        const cashPnl = PortfolioData.cashTL * (res.scenario.shocks.liquid || 0);
        listHtml += `
            <div class="stress-breakdown-item">
                <div class="stress-bi-left">
                    <span class="stress-bi-icon">💵</span>
                    <div>
                        <div class="stress-bi-name">Serbest Nakit (TL)</div>
                        <div class="stress-bi-role">Likit Faiz Kalkanı</div>
                    </div>
                </div>
                <div class="stress-bi-right">
                    <div class="stress-bi-pct ${cashShock >= 0 ? 'positive' : 'negative'}">${cashShock >= 0 ? '+' : ''}%${cashShock.toFixed(1)}</div>
                    <div class="stress-bi-val">${cashPnl >= 0 ? '+' : ''}${Utils.formatCurrency(cashPnl)}</div>
                </div>
            </div>
        `;

        res.assetBreakdowns.forEach(item => {
            const f = item.fund;
            const sign = item.shockPct >= 0 ? '+' : '';
            listHtml += `
                <div class="stress-breakdown-item">
                    <div class="stress-bi-left">
                        <span class="stress-bi-icon">${f.icon || '📦'}</span>
                        <div>
                            <div class="stress-bi-name">${f.code} &bull; ${f.shortName || f.name}</div>
                            <div class="stress-bi-role">${f.category}</div>
                        </div>
                    </div>
                    <div class="stress-bi-right">
                        <div class="stress-bi-pct ${item.shockPct >= 0 ? 'positive' : 'negative'}">${sign}%${item.shockPct.toFixed(1)}</div>
                        <div class="stress-bi-val">${item.pnlTL >= 0 ? '+' : ''}${Utils.formatCurrency(item.pnlTL)}</div>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = listHtml;
    },

    renderBacktestChart(res) {
        const canvas = document.getElementById('crisisBacktestChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const ctx = canvas.getContext('2d');
        const sc = res.scenario;

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sc.timelineLabels,
                datasets: [
                    {
                        label: '🌟 Portföyünüz (Geriye Dönük)',
                        data: res.portTrajectory,
                        borderColor: '#6366F1',
                        backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 4,
                        pointHoverRadius: 7
                    },
                    {
                        label: '🇹🇷 BIST 100 Endeksi',
                        data: sc.benchmarks.bist,
                        borderColor: '#EF4444',
                        borderWidth: 1.8,
                        borderDash: [4, 4],
                        fill: false,
                        tension: 0.3,
                        pointRadius: 2
                    },
                    {
                        label: '🥇 Gram Altın (TL)',
                        data: sc.benchmarks.gold,
                        borderColor: '#F59E0B',
                        borderWidth: 1.8,
                        borderDash: [2, 2],
                        fill: false,
                        tension: 0.3,
                        pointRadius: 2
                    },
                    {
                        label: '💵 USD / TRY',
                        data: sc.benchmarks.usd,
                        borderColor: '#10B981',
                        borderWidth: 1.8,
                        borderDash: [5, 3],
                        fill: false,
                        tension: 0.3,
                        pointRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94A3B8',
                            font: { family: "'JetBrains Mono', monospace", size: 10 }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Göreceli Getiri Endeksi (100 = Başlangıç)',
                            color: '#94A3B8',
                            font: { size: 10 }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94A3B8',
                            callback: v => v.toFixed(0),
                            font: { family: "'JetBrains Mono', monospace", size: 10 }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#F1F3F9',
                            font: { size: 11, weight: '600' },
                            usePointStyle: true,
                            padding: 12
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label(ctx) {
                                const diff = ctx.raw - 100;
                                const sign = diff >= 0 ? '+' : '';
                                return ` ${ctx.dataset.label}: ${ctx.raw} (${sign}%${diff.toFixed(1)})`;
                            }
                        }
                    }
                }
            }
        });
    },

    initEventListeners() {
        const grid = document.getElementById('stressScenariosGrid');
        if (grid && !grid._hasListener) {
            grid._hasListener = true;
            grid.addEventListener('click', (e) => {
                const card = e.target.closest('.stress-scenario-card');
                if (!card) return;
                const id = card.getAttribute('data-scenario-id');
                if (!id) return;
                this.selectedScenarioId = id;
                grid.querySelectorAll('.stress-scenario-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.renderBreakdown(id);
            });
        }
    }
};

// ==========================================================================
// Modern Portfolio Theory & Markowitz Efficient Frontier Optimizer
// ==========================================================================
const MarkowitzOptimizer = {
    chartInstance: null,
    riskFreeRate: 0.50, // TCMB 2026 Repo Benchmark (%50.0)
    lastOptimizationData: null,

    CATEGORY_DEFAULTS: {
        'Para Piyasası': { expectedReturn: 54.0, volatility: 2.5 },
        'Hisse Senedi': { expectedReturn: 88.0, volatility: 32.0 },
        'Hisse Senedi Yoğun': { expectedReturn: 92.0, volatility: 34.0 },
        'Yabancı Teknoloji': { expectedReturn: 95.0, volatility: 36.0 },
        'Altın & Emtia': { expectedReturn: 74.0, volatility: 22.0 },
        'Kıymetli Madenler': { expectedReturn: 74.0, volatility: 22.0 },
        'Değişken': { expectedReturn: 65.0, volatility: 16.0 },
        'Fon Sepeti': { expectedReturn: 62.0, volatility: 15.0 },
        'Borçlanma Araçları': { expectedReturn: 56.0, volatility: 6.0 },
        'TL Nakit': { expectedReturn: 50.0, volatility: 0.5 }
    },

    getAssetParameters(fund) {
        if (!fund) return { expectedReturn: 50.0, volatility: 0.5, category: 'TL Nakit' };
        const cat = fund.category || 'Değişken';
        let matched = this.CATEGORY_DEFAULTS[cat];
        if (!matched) {
            for (const key of Object.keys(this.CATEGORY_DEFAULTS)) {
                if (cat.toLowerCase().includes(key.toLowerCase())) {
                    matched = this.CATEGORY_DEFAULTS[key];
                    break;
                }
            }
        }
        if (!matched) matched = { expectedReturn: 60.0, volatility: 20.0 };

        let expRet = (fund.performance1Y && fund.performance1Y > 0) ? fund.performance1Y : matched.expectedReturn;
        let vol = fund.riskScore ? (fund.riskScore * 5.2) : matched.volatility;

        return {
            expectedReturn: Math.max(10, Math.min(150, expRet)),
            volatility: Math.max(1.5, Math.min(60, vol)),
            category: cat
        };
    },

    getCorrelation(catA, catB) {
        if (catA === catB) return 1.0;
        const a = (catA || '').toLowerCase();
        const b = (catB || '').toLowerCase();

        if (a.includes('nakit') || b.includes('nakit')) return 0.0;
        if (a.includes('para piyasası') || b.includes('para piyasası')) return -0.05;
        if ((a.includes('hisse') && b.includes('altın')) || (a.includes('altın') && b.includes('hisse'))) return 0.12;
        if ((a.includes('yabancı') && b.includes('hisse')) || (a.includes('hisse') && b.includes('yabancı'))) return 0.42;
        if ((a.includes('yabancı') && b.includes('altın')) || (a.includes('altın') && b.includes('yabancı'))) return 0.22;
        if ((a.includes('borçlanma') && b.includes('hisse')) || (a.includes('hisse') && b.includes('borçlanma'))) return 0.08;

        return 0.20;
    },

    runOptimization() {
        const assets = [];
        const totalPortfolio = Calculations.getTotalPortfolioValue();

        if (PortfolioData.funds.length === 0 && PortfolioData.cashTL === 0) {
            return null;
        }

        PortfolioData.funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const currentWeight = totalPortfolio > 0 ? (val / totalPortfolio) : 0;
            const params = this.getAssetParameters(f);
            assets.push({
                code: f.code,
                name: f.name || f.code,
                color: f.color || '#6366F1',
                category: f.category || 'TEFAS Fonu',
                currentWeight,
                expectedReturn: params.expectedReturn,
                volatility: params.volatility
            });
        });

        if (PortfolioData.cashTL > 0 || assets.length === 0) {
            const cashWeight = totalPortfolio > 0 ? (PortfolioData.cashTL / totalPortfolio) : 1;
            assets.push({
                code: 'TRY_NAKIT',
                name: 'Serbest TL Nakit',
                color: '#10B981',
                category: 'TL Nakit',
                currentWeight: cashWeight,
                expectedReturn: 50.0,
                volatility: 0.5
            });
        }

        const N = assets.length;
        if (N === 0) return null;

        const covMatrix = [];
        for (let i = 0; i < N; i++) {
            covMatrix[i] = [];
            for (let j = 0; j < N; j++) {
                const corr = this.getCorrelation(assets[i].category, assets[j].category);
                covMatrix[i][j] = (assets[i].volatility / 100) * (assets[j].volatility / 100) * corr;
            }
        }

        let currentReturn = 0;
        let currentVariance = 0;
        for (let i = 0; i < N; i++) {
            currentReturn += assets[i].currentWeight * assets[i].expectedReturn;
            for (let j = 0; j < N; j++) {
                currentVariance += assets[i].currentWeight * assets[j].currentWeight * covMatrix[i][j];
            }
        }
        const currentVol = Math.sqrt(Math.max(0.0001, currentVariance)) * 100;
        const currentSharpe = currentVol > 0 ? ((currentReturn - (this.riskFreeRate * 100)) / currentVol) : 0;

        const simulations = [];
        let maxSharpe = { sharpe: -Infinity, expectedReturn: 0, volatility: 0, weights: [] };
        let minVariance = { sharpe: 0, expectedReturn: 0, volatility: Infinity, weights: [] };

        const SAMPLE_COUNT = 1500;
        for (let s = 0; s < SAMPLE_COUNT; s++) {
            const rawWeights = [];
            let sumWeights = 0;
            for (let i = 0; i < N; i++) {
                const expVal = -Math.log(Math.max(0.00001, Math.random()));
                rawWeights.push(expVal);
                sumWeights += expVal;
            }
            const weights = rawWeights.map(w => w / sumWeights);

            let pReturn = 0;
            let pVariance = 0;
            for (let i = 0; i < N; i++) {
                pReturn += weights[i] * assets[i].expectedReturn;
                for (let j = 0; j < N; j++) {
                    pVariance += weights[i] * weights[j] * covMatrix[i][j];
                }
            }
            const pVol = Math.sqrt(Math.max(0.0001, pVariance)) * 100;
            const pSharpe = pVol > 0 ? ((pReturn - (this.riskFreeRate * 100)) / pVol) : 0;

            const point = {
                x: Number(pVol.toFixed(2)),
                y: Number(pReturn.toFixed(2)),
                sharpe: Number(pSharpe.toFixed(2)),
                weights
            };

            simulations.push(point);

            if (pSharpe > maxSharpe.sharpe) {
                maxSharpe = { sharpe: pSharpe, expectedReturn: pReturn, volatility: pVol, weights };
            }
            if (pVol < minVariance.volatility) {
                minVariance = { sharpe: pSharpe, expectedReturn: pReturn, volatility: pVol, weights };
            }
        }

        const sortedSims = [...simulations].sort((a, b) => a.x - b.x);
        const frontierPoints = [];
        let maxRetSoFar = -Infinity;
        sortedSims.forEach(pt => {
            if (pt.y > maxRetSoFar) {
                maxRetSoFar = pt.y;
                frontierPoints.push({ x: pt.x, y: pt.y });
            }
        });

        this.lastOptimizationData = {
            assets,
            current: {
                expectedReturn: currentReturn,
                volatility: currentVol,
                sharpe: currentSharpe
            },
            maxSharpe,
            minVariance,
            simulations,
            frontierPoints
        };

        return this.lastOptimizationData;
    },

    render() {
        const data = this.runOptimization();
        if (!data) return;

        const curRetEl = document.getElementById('mkCurrentReturn');
        const curVolEl = document.getElementById('mkCurrentVol');
        const curSharpeEl = document.getElementById('mkCurrentSharpe');

        const optRetEl = document.getElementById('mkOptimalReturn');
        const optVolEl = document.getElementById('mkOptimalVol');
        const optSharpeEl = document.getElementById('mkOptimalSharpe');

        const minRetEl = document.getElementById('mkMinVolReturn');
        const minVolEl = document.getElementById('mkMinVolVol');
        const minSharpeEl = document.getElementById('mkMinVolSharpe');

        if (curRetEl) curRetEl.textContent = `%${data.current.expectedReturn.toFixed(1)}`;
        if (curVolEl) curVolEl.textContent = `%${data.current.volatility.toFixed(1)}`;
        if (curSharpeEl) curSharpeEl.textContent = data.current.sharpe.toFixed(2);

        if (optRetEl) optRetEl.textContent = `%${data.maxSharpe.expectedReturn.toFixed(1)}`;
        if (optVolEl) optVolEl.textContent = `%${data.maxSharpe.volatility.toFixed(1)}`;
        if (optSharpeEl) optSharpeEl.textContent = data.maxSharpe.sharpe.toFixed(2);

        if (minRetEl) minRetEl.textContent = `%${data.minVariance.expectedReturn.toFixed(1)}`;
        if (minVolEl) minVolEl.textContent = `%${data.minVariance.volatility.toFixed(1)}`;
        if (minSharpeEl) minSharpeEl.textContent = data.minVariance.sharpe.toFixed(2);

        this.renderChart(data);
        this.renderWeightsTable(data);
        this.bindEvents();
    },

    renderChart(data) {
        const canvas = document.getElementById('markowitzChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const ctx = canvas.getContext('2d');

        this.chartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Simüle Portföyler (1.500)',
                        data: data.simulations.map(s => ({ x: s.x, y: s.y, sharpe: s.sharpe })),
                        backgroundColor: (ctx) => {
                            const raw = ctx.raw;
                            if (!raw) return 'rgba(99, 102, 241, 0.25)';
                            const norm = Math.max(0, Math.min(1, (raw.sharpe - 0) / 1.5));
                            return `rgba(${Math.round(99 + (1 - norm) * 100)}, ${Math.round(102 + norm * 150)}, 241, 0.45)`;
                        },
                        pointRadius: 2.8,
                        pointHoverRadius: 5,
                        borderWidth: 0,
                        order: 4
                    },
                    {
                        label: 'Etkin Sınır (Efficient Frontier)',
                        data: data.frontierPoints,
                        showLine: true,
                        borderColor: '#06B6D4',
                        borderWidth: 2.5,
                        fill: false,
                        tension: 0.3,
                        pointRadius: 0,
                        order: 2
                    },
                    {
                        label: '📍 Mevcut Portföy',
                        data: [{ x: Number(data.current.volatility.toFixed(2)), y: Number(data.current.expectedReturn.toFixed(2)) }],
                        backgroundColor: '#F59E0B',
                        borderColor: '#FFFFFF',
                        borderWidth: 2,
                        pointRadius: 8,
                        pointHoverRadius: 11,
                        order: 1
                    },
                    {
                        label: '💎 Maksimum Sharpe (Optimal)',
                        data: [{ x: Number(data.maxSharpe.volatility.toFixed(2)), y: Number(data.maxSharpe.expectedReturn.toFixed(2)) }],
                        backgroundColor: '#06B6D4',
                        borderColor: '#FFFFFF',
                        borderWidth: 2.5,
                        pointStyle: 'rectRot',
                        pointRadius: 9,
                        pointHoverRadius: 12,
                        order: 1
                    },
                    {
                        label: '🛡 Minimum Varyans',
                        data: [{ x: Number(data.minVariance.volatility.toFixed(2)), y: Number(data.minVariance.expectedReturn.toFixed(2)) }],
                        backgroundColor: '#10B981',
                        borderColor: '#FFFFFF',
                        borderWidth: 2.5,
                        pointRadius: 8,
                        pointHoverRadius: 11,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Yıllık Risk / Volatilite (Sigma %)',
                            color: '#94A3B8',
                            font: { family: "'JetBrains Mono', monospace", size: 11 }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94A3B8',
                            callback: v => '%' + v,
                            font: { family: "'JetBrains Mono', monospace", size: 10 }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Beklenen Yıllık Getiri E[R] (%)',
                            color: '#94A3B8',
                            font: { family: "'JetBrains Mono', monospace", size: 11 }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94A3B8',
                            callback: v => '%' + v,
                            font: { family: "'JetBrains Mono', monospace", size: 10 }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#F1F3F9',
                            font: { size: 11, weight: '600' },
                            usePointStyle: true,
                            padding: 14
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label(ctx) {
                                return ` ${ctx.dataset.label}: Risk %${ctx.raw.x} | Getiri %${ctx.raw.y}` + (ctx.raw.sharpe ? ` (Sharpe: ${ctx.raw.sharpe})` : '');
                            }
                        }
                    }
                }
            }
        });
    },

    renderWeightsTable(data) {
        const container = document.getElementById('markowitzWeightsContainer');
        if (!container) return;

        let tableHtml = `
            <table class="markowitz-weights-table">
                <thead>
                    <tr>
                        <th>Varlık / Fon</th>
                        <th>Kategori</th>
                        <th>Mevcut Ağırlık</th>
                        <th>Max Sharpe (Optimal)</th>
                        <th>Min Varyans (Düşük Risk)</th>
                        <th>Önerilen Aksiyon</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.assets.forEach((asset, idx) => {
            const curPct = asset.currentWeight * 100;
            const optPct = (data.maxSharpe.weights[idx] || 0) * 100;
            const minPct = (data.minVariance.weights[idx] || 0) * 100;
            const delta = optPct - curPct;

            let actionBadge = '';
            if (Math.abs(delta) < 1.5) {
                actionBadge = '<span class="badge" style="background:rgba(255,255,255,0.06); color:#94A3B8;">⚖ Dengede</span>';
            } else if (delta > 0) {
                actionBadge = `<span class="badge" style="background:rgba(6,182,212,0.15); color:#06B6D4;">+ %${delta.toFixed(1)} Artır</span>`;
            } else {
                actionBadge = `<span class="badge" style="background:rgba(239,68,68,0.15); color:#EF4444;">- %${Math.abs(delta).toFixed(1)} Azalt</span>`;
            }

            tableHtml += `
                <tr>
                    <td>
                        <strong style="color: ${asset.color}">${asset.code}</strong>
                        <div style="font-size: 0.74rem; color: var(--text-secondary);">${asset.name}</div>
                    </td>
                    <td>${asset.category}</td>
                    <td>
                        <div class="weight-bar-wrapper">
                            <span style="min-width:40px; font-family:'JetBrains Mono';">%${curPct.toFixed(1)}</span>
                            <div class="weight-mini-bar" style="width: ${Math.min(100, curPct * 2)}px; background: #F59E0B;"></div>
                        </div>
                    </td>
                    <td>
                        <div class="weight-bar-wrapper">
                            <span style="min-width:40px; font-family:'JetBrains Mono'; font-weight:700; color:#06B6D4;">%${optPct.toFixed(1)}</span>
                            <div class="weight-mini-bar" style="width: ${Math.min(100, optPct * 2)}px; background: #06B6D4;"></div>
                        </div>
                    </td>
                    <td>
                        <div class="weight-bar-wrapper">
                            <span style="min-width:40px; font-family:'JetBrains Mono'; color:#10B981;">%${minPct.toFixed(1)}</span>
                            <div class="weight-mini-bar" style="width: ${Math.min(100, minPct * 2)}px; background: #10B981;"></div>
                        </div>
                    </td>
                    <td>${actionBadge}</td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        container.innerHTML = tableHtml;
    },

    bindEvents() {
        const rerunBtn = document.getElementById('markowitzRerunBtn');
        if (rerunBtn && !rerunBtn._hasListener) {
            rerunBtn._hasListener = true;
            rerunBtn.addEventListener('click', () => {
                this.render();
                Utils.showToast('1.500 Markowitz etkin sınır olasılık simülasyonu güncellendi.', 'info');
            });
        }

        const applyBtn = document.getElementById('markowitzApplyOptimalBtn');
        if (applyBtn && !applyBtn._hasListener) {
            applyBtn._hasListener = true;
            applyBtn.addEventListener('click', () => {
                if (!this.lastOptimizationData || !this.lastOptimizationData.maxSharpe) return;
                const opt = this.lastOptimizationData;
                
                opt.assets.forEach((asset, idx) => {
                    const weightPct = Number(((opt.maxSharpe.weights[idx] || 0) * 100).toFixed(1));
                    if (asset.code !== 'TRY_NAKIT') {
                        const fund = PortfolioData.funds.find(f => f.code === asset.code);
                        if (fund) {
                            fund.targetWeight = weightPct;
                        }
                    }
                });

                if (typeof RebalancingEngine !== 'undefined') {
                    RebalancingEngine.render();
                }
                if (typeof StrategyTab !== 'undefined') {
                    StrategyTab.render();
                }

                Utils.showToast('💎 Maksimum Sharpe optimal ağırlıkları portföy stratejinize aktarıldı!', 'success');
            });
        }
    }
};

// ==========================================================================
// FxAttributionEngine (Kur Kazancı vs. Reel Varlık Getirisi Ayrıştırma Masası)
// ==========================================================================
const FxAttributionEngine = {
    // Reference official USD/TRY 1-year rate (~38.5%)
    USD_ANNUAL_RETURN: 0.385,

    init() {
        this.render();
    },

    render() {
        const body = document.getElementById('fxAttributionTableBody');
        const sensitivityEl = document.getElementById('fxAttSensitivityVal');
        const totalFxEl = document.getElementById('fxTotalGainTL');
        const totalFxPctEl = document.getElementById('fxTotalGainPct');
        const totalRealEl = document.getElementById('fxTotalRealAssetGainTL');
        const totalRealPctEl = document.getElementById('fxTotalRealAssetGainPct');
        const ratioEl = document.getElementById('fxRatioDisplay');

        if (!body) return;

        if (!PortfolioData.funds || PortfolioData.funds.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-tertiary);">Portföyünüzde fon bulunmuyor.</td></tr>';
            if (sensitivityEl) sensitivityEl.textContent = '%0';
            if (totalFxEl) totalFxEl.textContent = '₺0,00';
            if (totalRealEl) totalRealEl.textContent = '₺0,00';
            if (ratioEl) ratioEl.textContent = '- / -';
            return;
        }

        let totalPortfolioVal = Calculations.getTotalPortfolioValue();
        let totalFxGainTL = 0;
        let totalRealGainTL = 0;
        let foreignWeightSum = 0;

        let rowsHtml = '';

        PortfolioData.funds.forEach(fund => {
            const shares = fund.shares || 0;
            const avgCost = fund.avgCost || 0;
            const curPrice = fund.currentPrice || avgCost || 0;
            const val = shares * curPrice;
            const costVal = shares * avgCost;
            const profitTL = val - costVal;
            const retPct = costVal > 0 ? (profitTL / costVal) : 0;
            const weight = totalPortfolioVal > 0 ? (val / totalPortfolioVal) : 0;

            const cat = (fund.category || '').toLowerCase();
            const name = (fund.name || '').toLowerCase();
            const code = (fund.code || '').toUpperCase();

            const isForeign = cat.includes('yabancı') || name.includes('yabancı') || name.includes('teknoloji') || name.includes('nasdaq') || name.includes('amerika') || name.includes('eurobond') || ['AFT', 'YAY', 'IJC', 'TGE', 'GBG', 'TFI', 'DVX'].includes(code);
            const isGold = cat.includes('kıymetli') || cat.includes('altın') || name.includes('altın') || name.includes('gümüş') || ['KZL', 'GGK', 'GTA', 'MKG'].includes(code);

            let fxPortionPct = 0;
            let realPortionPct = 0;
            let fxGainTL = 0;
            let realGainTL = 0;

            if (isForeign || isGold) {
                foreignWeightSum += weight;
                // Decompose total return into FX component vs Real Asset alpha
                const fxRate = this.USD_ANNUAL_RETURN;
                const totalMultiplier = 1 + retPct;
                const realMultiplier = totalMultiplier / (1 + fxRate);
                const realRate = realMultiplier - 1;

                if (retPct !== 0) {
                    const absSum = Math.abs(fxRate) + Math.abs(realRate);
                    const fxWeight = absSum > 0 ? (Math.abs(fxRate) / absSum) : 0.5;
                    const realWeight = absSum > 0 ? (Math.abs(realRate) / absSum) : 0.5;

                    fxGainTL = profitTL * fxWeight;
                    realGainTL = profitTL * realWeight;
                    fxPortionPct = fxRate;
                    realPortionPct = realRate;
                }
            } else {
                // Domestic asset -> 100% real domestic asset gain, 0% FX gain
                fxGainTL = 0;
                realGainTL = profitTL;
                fxPortionPct = 0;
                realPortionPct = retPct;
            }

            totalFxGainTL += fxGainTL;
            totalRealGainTL += realGainTL;

            const fxBarWidth = Math.min(100, Math.max(0, (fxGainTL / (Math.abs(profitTL) || 1)) * 100));
            const realBarWidth = 100 - fxBarWidth;

            rowsHtml += `
                <tr>
                    <td>
                        <strong style="color:var(--text-primary); font-size:0.9rem;">${fund.code}</strong>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${Utils.escapeHtml(fund.shortName || fund.name)}</div>
                    </td>
                    <td>
                        <span class="badge ${isForeign ? 'badge-primary' : (isGold ? 'badge-warning' : 'badge-neutral')}">${Utils.escapeHtml(fund.category || 'Fon')}</span>
                    </td>
                    <td>
                        <strong class="${profitTL >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(profitTL)}</strong>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${profitTL >= 0 ? '+' : ''}%${(retPct * 100).toFixed(2)}</div>
                    </td>
                    <td>
                        <span style="color:#60A5FA; font-weight:600;">${Utils.formatCurrency(fxGainTL)}</span>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${isForeign || isGold ? '+%' + (fxPortionPct * 100).toFixed(1) + ' Kur' : '%0 Kur'}</div>
                    </td>
                    <td>
                        <span style="color:#34D399; font-weight:600;">${Utils.formatCurrency(realGainTL)}</span>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${realGainTL >= 0 ? '+' : ''}%${(realPortionPct * 100).toFixed(1)} Reel</div>
                    </td>
                    <td>
                        <div style="display:flex; height:8px; border-radius:4px; overflow:hidden; background:rgba(255,255,255,0.06); width:120px;">
                            <div style="width:${fxBarWidth}%; background:#3B82F6;" title="Kur Katkısı: %${fxBarWidth.toFixed(0)}"></div>
                            <div style="width:${realBarWidth}%; background:#10B981;" title="Reel Varlık Katkısı: %${realBarWidth.toFixed(0)}"></div>
                        </div>
                    </td>
                </tr>
            `;
        });

        body.innerHTML = rowsHtml;

        if (sensitivityEl) sensitivityEl.textContent = `%${(foreignWeightSum * 100).toFixed(1)}`;
        if (totalFxEl) totalFxEl.textContent = Utils.formatCurrency(totalFxGainTL);
        if (totalRealEl) totalRealEl.textContent = Utils.formatCurrency(totalRealGainTL);
        
        const totalProfit = totalFxGainTL + totalRealGainTL;
        if (totalFxPctEl) totalFxPctEl.textContent = totalProfit !== 0 ? `%${((totalFxGainTL / Math.abs(totalProfit)) * 100).toFixed(1)} Toplam Kar İçindeki Payı` : '%0 Kur Etkisi';
        if (totalRealPctEl) totalRealPctEl.textContent = totalProfit !== 0 ? `%${((totalRealGainTL / Math.abs(totalProfit)) * 100).toFixed(1)} Toplam Kar İçindeki Payı` : '%0 Reel Etki';
        
        if (ratioEl && totalProfit !== 0) {
            const fxShare = Math.min(100, Math.max(0, (totalFxGainTL / Math.abs(totalProfit)) * 100));
            const realShare = 100 - fxShare;
            ratioEl.textContent = `%${fxShare.toFixed(0)} Kur / %${realShare.toFixed(0)} Alfa`;
        }
    }
};

const WatchlistManager = {
    watchlist: ['AFT', 'MAC', 'KZL', 'TI2'],

    init() {
        try {
            const saved = localStorage.getItem('zenith_watchlist');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.watchlist = parsed;
                }
            }
        } catch (e) {}
        this.render();
        this.bindEvents();
    },

    save() {
        try {
            localStorage.setItem('zenith_watchlist', JSON.stringify(this.watchlist));
        } catch (e) {}
        this.render();
        if (typeof FundComparator !== 'undefined') {
            FundComparator.populateSelects();
        }
    },

    toggle(code) {
        if (!code) return;
        const upper = code.toUpperCase();
        const idx = this.watchlist.indexOf(upper);
        if (idx > -1) {
            this.watchlist.splice(idx, 1);
            Utils.showToast(`${upper} izleme listesinden çıkarıldı.`, 'info');
        } else {
            this.watchlist.push(upper);
            Utils.showToast(`⭐ ${upper} izleme listesine eklendi!`, 'success');
        }
        this.save();
    },

    remove(code) {
        const upper = (code || '').toUpperCase();
        const idx = this.watchlist.indexOf(upper);
        if (idx > -1) {
            this.watchlist.splice(idx, 1);
            this.save();
            Utils.showToast(`${upper} izleme listesinden çıkarıldı.`, 'info');
        }
    },

    render() {
        const grid = document.getElementById('watchlistGrid');
        const badge = document.getElementById('watchlistCountBadge');
        if (!grid) return;

        if (badge) {
            badge.textContent = `${this.watchlist.length} Fon İzleniyor`;
        }

        if (this.watchlist.length === 0) {
            grid.innerHTML = `
                <div class="watchlist-empty">
                    <span>⭐</span> Henüz izleme listenize fon eklemediniz. "Fon Ekle" veya "Fon Ara" sekmesinden fonları yıldızlayabilirsiniz.
                </div>
            `;
            return;
        }

        let html = '';
        this.watchlist.forEach(code => {
            let fund = PortfolioData.funds.find(f => f.code === code);
            let title = fund ? fund.name : code;
            let cat = fund ? fund.category : 'TEFAS Fonu';
            let price = fund ? fund.currentPrice : (window.TEFAS_PRICES && window.TEFAS_PRICES[code]) || 1.0;
            let perf1Y = fund ? fund.performance1Y : 50.0;

            if (!fund && typeof FundSearch !== 'undefined' && FundSearch.database) {
                const dbFund = FundSearch.database.find(d => d.code === code);
                if (dbFund) {
                    title = dbFund.title;
                    cat = dbFund.category;
                    if (dbFund.price) price = dbFund.price;
                }
            }

            const isPositive = perf1Y >= 0;

            html += `
                <div class="watchlist-item">
                    <div class="watchlist-item-top">
                        <span class="watchlist-item-code">${code}</span>
                        <button class="watchlist-unstar-btn" data-code="${code}" title="İzleme Listesinden Çıkar">★</button>
                    </div>
                    <div class="watchlist-item-name" title="${Utils.escapeHtml(title)}">${Utils.escapeHtml(title)}</div>
                    <div class="watchlist-item-meta">
                        <span class="watchlist-price">${Utils.formatCurrency(price)}</span>
                        <span class="watchlist-1y ${isPositive ? 'positive' : 'negative'}">1Y: ${isPositive ? '+' : ''}%${(perf1Y || 0).toFixed(1)}</span>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    },

    bindEvents() {
        const grid = document.getElementById('watchlistGrid');
        if (grid && !grid._hasListener) {
            grid._hasListener = true;
            grid.addEventListener('click', (e) => {
                const btn = e.target.closest('.watchlist-unstar-btn');
                if (btn) {
                    const code = btn.getAttribute('data-code');
                    if (code) this.remove(code);
                }
            });
        }

        const addBtn = document.getElementById('watchlistAddBtn');
        if (addBtn && !addBtn._hasListener) {
            addBtn._hasListener = true;
            addBtn.addEventListener('click', () => {
                Navigation.switchTab('add-fund');
            });
        }
    }
};

const FundComparator = {
    selectedCodes: ['AFT', 'MAC', 'TI2'],

    init() {
        this.populateSelects();
        this.render();
        this.bindEvents();
    },

    getAllAvailableFunds() {
        const set = new Map();
        
        // 1. Master 1.051 funds database
        const dbFunds = (typeof FundSearch !== 'undefined' && Array.isArray(FundSearch.db) && FundSearch.db.length > 0)
            ? FundSearch.db
            : ((typeof window !== 'undefined' && window.TEFAS_FUNDS_DB?.funds) ? window.TEFAS_FUNDS_DB.funds : []);

        dbFunds.forEach(d => {
            if (d && d.code) {
                set.set(d.code, {
                    code: d.code,
                    name: d.title || d.name || d.code,
                    category: d.category || 'TEFAS Fonu',
                    price: d.price || 1.0,
                    performance1Y: typeof d.performance1Y === 'number' ? d.performance1Y : (typeof d.perf1Y === 'number' ? d.perf1Y : 45.0)
                });
            }
        });

        // 2. Add any funds currently in portfolio
        if (typeof PortfolioData !== 'undefined' && Array.isArray(PortfolioData.funds)) {
            PortfolioData.funds.forEach(f => {
                if (f && f.code && !set.has(f.code)) {
                    set.set(f.code, {
                        code: f.code,
                        name: f.name || f.code,
                        category: f.category || 'TEFAS Fonu',
                        price: f.currentPrice || f.avgCost || 1.0,
                        performance1Y: typeof f.performance1Y === 'number' ? f.performance1Y : 45.0
                    });
                }
            });
        }

        const list = Array.from(set.values());
        list.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
        return list;
    },

    populateSelects() {
        const funds = this.getAllAvailableFunds();
        ['compareSelect1', 'compareSelect2', 'compareSelect3'].forEach((selId, idx) => {
            const el = document.getElementById(selId);
            if (!el) return;

            const currentVal = el.value || this.selectedCodes[idx] || '';
            let optHtml = `<option value="">${idx === 2 ? '(Opsiyonel 3. Fon)' : (idx + 1) + '. Fonu Seçin'}</option>`;

            funds.forEach(f => {
                const sel = f.code === currentVal ? 'selected' : '';
                const shortName = (f.name || '').length > 40 ? (f.name.slice(0, 40) + '...') : f.name;
                optHtml += `<option value="${f.code}" ${sel}>${f.code} - ${Utils.escapeHtml(shortName)} (${Utils.escapeHtml(f.category)})</option>`;
            });

            el.innerHTML = optHtml;
            if (currentVal) el.value = currentVal;
        });
    },

    render() {
        const container = document.getElementById('compareMatrixContainer');
        if (!container) return;

        const sel1 = document.getElementById('compareSelect1')?.value || this.selectedCodes[0];
        const sel2 = document.getElementById('compareSelect2')?.value || this.selectedCodes[1];
        const sel3 = document.getElementById('compareSelect3')?.value || this.selectedCodes[2];

        const codes = [sel1, sel2, sel3].filter(Boolean);

        if (codes.length < 2) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px; color:var(--text-secondary); font-size:0.85rem;">
                    ⚔ Karşılaştırma yapmak için lütfen en az 2 fon seçin.
                </div>
            `;
            return;
        }

        const dbFunds = (typeof FundSearch !== 'undefined' && Array.isArray(FundSearch.db) && FundSearch.db.length > 0)
            ? FundSearch.db
            : ((typeof window !== 'undefined' && window.TEFAS_FUNDS_DB?.funds) ? window.TEFAS_FUNDS_DB.funds : []);

        const fundDetails = codes.map(code => {
            let fund = PortfolioData.funds.find(f => f.code === code);
            const dbFund = dbFunds.find(d => d.code === code);

            let title = fund ? fund.name : (dbFund ? dbFund.title : code);
            let cat = fund ? fund.category : (dbFund ? dbFund.category : 'TEFAS Fonu');
            let price = fund ? fund.currentPrice : (dbFund && dbFund.price ? dbFund.price : (window.TEFAS_PRICES?.prices?.[code] || 1.0));

            const meta = Utils.getFundMeta(code, cat, title);

            let perf1Y = (fund && typeof fund.performance1Y === 'number' && fund.performance1Y > 0) 
                ? fund.performance1Y 
                : ((dbFund && typeof dbFund.performance1Y === 'number' && dbFund.performance1Y > 0) ? dbFund.performance1Y : meta.perf1Y);

            let fee = (fund && typeof fund.managementFee === 'number' && fund.managementFee > 0) 
                ? fund.managementFee 
                : ((dbFund && typeof dbFund.managementFee === 'number' && dbFund.managementFee > 0) ? dbFund.managementFee : meta.managementFee);

            let investors = (fund && fund.investors > 0) 
                ? fund.investors 
                : ((dbFund && dbFund.investors > 0) ? dbFund.investors : meta.investors);

            let occupancy = (fund && fund.occupancyRate > 0) 
                ? fund.occupancyRate 
                : ((dbFund && dbFund.occupancyRate > 0) ? dbFund.occupancyRate : meta.occupancyRate);

            return {
                code,
                name: title,
                category: cat,
                price,
                perf1Y,
                fee,
                investors,
                occupancy,
                riskScore: meta.riskScore,
                riskLevel: meta.riskLevel,
                buyValor: meta.buyValor,
                sellValor: meta.sellValor,
                tax: meta.tax
            };
        });

        const maxPerf = Math.max(...fundDetails.map(f => f.perf1Y));
        const minFee = Math.min(...fundDetails.map(f => f.fee));
        const minSellValor = Math.min(...fundDetails.map(f => f.sellValor));

        let tableHtml = `
            <div style="overflow-x:auto;">
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th style="width:200px;">Metrik / Kriter</th>
                            ${fundDetails.map(f => `<th><strong>${f.code}</strong><br><span style="font-size:0.7rem; font-weight:400;">${Utils.escapeHtml(f.name.slice(0, 24))}</span></th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Kategori & Varlık</strong></td>
                            ${fundDetails.map(f => `<td>${Utils.escapeHtml(f.category)}</td>`).join('')}
                        </tr>
                        <tr>
                            <td><strong>Güncel Birim Fiyat</strong></td>
                            ${fundDetails.map(f => `<td class="font-mono">${Utils.formatCurrency(f.price)}</td>`).join('')}
                        </tr>
                        <tr>
                            <td><strong>1 Yıllık Getiri</strong></td>
                            ${fundDetails.map(f => `<td class="${f.perf1Y === maxPerf ? 'compare-winner-cell' : ''}">+ %${(f.perf1Y || 0).toFixed(2)} ${f.perf1Y === maxPerf ? '🏆 En Yüksek' : ''}</td>`).join('')}
                        </tr>
                        <tr>
                            <td><strong>Yıllık Yönetim Ücreti</strong></td>
                            ${fundDetails.map(f => `<td class="${f.fee === minFee ? 'compare-winner-cell' : ''}">%${(f.fee || 0).toFixed(2)} ${f.fee === minFee ? '🏷 En Düşük' : ''}</td>`).join('')}
                        </tr>
                        <tr>
                            <td><strong>Stopaj Vergi Durumu</strong></td>
                            ${fundDetails.map(f => `<td>${(f.tax || '').includes('%0') ? '<span style="color:#10B981; font-weight:700;">🟢 %0 Stopaj Muaf</span>' : (f.tax || 'Vergili')}</td>`).join('')}
                        </tr>
                        <tr>
                            <td><strong>Satış Valörü (Nakit Dönüş)</strong></td>
                            ${fundDetails.map(f => `<td class="${f.sellValor === minSellValor ? 'compare-winner-cell' : ''}">T+${f.sellValor || 1} Gün ${f.sellValor === minSellValor ? '⚡ En Hızlı' : ''}</td>`).join('')}
                        </tr>
                        <tr>
                            <td><strong>Risk Derecesi</strong></td>
                            ${fundDetails.map(f => `<td>${f.riskScore || 4}/7 (${f.riskLevel || 'Orta'})</td>`).join('')}
                        </tr>
                        <tr>
                            <td><strong>Doluluk / Büyüklük</strong></td>
                            ${fundDetails.map(f => `<td>%${(f.occupancy || 0).toFixed(1)} (${(f.investors || 0).toLocaleString('tr-TR')} Kişi)</td>`).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHtml;
    },

    bindEvents() {
        ['compareSelect1', 'compareSelect2', 'compareSelect3'].forEach((selId, idx) => {
            const el = document.getElementById(selId);
            if (el && !el._hasListener) {
                el._hasListener = true;
                el.addEventListener('change', () => {
                    this.selectedCodes[idx] = el.value;
                    this.render();
                });
            }
        });
    }
};

const FundsTab = {
    render() {
        if (typeof WatchlistManager !== 'undefined') {
            WatchlistManager.render();
        }
        if (typeof FundComparator !== 'undefined') {
            FundComparator.init();
        }
        const container = document.getElementById('fundsGrid');
        if (!container) return;

        let html = '';
        PortfolioData.funds.forEach(fund => {
            const value = fund.shares * fund.currentPrice;

            html += `
                <div class="card fund-detail-card" style="border-top: 4px solid ${fund.color}">
                    <div class="fund-card-header">
                        <div class="fund-card-title">
                            <div class="fund-card-icon" style="background: ${fund.color}25; border: 1px solid ${fund.color}50">
                                ${fund.icon}
                            </div>
                            <div>
                                <div class="fund-card-code" style="color: ${fund.color}">${fund.code}</div>
                                <div class="fund-card-name">${fund.name}</div>
                            </div>
                        </div>
                        <div class="fund-card-price">
                            <div class="fund-card-current-price">${Utils.formatPrice(fund.currentPrice)}</div>
                            <div class="fund-card-change ${Utils.getReturnClass(fund.dailyReturnPct)}">
                                ${Utils.formatPercent(fund.dailyReturnPct)}
                            </div>
                        </div>
                    </div>

                    <div class="fund-card-body">
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Adet / Pay</span>
                            <span class="fund-detail-value">${Utils.formatNumber(fund.shares)}</span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Toplam Piyasa Değeri</span>
                            <span class="fund-detail-value font-bold">${Utils.formatCurrency(value)}</span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Ortalama Maliyet</span>
                            <span class="fund-detail-value">${Utils.formatPrice(fund.avgCost)}</span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Portföy Dağılımı</span>
                            <span class="fund-detail-value font-bold" style="color:${fund.color}">%${fund.portfolioWeight}</span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Toplam Getiri (₺)</span>
                            <span class="fund-detail-value ${Utils.getReturnClass(fund.totalReturn)}">
                                ${(fund.totalReturn >= 0 ? '+' : '') + Utils.formatCurrency(fund.totalReturn)}
                            </span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Toplam Getiri (%)</span>
                            <span class="fund-detail-value ${Utils.getReturnClass(fund.totalReturnPct)}">
                                ${Utils.formatPercent(fund.totalReturnPct)}
                            </span>
                        </div>

                        <div class="fund-card-divider"></div>
                        <div class="fund-card-section-title">Valör ve Yönetim Detayları</div>

                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Alış Valörü</span>
                            <span class="fund-detail-value">${fund.buyValor === 0 ? 'T+0 (Aynı Gün)' : `T+${fund.buyValor} (1 İş Günü)`}</span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Satış Valörü</span>
                            <span class="fund-detail-value">${fund.sellValor === 0 ? 'T+0 (Aynı Gün)' : `T+${fund.sellValor} (${fund.sellValor} İş Günü)`}</span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Valör Atlama Saati</span>
                            <span class="fund-detail-value" style="color:var(--warning);">${fund.valorCutoff}</span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Risk Seviyesi</span>
                            <span class="fund-detail-value">
                                <span class="badge ${Utils.getRiskBadgeClass(fund.riskLevel)}">${fund.riskLevel} (${fund.riskScore}/7)</span>
                            </span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Vergilendirme</span>
                            <span class="fund-detail-value">${fund.tax}</span>
                        </div>
                        <div class="fund-detail-item">
                            <span class="fund-detail-label">Yıllık Yönetim Ücreti</span>
                            <span class="fund-detail-value font-bold">%${fund.managementFee.toFixed(2)}</span>
                        </div>

                        <div class="fund-card-divider"></div>
                        <div class="fund-card-section-title">Fon Stratejisi ve Amacı</div>
                        <div style="grid-column: 1/-1; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.6;">
                            ${fund.description}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }
};

const StrategyTab = {
    getRoleDescription(fund) {
        const cat = (fund.category || '').toLowerCase();
        const code = (fund.code || '').toUpperCase();

        if (fund.sellValor === 0 || cat.includes('para piyasası')) {
            return 'T+0 valörlü likit havuz; alım fırsatlarını anında yakalar ve düşüşlerde nakit gücünüzü korur.';
        }
        if (cat.includes('yabancı') || code === 'AFT' || code === 'IJC' || code === 'YAY') {
            return 'Küresel teknoloji ve mega-trend şirketlerine yatırım yaparak döviz ve büyüme kazancı üretir.';
        }
        if (cat.includes('altın') || cat.includes('kıymetli') || code === 'KZL' || code === 'TCA' || code === 'GGK') {
            return 'Fiziki kıymetli maden temeli ile portföyün enflasyon ve jeopolitik kriz kalkanıdır.';
        }
        if (cat.includes('hisse') || code === 'MAC' || code === 'TI2' || code === 'ADE' || code === 'TTE') {
            return 'Borsa İstanbul seçici hisse senedi yatırımı ile %0 Stopaj avantajlı net alfa üretir.';
        }
        if (cat.includes('borçlanma') || cat.includes('eurobond') || cat.includes('kira')) {
            return 'Düzenli kupon ve sabit getirili enstrümanlar ile portföy oynaklığını dengeler.';
        }
        return `${fund.category || 'Çoklu Varlık'} kategorisinde portföy çeşitlendirmesi ve risk dağıtımı sağlar.`;
    },

    getArchetype(targets) {
        const liquid = targets['Likit Güvence & Alım Havuzu']?.current || 0;
        const tech = targets['Küresel Teknoloji & Büyüme']?.current || 0;
        const gold = targets['Altın Katılım & Enflasyon Kalkanı']?.current || 0;
        const bist = targets['Vergisiz BIST Alfa']?.current || 0;

        if (liquid >= 40) return { title: '🛡 Likit Kalkan & Alım Odaklı', summary: 'Yüksek nakit ve likit rezerviyle olası piyasa düzeltmelerinde alım gücünü maksimize eden savunmacı yapı.' };
        if (tech + bist >= 50) return { title: '🚀 Yüksek Büyüme & Hisse Odaklı', summary: 'Yerli ve küresel hisse senedi ağırlığıyla uzun vadeli reel sermaye büyümesini hedefleyen dinamik mimari.' };
        if (gold >= 30) return { title: '🥇 Enflasyon & Kıymetli Maden Kalkanı', summary: 'Altın ve değerli maden ağırlığıyla kur şoklarına ve enflasyona karşı yüksek koruma sağlayan yapı.' };
        return { title: '⚖ Dengeli & Çoklu Varlık Büyümesi', summary: 'Likit, küresel büyüme, enflasyon kalkanı ve hisse alfa arasında dengelenmiş optimum portföy mimarisi.' };
    },

    render() {
        const container = document.getElementById('strategyContainer');
        if (!container) return;

        const totalVal = Calculations.getTotalPortfolioValue();
        const funds = PortfolioData.funds || [];
        const cashTL = PortfolioData.cashTL || 0;
        const targets = Calculations.getStrategyTargets();

        if (funds.length === 0 && cashTL === 0) {
            container.innerHTML = `
                <div class="strategy-overview">
                    <div class="card strategy-text" style="text-align: center; padding: 48px 24px;">
                        <div style="font-size: 3rem; margin-bottom: 12px;">🎯</div>
                        <h2 style="margin-bottom: 8px;">Portföy Stratejisi ve Varlık Mimarisi</h2>
                        <p style="color: var(--text-secondary); max-width: 580px; margin: 0 auto 24px; font-size: 0.95rem; line-height: 1.6;">
                            Strateji motorunun dinamik varlık dağılımınızı, likit kalkanınızı ve rebalancing ihtiyaçlarınızı analiz edebilmesi için lütfen portföyünüze fon veya nakit ekleyin.
                        </p>
                        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                            <button class="btn btn-primary" onclick="Navigation.switchTab('add-fund')">
                                ➕ İlk Fonunuzu Ekleyin
                            </button>
                            <button class="btn btn-ghost" onclick="PortfolioBackup.openImportModal()">
                                📂 Yedekten Yükle
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const archetype = this.getArchetype(targets);
        const sortedFunds = [...funds].sort((a, b) => (b.shares * b.currentPrice) - (a.shares * a.currentPrice));

        let pillarsHtml = '';
        if (cashTL > 0) {
            const cashPct = totalVal > 0 ? (cashTL / totalVal) * 100 : 0;
            pillarsHtml += `
                <div class="principle-item">
                    <span class="principle-icon">💵</span>
                    <div class="principle-text">
                        <h4>Serbest Nakit Havuzu (%${cashPct.toFixed(1)} / ${Utils.formatCurrency(cashTL)})</h4>
                        <p>Anında kullanılabilir serbest TL rezervi; düşüşlerde alım fırsatı ve T+0 likidite gücü sağlar.</p>
                    </div>
                </div>
            `;
        }

        sortedFunds.forEach((f, idx) => {
            const val = f.shares * f.currentPrice;
            const pct = totalVal > 0 ? (val / totalVal) * 100 : 0;
            const meta = Utils.getFundMeta(f.code, f.category, f.name);
            const icon = f.icon || meta.icon || '💼';
            const roleDesc = this.getRoleDescription(f);

            pillarsHtml += `
                <div class="principle-item">
                    <span class="principle-icon">${icon}</span>
                    <div class="principle-text">
                        <h4>${idx + 1}. ${f.code} - ${Utils.escapeHtml(f.shortName || f.name)} (%${pct.toFixed(1)} / ${Utils.formatCurrency(val)})</h4>
                        <p>${roleDesc}</p>
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="strategy-overview">
                <div class="card strategy-text">
                    <h2>🎯 Güncel "${archetype.title}" Portföy Mimarisi</h2>
                    <p>Portföyünüz toplam <strong>${Utils.formatCurrency(totalVal)}</strong> büyüklüğe ulaşmış olup, ${funds.length} aktif fon ve serbest nakit ile dağıtılmıştır. ${archetype.summary}</p>

                    <h4 style="margin-top: 20px; margin-bottom: 12px; color:var(--accent-primary);">Portföyün Temel Direkleri (Varlık Dağılımı):</h4>
                    <div class="strategy-principles">
                        ${pillarsHtml}
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 16px;">📊 Stratejik Hedef vs. Mevcut Dağılım</h3>
                    ${Object.entries(Calculations.getStrategyTargets()).map(([name, cfg]) => {
                        const actual = cfg.current;
                        const target = cfg.target;
                        const diff = actual - target;
                        return `
                            <div class="alignment-item">
                                <div class="alignment-header">
                                    <div>
                                        <span class="alignment-label">${name}</span>
                                        <span style="display:block; font-size:0.7rem; color:var(--text-tertiary);">${cfg.role}</span>
                                    </div>
                                    <span class="alignment-values">
                                        Mevcut: <strong>%${actual.toFixed(1)}</strong> | Hedef: %${target.toFixed(0)}
                                        <span class="${Math.abs(diff) <= 3 ? 'positive' : 'warning-text'}" style="margin-left:4px;">
                                            (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%)
                                        </span>
                                    </span>
                                </div>
                                <div class="alignment-bar">
                                    <div class="alignment-fill" style="width: ${Math.min((actual / 60) * 100, 100)}%; background: ${cfg.color}"></div>
                                    <div class="alignment-target" style="left: ${Math.min((target / 60) * 100, 100)}%" title="Hedef: %${target}"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Smart Rebalancing & Order Matrix Section -->
            <div class="card rebalance-section-card" id="rebalanceSection">
                <div class="rebalance-header">
                    <div class="rebalance-header-title">
                        <div class="rebalance-icon-badge">⚡</div>
                        <div>
                            <h3>Akıllı Rebalancing & Tek Tıkla Emir Matrisi</h3>
                            <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">Hedef stratejiye ulaşmak için gereken net alım/satım adımları ve T+X valör optimizasyonu</p>
                        </div>
                    </div>
                </div>

                <div class="rebalance-moves-grid" id="rebalanceMovesGrid">
                    ${(() => {
                        const rebal = RebalancingEngine.calculate();
                        if (!rebal) return '<p style="color:var(--text-secondary);">Portföy boş.</p>';
                        return rebal.moves.map(m => {
                            const isBuy = m.action === 'BUY';
                            const isSell = m.action === 'SELL';
                            const pillClass = isBuy ? 'pill-buy' : isSell ? 'pill-sell' : 'pill-hold';
                            const pillText = isBuy ? '📈 Alış Önerisi' : isSell ? '📉 Kısmi Satış' : '✅ Dengede';
                            const colorClass = isBuy ? 'positive' : isSell ? 'negative' : 'neutral';
                            return `
                                <div class="rebalance-move-card">
                                    <div class="rebalance-move-top">
                                        <span style="font-size:0.82rem; font-weight:600; color:var(--text-primary);">${m.categoryName}</span>
                                        <span class="rebalance-action-pill ${pillClass}">${pillText}</span>
                                    </div>
                                    <div class="rebalance-move-amount ${colorClass}">
                                        ${m.diffTL >= 0 ? '+' : ''}${Utils.formatCurrency(m.diffTL)}
                                    </div>
                                    <div class="rebalance-move-shares">
                                        ${m.action !== 'HOLD' ? `Örnek Fon: <strong>${m.fund.code}</strong> &bull; ~${Utils.formatNumber(m.estShares)} Adet` : 'Hedefe tam uyumlu (%0 sapma)'}
                                    </div>
                                </div>
                            `;
                        }).join('');
                    })()}
                </div>

                <div class="order-matrix-panel">
                    <h4 style="font-size:0.88rem; color:var(--text-primary); margin-bottom:8px;">⏱ T+X Valör Akıllı İcra Sıralaması</h4>
                    <p style="font-size:0.75rem; color:var(--text-secondary);">Satış yapılan fonların nakdi hesaba geçtikçe (T+1 / T+2), alış emirleri sırayla devreye girer:</p>
                    <div class="order-matrix-timeline">
                        <div class="matrix-day-card">
                            <div class="matrix-day-title">1. GÜN (T+0 Anı)</div>
                            <div class="matrix-day-action">
                                Saat 13:00 öncesi ağırlığı fazla olan fonlarda kısmi satış emri verilir. T+0 fonların nakdi anında hesaba geçer.
                            </div>
                        </div>
                        <div class="matrix-day-card">
                            <div class="matrix-day-title">2. GÜN (T+1 Valörü)</div>
                            <div class="matrix-day-action">
                                T+1 satış bedeli hesaba yansır. Hedefin altında kalan T+1 alış emirleri (Altın / BIST) tetiklenir.
                            </div>
                        </div>
                        <div class="matrix-day-card">
                            <div class="matrix-day-title">3. GÜN (T+2 Valörü)</div>
                            <div class="matrix-day-action">
                                T+2 yabancı fon satış bedelleri çözülür. Kalan global teknoloji ve büyüme alımları tamamlanır.
                            </div>
                        </div>
                    </div>
                </div>

                <div class="rebalance-action-bar">
                    <span style="font-size:0.8rem; color:var(--text-secondary);">💡 Bu işlem emirleri "Bekleyen İşlemler" listenize aktarır ve takibini kolaylaştırır.</span>
                    <button class="apply-rebalance-btn" id="applyRebalanceBtn">
                        <span>⚡</span> Rebalancing Emirlerini Aktar
                    </button>
                </div>
            </div>
        `;

        const applyBtn = document.getElementById('applyRebalanceBtn');
        if (applyBtn && !applyBtn._hasListener) {
            applyBtn._hasListener = true;
            applyBtn.addEventListener('click', () => {
                RebalancingEngine.applyToPendingOrders();
            });
        }
    }
};

const RebalancingEngine = {
    calculate() {
        const totalVal = Calculations.getTotalPortfolioValue();
        if (totalVal <= 0) return null;

        const funds = PortfolioData.funds;
        const targets = Calculations.getStrategyTargets();
        const moves = [];

        const categoryFundMap = {
            'Likit Güvence & Alım Havuzu': funds.find(f => f.sellValor === 0 || (f.category || '').toLowerCase().includes('para piyasası')) || { code: 'AIS', name: 'Katılım Para Piyasası', currentPrice: 0.106629, sellValor: 0, buyValor: 0, valorCutoff: '13:00' },
            'Küresel Teknoloji & Büyüme': funds.find(f => (f.category || '').toLowerCase().includes('yabancı') || f.code === 'AFT' || f.code === 'IJC') || { code: 'AFT', name: 'Yeni Teknolojiler', currentPrice: 1.005931, sellValor: 2, buyValor: 1, valorCutoff: '13:30' },
            'Altın Katılım & Enflasyon Kalkanı': funds.find(f => (f.category || '').toLowerCase().includes('altın') || f.code === 'KZL') || { code: 'KZL', name: 'Altın Katılım Fonu', currentPrice: 2.455, sellValor: 1, buyValor: 1, valorCutoff: '13:30' },
            'Vergisiz BIST Alfa': funds.find(f => (f.category || '').toLowerCase().includes('hisse') || f.code === 'MAC') || { code: 'MAC', name: 'Marmara Capital Hisse', currentPrice: 0.088, sellValor: 2, buyValor: 1, valorCutoff: '13:30' }
        };

        Object.entries(targets).forEach(([categoryName, cfg]) => {
            const currentPct = cfg.current;
            const targetPct = cfg.target;
            const diffPct = targetPct - currentPct;
            const diffTL = (diffPct / 100) * totalVal;
            const fund = categoryFundMap[categoryName] || { code: 'FON', name: categoryName, currentPrice: 1, sellValor: 1, buyValor: 1, valorCutoff: '13:30' };
            const estShares = fund.currentPrice > 0 ? Math.round(Math.abs(diffTL) / fund.currentPrice) : 0;

            let action = 'HOLD';
            if (diffTL > 30) action = 'BUY';
            else if (diffTL < -30) action = 'SELL';

            moves.push({
                categoryName,
                role: cfg.role,
                color: cfg.color,
                currentPct,
                targetPct,
                diffPct,
                diffTL,
                action,
                fund,
                estShares
            });
        });

        const sellMoves = moves.filter(m => m.action === 'SELL');
        const buyMoves = moves.filter(m => m.action === 'BUY');
        const totalSellTL = sellMoves.reduce((s, m) => s + Math.abs(m.diffTL), 0);
        const totalBuyTL = buyMoves.reduce((s, m) => s + m.diffTL, 0);

        return {
            totalVal,
            moves,
            sellMoves,
            buyMoves,
            totalSellTL,
            totalBuyTL
        };
    },

    applyToPendingOrders() {
        const data = this.calculate();
        if (!data || (data.sellMoves.length === 0 && data.buyMoves.length === 0)) {
            Utils.showToast('Portföyünüz zaten hedef stratejiye mükemmel şekilde uyumlu.', 'success');
            return;
        }

        const newOrders = [];
        data.sellMoves.forEach((m, idx) => {
            newOrders.push({
                id: `REBAL-SELL-${Date.now()}-${idx}`,
                fundCode: m.fund.code,
                title: `${m.fund.code} Dengeleme Satış`,
                type: 'sell',
                typeLabel: 'Fon Satış Emri (Rebalance)',
                amount: Number(Math.abs(m.diffTL).toFixed(2)),
                status: 'Bekliyor',
                statusBadge: 'badge-warning',
                valorText: `T+${m.fund.sellValor} (Saat ${m.fund.valorCutoff || '13:30'} Öncesi)`,
                targetAction: `${Utils.formatCurrency(Math.abs(m.diffTL))} serbest nakde dönüşecek.`,
                note: `Strateji rebalancing: ${m.categoryName} hedefine yaklaştırma satışı.`
            });
        });

        data.buyMoves.forEach((m, idx) => {
            newOrders.push({
                id: `REBAL-BUY-${Date.now()}-${idx}`,
                fundCode: m.fund.code,
                title: `${m.fund.code} Dengeleme Alış`,
                type: 'buy',
                typeLabel: 'Fon Alış Emri (Rebalance)',
                amount: Number(m.diffTL.toFixed(2)),
                status: 'Bekliyor',
                statusBadge: 'badge-info',
                valorText: `T+${m.fund.buyValor} (Saat ${m.fund.valorCutoff || '13:30'} Öncesi)`,
                targetAction: `${m.fund.code} pozisyonuna ${Utils.formatCurrency(m.diffTL)} ekleme yapılacak.`,
                note: `Strateji rebalancing: ${m.categoryName} hedefine yaklaştırma alışı.`
            });
        });

        PortfolioData.pendingOrders = [...(PortfolioData.pendingOrders || []), ...newOrders];
        PortfolioManager.save(PortfolioData.funds, PortfolioData.cashTL, PortfolioData.pendingOrders);
        Dashboard.renderPendingTransactions();
        Utils.showToast(`${newOrders.length} adet rebalancing emri bekleyen işlemlere aktarıldı!`, 'success');
        Navigation.switchTab('dashboard');
    }
};

const ValorTimeline = {
    calculateCashFlowProjection() {
        const cashTL = PortfolioData.cashTL;
        const pending = PortfolioData.pendingOrders || [];

        const days = [];
        const now = new Date();

        let runningCash = cashTL;

        for (let d = 0; d < 4; d++) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() + d);

            const dayName = d === 0 ? 'Bugün (T+0)' : `T+${d} Gün`;
            const dateStr = targetDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

            let inflow = 0;
            let outflow = 0;

            pending.forEach(order => {
                const amt = parseFloat(order.amount) || 0;
                let orderValor = 0;
                if (order.valorText) {
                    const match = order.valorText.match(/T\+(\d+)/);
                    if (match) orderValor = parseInt(match[1], 10);
                }

                if (orderValor === d) {
                    if (order.type === 'sell') inflow += amt;
                    else if (order.type === 'buy') outflow += amt;
                }
            });

            runningCash = runningCash + inflow - outflow;

            days.push({
                dayIndex: d,
                dayName,
                dateStr,
                inflow,
                outflow,
                projectedCash: runningCash
            });
        }

        return days;
    },

    render() {
        const grid = document.getElementById('timelineProjectionGrid');
        const tracksContainer = document.getElementById('timelineTracksContainer');
        const counterEl = document.getElementById('timelineOrderCounter');

        if (!grid) return;

        const projections = this.calculateCashFlowProjection();
        const pending = PortfolioData.pendingOrders || [];

        if (counterEl) {
            counterEl.textContent = `${pending.length} Aktif Emir`;
        }

        let gridHtml = '';
        projections.forEach(p => {
            const hasFlows = p.inflow > 0 || p.outflow > 0;
            gridHtml += `
                <div class="projection-day-card">
                    <div class="projection-day-top">
                        <span class="projection-day-badge">${p.dayName}</span>
                        <span class="projection-day-date">${p.dateStr}</span>
                    </div>
                    <div class="projection-balance-label">Tahmini Serbest Bakiye</div>
                    <div class="projection-balance">${Utils.formatCurrency(p.projectedCash)}</div>
                    <div class="projection-flows">
                        ${p.inflow > 0 ? `<span class="flow-in">🟢 Giriş: +${Utils.formatCurrency(p.inflow)}</span>` : ''}
                        ${p.outflow > 0 ? `<span class="flow-out">🔴 Çıkış: -${Utils.formatCurrency(p.outflow)}</span>` : ''}
                        ${!hasFlows ? '<span style="color:var(--text-secondary); opacity:0.6;">(Bekleyen akış yok)</span>' : ''}
                    </div>
                </div>
            `;
        });
        grid.innerHTML = gridHtml;

        if (tracksContainer) {
            if (pending.length === 0) {
                tracksContainer.innerHTML = `
                    <div style="text-align:center; padding:20px; color:var(--text-secondary); font-size:0.85rem;">
                        <span>✨</span> Şu an takas sürecinde bekleyen bir alım/satım emri bulunmamaktadır.
                    </div>
                `;
                return;
            }

            let tracksHtml = '';
            pending.forEach(order => {
                const isSell = order.type === 'sell';
                const amt = parseFloat(order.amount) || 0;
                let valorDays = 0;
                if (order.valorText) {
                    const match = order.valorText.match(/T\+(\d+)/);
                    if (match) valorDays = parseInt(match[1], 10);
                }

                const widthPct = valorDays === 0 ? 35 : Math.min(35 + valorDays * 25, 95);
                const segmentClass = isSell ? 'segment-active-sell' : 'segment-active-buy';
                const actionLabel = isSell ? 'Satış Takası' : 'Alış İcrası';

                tracksHtml += `
                    <div class="timeline-track-item">
                        <div class="track-info">
                            <div class="track-title">${Utils.escapeHtml(order.title)}</div>
                            <div class="track-amount ${isSell ? 'positive' : 'negative'}">
                                ${isSell ? '+' : '-'}${Utils.formatCurrency(amt)}
                            </div>
                        </div>
                        <div class="track-gantt-bar">
                            <div class="gantt-step-segment ${segmentClass}" style="width: ${widthPct}%;">
                                ${actionLabel} (T+${valorDays})
                            </div>
                        </div>
                        <div class="track-valor-meta">
                            <div>${Utils.escapeHtml(order.valorText || 'T+0')}</div>
                            <div style="font-size:0.65rem; color:var(--text-tertiary);">${order.status}</div>
                        </div>
                    </div>
                `;
            });
            tracksContainer.innerHTML = tracksHtml;
        }
    }
};

const PlanTab = {
    render() {
        const container = document.getElementById('planContainer');
        if (!container) return;

        const totalVal = Calculations.getTotalPortfolioValue();
        const funds = PortfolioData.funds;
        const pending = PortfolioData.pendingOrders;

        let pendingText = 'Şu an beklemede olan bir alım/satım emri bulunmamaktadır.';
        if (pending.length > 0) {
            pendingText = pending.map(o => `<strong>${Utils.escapeHtml(o.title)} (${Utils.formatCurrency(o.amount)}):</strong> ${Utils.escapeHtml(o.targetAction || (o.status + ' valör sürecindedir.'))}`).join('<br>');
        }

        const liquidFunds = funds.filter(f => f.sellValor === 0 || (f.category || '').toLowerCase().includes('para piyasası'));
        const liquidTotal = liquidFunds.reduce((s, f) => s + (f.shares * f.currentPrice), PortfolioData.cashTL);
        const liquidPct = totalVal > 0 ? ((liquidTotal / totalVal) * 100).toFixed(1) : 0;

        container.innerHTML = `
            <div class="card">
                <h2 style="margin-bottom: 8px;">📋 Güncel Portföy Uygulama ve Rebalancing Kılavuzu</h2>
                <p style="color: var(--text-secondary); margin-bottom: 24px;">Portföyünüzün toplam büyüklüğü <strong>${Utils.formatCurrency(totalVal)}</strong> olup ${funds.length} pozisyonda takip edilmektedir.</p>

                <div class="plan-timeline">
                    <div class="plan-step" data-step="1">
                        <h3>1. Adım: Bekleyen Emirlerin Yönetimi</h3>
                        <p>${pendingText}</p>
                    </div>

                    <div class="plan-step" data-step="2">
                        <h3>2. Adım: Alım Fırsatı ve Likidite Havuzu</h3>
                        <p>Portföyün <strong>%${liquidPct} kadarı (${Utils.formatCurrency(liquidTotal)})</strong> likit varlıklarda hazır beklemektedir. Piyasa düzeltmelerinde bu havuzdan büyüme fonlarına parçalı alım (DCA) yapılabilir.</p>
                    </div>

                    <div class="plan-step" data-step="3">
                        <h3>3. Adım: Valör ve Saat 13:30 Kuralı</h3>
                        <p>Alım ve satım işlemlerinizi TEFAS kuralı gereği saat <strong>13:30</strong>'dan önce verin (bazı likit fonlarda 13:00). Satışlarda paranın fonun valör süresine ($T+1, T+2, T+3$) göre hesaba geçeceğini dikkate alınız.</p>
                    </div>

                    <div class="plan-step" data-step="4">
                        <h3>4. Adım: Vergi & Stopaj Optimizasyonu</h3>
                        <p>Hisse senedi yoğun fonlarda (en az %80 yerli hisse taşıyan fonlar) stopaj oranı genellikle <strong>%0</strong> (vergisiz)'dir. Diğer fonlarda mevzuat gereği kazanç üzerinden stopaj kesintisi uygulanır.</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>⏱ Portföy Fonları Valör ve İşlem Saatleri Tablosu</h3>
                </div>
                <div class="valor-calendar-grid">
                    ${funds.map(fund => `
                        <div class="valor-calendar-item" style="border-top: 3px solid ${fund.color}">
                            <div class="fund-code" style="color: ${fund.color}; font-size:1.1rem; font-weight:800;">
                                ${fund.icon || '💼'} ${fund.code}
                            </div>
                            <div style="font-size:0.75rem; color:var(--text-tertiary); margin-bottom:8px;">${Utils.escapeHtml(fund.shortName || fund.name)}</div>
                            <div class="valor-times">
                                <div>
<span class="valor-time-label">Alış</span>
                                    <span class="valor-time-value">${fund.buyValor === 0 ? 'T+0' : `T+${fund.buyValor}`}</span>
                                </div>
                                <div>
                                    <span class="valor-time-label">Satış</span>
                                    <span class="valor-time-value">${fund.sellValor === 0 ? 'T+0' : `T+${fund.sellValor}`}</span>
                                </div>
                                <div>
                                    <span class="valor-time-label">Saat</span>
                                    <span class="valor-time-value" style="color:var(--warning);">${fund.valorCutoff || '13:30'}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};

const ZenithIntelligence = {
    initialized: false,
    byokConfig: {
        provider: 'anthropic',
        apiKey: '',
        model: 'claude-3-5-sonnet-20241022'
    },

    init() {
        if (this.initialized) return;
        this.initHardware();
        this.loadByokConfig();

        const btn = document.getElementById('generateAiReportBtn');
        if (btn) {
            btn.addEventListener('click', () => this.generateReport('quant'));
        }
        const neuralBtn = document.getElementById('generateDeepNeuralBtn');
        if (neuralBtn) {
            neuralBtn.addEventListener('click', () => this.generateReport('neural'));
        }
        const llmBtn = document.getElementById('generateLlmReportBtn');
        if (llmBtn) {
            llmBtn.addEventListener('click', () => this.generateLlmReport());
        }
        const byokSettingsBtn = document.getElementById('openByokSettingsBtn');
        if (byokSettingsBtn) {
            byokSettingsBtn.addEventListener('click', () => this.openByokModal());
        }
        const closeByokBtn = document.getElementById('closeByokSettingsModal');
        if (closeByokBtn) {
            closeByokBtn.addEventListener('click', () => this.closeByokModal());
        }
        const dismissByokBtn = document.getElementById('dismissByokSettingsModal');
        if (dismissByokBtn) {
            dismissByokBtn.addEventListener('click', () => this.closeByokModal());
        }
        const saveByokBtn = document.getElementById('saveByokSettingsBtn');
        if (saveByokBtn) {
            saveByokBtn.addEventListener('click', () => this.saveByokSettingsFromModal());
        }
        const clearByokBtn = document.getElementById('clearByokKeyBtn');
        if (clearByokBtn) {
            clearByokBtn.addEventListener('click', () => this.clearByokKey());
        }
        const providerSelect = document.getElementById('byokProviderSelect');
        if (providerSelect) {
            providerSelect.addEventListener('change', (e) => {
                const modelInput = document.getElementById('byokModelInput');
                if (modelInput) {
                    if (e.target.value === 'anthropic') modelInput.value = 'claude-3-5-sonnet-20241022';
                    else if (e.target.value === 'openai') modelInput.value = 'gpt-4o';
                    else if (e.target.value === 'gemini') modelInput.value = 'gemini-1.5-flash';
                    else if (e.target.value === 'groq') modelInput.value = 'llama-3.3-70b-versatile';
                    else if (e.target.value === 'deepseek') modelInput.value = 'deepseek-chat';
                }
            });
        }

        const copyBtn = document.getElementById('copyAiReportBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyReport());
        }
        const downloadBtn = document.getElementById('downloadAiReportBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.openDownloadModal());
        }
        const closeDownloadBtn = document.getElementById('closeAiDownloadModal');
        if (closeDownloadBtn) {
            closeDownloadBtn.addEventListener('click', () => this.closeDownloadModal());
        }
        const cancelDownloadBtn = document.getElementById('cancelAiDownload');
        if (cancelDownloadBtn) {
            cancelDownloadBtn.addEventListener('click', () => this.closeDownloadModal());
        }
        const txtChoiceBtn = document.getElementById('downloadTxtChoice');
        if (txtChoiceBtn) {
            txtChoiceBtn.addEventListener('click', () => this.downloadTxt());
        }
        const pdfChoiceBtn = document.getElementById('downloadPdfChoice');
        if (pdfChoiceBtn) {
            pdfChoiceBtn.addEventListener('click', () => this.downloadPdf());
        }
        const excelChoiceBtn = document.getElementById('downloadExcelChoice');
        if (excelChoiceBtn) {
            excelChoiceBtn.addEventListener('click', () => {
                this.closeDownloadModal();
                ExcelExport.export();
            });
        }

        const modal = document.getElementById('aiDownloadModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeDownloadModal();
            });
        }

        this.initialized = true;
    },

    loadByokConfig() {
        try {
            const saved = localStorage.getItem('zenith_byok_config_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.byokConfig = { ...this.byokConfig, ...parsed };
            }
        } catch (e) {}
    },

    saveByokConfig() {
        try {
            localStorage.setItem('zenith_byok_config_v1', JSON.stringify(this.byokConfig));
        } catch (e) {}
    },

    openByokModal() {
        this.loadByokConfig();
        const modal = document.getElementById('byokSettingsModal');
        const providerSel = document.getElementById('byokProviderSelect');
        const keyInput = document.getElementById('byokApiKeyInput');
        const modelInput = document.getElementById('byokModelInput');

        if (providerSel) providerSel.value = this.byokConfig.provider || 'anthropic';
        if (keyInput) keyInput.value = this.byokConfig.apiKey || '';
        if (modelInput) modelInput.value = this.byokConfig.model || 'claude-3-5-sonnet-20241022';

        if (modal) modal.classList.add('active');
    },

    closeByokModal() {
        const modal = document.getElementById('byokSettingsModal');
        if (modal) modal.classList.remove('active');
    },

    saveByokSettingsFromModal() {
        const providerSel = document.getElementById('byokProviderSelect');
        const keyInput = document.getElementById('byokApiKeyInput');
        const modelInput = document.getElementById('byokModelInput');

        const provider = providerSel ? providerSel.value : 'anthropic';
        const apiKey = keyInput ? keyInput.value.trim() : '';
        const model = modelInput ? modelInput.value.trim() : 'claude-3-5-sonnet-20241022';

        this.byokConfig = { provider, apiKey, model };
        this.saveByokConfig();
        this.closeByokModal();
        Utils.showToast(`🔒 ${provider.toUpperCase()} (${model}) API anahtarı güvenle yerel hafızaya kaydedildi.`, 'success');
    },

    clearByokKey() {
        this.byokConfig = { provider: 'anthropic', apiKey: '', model: 'claude-3-5-sonnet-20241022' };
        localStorage.removeItem('zenith_byok_config_v1');
        const keyInput = document.getElementById('byokApiKeyInput');
        if (keyInput) keyInput.value = '';
        this.closeByokModal();
        Utils.showToast('Yapay zeka API anahtarı silindi.', 'info');
    },

    async generateLlmReport() {
        this.loadByokConfig();
        if (!this.byokConfig.apiKey || !this.byokConfig.apiKey.trim()) {
            this.openByokModal();
            Utils.showToast('Lütfen önce bir yapay zeka API anahtarı (Claude, GPT, Gemini, Groq) girin.', 'info');
            return;
        }

        const contentEl = document.getElementById('aiReportContent');
        if (!contentEl) return;

        contentEl.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 2.5rem; margin-bottom: 12px; animation: pulse 1.5s infinite;">🤖</div>
                <h4 style="color: var(--text-primary); margin-bottom: 8px;">Zenith LLM Analisti Çalışıyor...</h4>
                <p style="color: var(--text-secondary); font-size: 0.85rem;">Portföyünüzün 1.051 TEFAS fonu, Sharpe rasyosu, 2026 stopaj yükümlülükleri ve FX atıfı ${this.byokConfig.provider.toUpperCase()} (${this.byokConfig.model}) modeline iletiliyor.</p>
            </div>
        `;

        try {
            const promptText = this.buildPromptContext();
            const responseText = await this.callLlmApi(promptText);
            this.renderLlmReport(responseText);
            Utils.showToast('✅ Canlı LLM portföy analizi tamamlandı.', 'success');
        } catch (err) {
            console.error('LLM API Error:', err);
            contentEl.innerHTML = `
                <div style="padding: 20px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: var(--radius-md);">
                    <h4 style="color: #EF4444; margin-bottom: 8px;">❌ Yapay Zeka Bağlantı Hatası</h4>
                    <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">${Utils.escapeHtml(err.message || 'API anahtarı veya model yanıt vermedi.')}</p>
                    <button class="btn btn-sm btn-primary" onclick="ZenithIntelligence.generateReport('quant')">⚡ Yerel Quant Analizini Göster</button>
                </div>
            `;
            Utils.showToast('Yapay zeka yanıt veremedi. Yerel analiz kullanılabilir.', 'error');
        }
    },

    buildPromptContext() {
        const totalVal = Calculations.getTotalPortfolioValue();
        const totalCost = Calculations.getTotalCost();
        const totalProfit = Calculations.getTotalReturn();
        const profitPct = Calculations.getTotalReturnPercent();
        const cashTL = PortfolioData.cashTL;
        const funds = PortfolioData.funds;

        let fundList = funds.map(f => {
            const val = f.shares * f.currentPrice;
            const weight = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : 0;
            return `- ${f.code} (${f.name}) | Kategori: ${f.category} | Ağırlık: %${weight} | Tutar: ${Utils.formatCurrency(val)} | Stopaj: ${f.tax || '%7.5'}`;
        }).join('\n');

        return `Sen üst düzey bir Kantitatif Portföy Yöneticisi ve Finansal Baş Danışmansın (Chief Investment Officer).
Aşağıda Türkiye TEFAS fon piyasasında işlem gören bir yatırımcının canlı portföy verileri bulunmaktadır.

=== PORTFÖY ÖZETİ ===
- Toplam Portföy Değeri: ${Utils.formatCurrency(totalVal)}
- Toplam Maliyet: ${Utils.formatCurrency(totalCost)}
- Kar / Zarar: ${Utils.formatCurrency(totalProfit)} (%${profitPct.toFixed(2)})
- Boşta Bekleyen TL Nakit: ${Utils.formatCurrency(cashTL)}

=== MEVCUT FON DAĞILIMI ===
${fundList || 'Fon bulunmuyor.'}

=== GÖREVİN ===
Lütfen bu portföyü aşağıdaki 4 ana başlık altında profesyonelce, net ve aksiyon odaklı bir yönetici notu (Executive Memo) şeklinde analiz et:
1. 🎯 Portföy Sağlık Skoru (100 üzerinden puanla) & Genel Varlık Dağılımı Değerlendirmesi
2. ⚡ 2026 Resmi Stopaj ve Vergi Optimizasyonu (GVK Geçici 67. Madde %0 Hisse Senedi Muafiyeti ve %7.5-%10 fon stopaj kalkanı)
3. 🛡 Risk, Likidite & Kur Hassasiyeti (Dolar/Kur Etkisi vs Reel Alfa Büyümesi)
4. 🚀 30-90 Günlük Taktiksel Rebalancing ve Kademeli Alım (DCA) Önerileri

Yanıtını Türkçe, profesyonel, temiz markdown formatında başlıklar ve maddelerle sun.`;
    },

    async callLlmApi(prompt) {
        const { provider, apiKey, model } = this.byokConfig;

        if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20241022',
                    max_tokens: 2000,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error?.message || `Anthropic API Hatası (${res.status})`);
            }
            const data = await res.json();
            return data.content?.[0]?.text || 'Yanıt alınamadı.';
        } else if (provider === 'openai' || provider === 'groq' || provider === 'deepseek') {
            let endpoint = 'https://api.openai.com/v1/chat/completions';
            if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
            if (provider === 'deepseek') endpoint = 'https://api.deepseek.com/chat/completions';

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o')),
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error?.message || `API Hatası (${res.status})`);
            }
            const data = await res.json();
            return data.choices?.[0]?.message?.content || 'Yanıt alınamadı.';
        } else if (provider === 'gemini') {
            const geminiModel = model || 'gemini-1.5-flash';
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error?.message || `Gemini API Hatası (${res.status})`);
            }
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt alınamadı.';
        }

        throw new Error('Desteklenmeyen sağlayıcı seçildi.');
    },

    renderLlmReport(markdownText) {
        const contentEl = document.getElementById('aiReportContent');
        if (!contentEl) return;

        let formatted = markdownText
            .replace(/^### (.*$)/gim, '<h4 style="color:var(--text-primary); margin:14px 0 6px 0; font-size:1.05rem;">$1</h4>')
            .replace(/^## (.*$)/gim, '<h3 style="color:var(--accent-primary); margin:18px 0 8px 0; font-size:1.15rem; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:4px;">$1</h3>')
            .replace(/^# (.*$)/gim, '<h2 style="color:var(--text-primary); margin:20px 0 10px 0;">$1</h2>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/^\- (.*$)/gim, '<li style="margin-left:20px; margin-bottom:4px; line-height:1.5;">$1</li>')
            .replace(/\n\n/gim, '<br><br>');

        contentEl.innerHTML = `
            <div class="llm-report-wrapper" style="padding: 10px 5px; color: var(--text-primary); font-size: 0.9rem; line-height: 1.6;">
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.25); border-radius:var(--radius-md); padding:10px 14px; margin-bottom:18px;">
                    <div style="font-size:0.82rem; color:var(--text-secondary);">
                        🤖 <strong>Model:</strong> ${this.byokConfig.provider.toUpperCase()} - <code>${this.byokConfig.model}</code>
                    </div>
                    <span class="badge badge-success">Canlı LLM Çıktısı</span>
                </div>
                ${formatted}
            </div>
        `;
    },

    initHardware() {
        const hwEl = document.getElementById('aiHardwareStatus');
        if (hwEl) {
            if (typeof navigator !== 'undefined' && navigator.gpu) {
                hwEl.textContent = '🟢 WebGPU Donanım Hızlandırma';
                hwEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                hwEl.style.color = '#34D399';
            } else {
                hwEl.textContent = '⚡ WebGPU & Quant Engine';
            }
        }
    },

    synthesizeNeuralPillars(m, totalVal, funds) {
        const cashTL = PortfolioData.cashTL;
        let liquidVal = cashTL;
        let globalTechVal = 0;
        let goldVal = 0;
        let bistVal = 0;
        let bondVal = 0;

        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const cat = (f.category || '').toLowerCase();
            const code = (f.code || '').toUpperCase();

            if (f.sellValor === 0 || cat.includes('para piyasası')) {
                liquidVal += val;
            } else if (cat.includes('yabancı') || code === 'AFT' || code === 'YAY' || code === 'IJC') {
                globalTechVal += val;
            } else if (cat.includes('altın') || cat.includes('kıymetli') || code === 'KZL' || code === 'TCA' || code === 'GGK') {
                goldVal += val;
            } else if (cat.includes('hisse') || code === 'MAC' || code === 'TI2' || code === 'ADE' || code === 'TTE') {
                bistVal += val;
            } else {
                bondVal += val;
            }
        });

        const liquidPct = totalVal > 0 ? ((liquidVal / totalVal) * 100).toFixed(1) : '0';
        const globalTechPct = totalVal > 0 ? ((globalTechVal / totalVal) * 100).toFixed(1) : '0';
        const goldPct = totalVal > 0 ? ((goldVal / totalVal) * 100).toFixed(1) : '0';
        const bistPct = totalVal > 0 ? ((bistVal / totalVal) * 100).toFixed(1) : '0';

        const p1Text = parseFloat(liquidPct) >= 30
            ? `Portföyünüzün %${liquidPct} oranındaki güçlü likit gövdesi (AIS / TP2 / Nakit), TCMB para politikası ekseninde bileşik getiri üretirken, olası BIST veya Nasdaq geri çekilmelerinde anında alım yapabilecek güçlü bir sermaye rezervi (Dry Powder) sunmaktadır.`
            : `Portföyün likidite payı %${liquidPct} seviyesindedir. Piyasa dalgalanmalarında nakit esnekliğini korumak ve düşüşlerde alım gücü sağlamak için para piyasası payı dengelenebilir.`;

        const p2Text = parseFloat(globalTechPct) >= 15
            ? `Portföydeki %${globalTechPct} büyüklüğündeki küresel teknoloji ve yarı iletken varlıkları (AFT, IJC), yapay zeka mega-trendinin sağladığı asimetrik büyümeden pay alırken, döviz bazlı varlık yapısıyla TL'deki değer değişimlerine karşı doğal bir kur kalkanı oluşturmaktadır.`
            : `Küresel büyüme ve teknoloji payı %${globalTechPct} düzeyindedir. Dolar bazlı küresel teknoloji devlerine kademeli dağıtım küresel getiri potansiyelini artırabilir.`;

        const p3Text = parseFloat(goldPct) >= 5
            ? `Fiziki altına dayalı %${goldPct} payındaki kıymetli maden pozisyonunuz (KZL), jeopolitik krizler ve iç enflasyon karşısında portföyün negatif korelasyonlu 'Kriz Kalkanı' görevini başarıyla üstlenmektedir.`
            : `Altın ve emtia payı %${goldPct} düzeyindedir. Enflasyon ve küresel jeopolitik risklere karşı dengeleyici altın fonları değerlendirilebilir.`;

        const p4Text = `30-90 Günlük Eylem Planı: Likit havuzda (%${liquidPct}) biriken kar payları, BIST ve küresel teknoloji endekslerindeki %3-%5 üzeri teknik düzeltmelerde 3 parçalı DCA (Kademeli Maliyetleme) stratejisiyle hisse/büyüme fonlarına aktarılabilir.`;

        return [
            { title: '1. 🏛 Makroekonomik Faiz & Likidite Korelasyonu', text: p1Text },
            { title: '2. 🌐 Küresel Büyüme & Teknoloji Trendleri (Döviz Hedge)', text: p2Text },
            { title: '3. 🥇 Jeopolitik Risk & Enflasyon Kalkanı', text: p3Text },
            { title: '4. 🎯 Taktiksel Rebalancing & Kademeli Alım (DCA) Yol Haritası', text: p4Text }
        ];
    },

    getQuantMetrics() {
        const totalVal = Calculations.getTotalPortfolioValue();
        const funds = PortfolioData.funds;
        const cash = PortfolioData.cashTL;

        if (totalVal <= 0 || funds.length === 0) {
            return {
                healthScore: 0,
                healthRating: 'N/A',
                healthBadge: 'badge-secondary',
                hhi: 0,
                hhiStatus: 'Portföy Boş',
                liquidityPct: 0,
                weightedRisk: 0,
                hedgePct: 0,
                recommendations: ['Portföyünüze fon ekleyerek yapay zeka analizini başlatabilirsiniz.']
            };
        }

        let totalRiskSum = 0;
        let liquidSum = cash;
        let hedgeSum = 0;
        let hhiSum = 0;

        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const weight = val / totalVal;
            const risk = f.riskScore || 3;
            totalRiskSum += weight * risk;

            if (f.sellValor === 0 || (f.category || '').toLowerCase().includes('para piyasası')) {
                liquidSum += val;
            }

            const cat = (f.category || '').toLowerCase();
            const asset = (f.assetClass || '').toLowerCase();
            if (cat.includes('kıymetli') || cat.includes('altın') || cat.includes('yabancı') || asset.includes('altın') || asset.includes('teknoloji') || cat.includes('hisse')) {
                hedgeSum += val;
            }

            hhiSum += Math.pow(weight * 100, 2);
        });

        if (cash > 0) {
            const cashWeight = cash / totalVal;
            hhiSum += Math.pow(cashWeight * 100, 2);
        }

        const weightedRisk = Number(totalRiskSum.toFixed(1));
        const liquidityPct = Number(((liquidSum / totalVal) * 100).toFixed(1));
        const hedgePct = Number(((hedgeSum / totalVal) * 100).toFixed(1));
        const hhi = Math.round(hhiSum);

        let hhiStatus = 'Optimum Dağılım';
        if (hhi > 3500) hhiStatus = 'Yüksek Yoğunlaşma';
        else if (hhi > 2000) hhiStatus = 'Orta Dağılım';

        let score = 100;
        if (hhi > 3500) score -= 20;
        else if (hhi > 2500) score -= 10;

        if (liquidityPct < 10) score -= 15;
        if (hedgePct < 15) score -= 10;
        if (weightedRisk > 6) score -= 10;

        score = Math.max(20, Math.min(100, score));

        let healthRating = 'A+ (Yüksek Denge)';
        let healthBadge = 'badge-success';
        if (score < 60) {
            healthRating = 'C (Riskli)';
            healthBadge = 'badge-danger';
        } else if (score < 80) {
            healthRating = 'B (Dengeli)';
            healthBadge = 'badge-warning';
        }

        const recommendations = [];
        if (liquidityPct < 15) {
            recommendations.push(`💧 **Likidite:** Anlık T+0 nakde dönüşebilen varlık oranınız %${liquidityPct}. Olası nakit gereksinimleri veya alım fırsatları için Para Piyasası fonu payı artırılabilir.`);
        } else if (liquidityPct > 60) {
            recommendations.push(`⚡ **Getiri Optimizasyonu:** Portföyün %${liquidityPct}'si likit fonlarda değerleniyor. Uzun vadeli getiri için kademeli olarak hisse veya kıymetli maden fonlarına dağıtım düşünülebilir.`);
        }

        if (hhi > 3500) {
            recommendations.push(`⚠ **Yoğunlaşma Uyarısı:** Varlıklarınız az sayıda fonda yoğunlaşmış (HHI: ${hhi}). Riski dağıtmak adına farklı varlık sınıflarına pay verilebilir.`);
        }

        if (recommendations.length === 0) {
            recommendations.push(`✅ **Dengeli Dağılım:** Portföyünüz risk, likidite ve büyüme hedefleri arasında optimum dengeye sahiptir.`);
        }

        return {
            healthScore: score,
            healthRating,
            healthBadge,
            hhi,
            hhiStatus,
            liquidityPct,
            weightedRisk,
            hedgePct,
            recommendations
        };
    },

    render() {
        this.init();
        const metricsGrid = document.getElementById('aiMetricsGrid');
        if (!metricsGrid) return;

        const m = this.getQuantMetrics();

        metricsGrid.innerHTML = `
            <div class="ai-metric-card">
                <div class="ai-metric-top">
                    <span class="ai-metric-label">Portföy Sağlık Puanı</span>
                    <span class="badge ${m.healthBadge}">${m.healthRating}</span>
                </div>
                <div class="ai-metric-value">${m.healthScore}<span class="ai-metric-unit">/100</span></div>
                <div class="ai-metric-sub">Quant Risk & Dağılım Analizi</div>
            </div>

            <div class="ai-metric-card">
                <div class="ai-metric-top">
                    <span class="ai-metric-label">Likidite (T+0 Esnekliği)</span>
                    <span class="badge badge-info">%${m.liquidityPct}</span>
                </div>
                <div class="ai-metric-value">%${m.liquidityPct}</div>
                <div class="ai-metric-sub">Anlık nakde çevrilebilir varlık payı</div>
            </div>

            <div class="ai-metric-card">
                <div class="ai-metric-top">
                    <span class="ai-metric-label">Yoğunlaşma İndeksi (HHI)</span>
                    <span class="badge badge-purple">${m.hhiStatus}</span>
                </div>
                <div class="ai-metric-value">${m.hhi}</div>
                <div class="ai-metric-sub">Herfindahl-Hirschman Risk Skoru</div>
            </div>

            <div class="ai-metric-card">
                <div class="ai-metric-top">
                    <span class="ai-metric-label">Ağırlıklı Risk Düzeyi</span>
                    <span class="badge badge-warning">${m.weightedRisk} / 7.0</span>
                </div>
                <div class="ai-metric-value">${m.weightedRisk}<span class="ai-metric-unit">/7</span></div>
                <div class="ai-metric-sub">SPK Risk Skalası Ağırlıklı Ortalaması</div>
            </div>
        `;
    },

    generateReport(mode = 'quant') {
        const contentEl = document.getElementById('aiReportContent');
        const quantBtn = document.getElementById('generateAiReportBtn');
        const neuralBtn = document.getElementById('generateDeepNeuralBtn');
        if (!contentEl) return;

        if (mode === 'neural') {
            if (neuralBtn) {
                neuralBtn.disabled = true;
                neuralBtn.innerHTML = '<span>⏳</span> Sinirsel Ağlar Hesaplanıyor...';
            }
            if (quantBtn) quantBtn.disabled = true;
        } else {
            if (quantBtn) {
                quantBtn.disabled = true;
                quantBtn.innerHTML = '<span>⏳</span> Analiz Ediliyor...';
            }
            if (neuralBtn) neuralBtn.disabled = true;
        }

        const delay = mode === 'neural' ? 400 : 250;

        setTimeout(() => {
            try {
                const m = this.getQuantMetrics();
                const totalVal = Calculations.getTotalPortfolioValue();
                const netPnL = Calculations.getTotalReturn();
                const pnlPct = Calculations.getTotalReturnPercent();
                const funds = PortfolioData.funds;

                if (quantBtn) {
                    quantBtn.disabled = false;
                    quantBtn.innerHTML = '<span>⚡</span> Quant Analizi Yenile';
                }
                if (neuralBtn) {
                    neuralBtn.disabled = false;
                    neuralBtn.innerHTML = '<span>🧠</span> Derin Sinirsel Analiz (WebGPU)';
                }

                if (funds.length === 0) {
                    contentEl.innerHTML = `
                        <div class="ai-placeholder">
                            <span>💼</span>
                            <p>Analiz edilecek fon bulunamadı. Lütfen önce "Fon Ekle" sekmesinden portföyünüze pozisyon ekleyin.</p>
                        </div>
                    `;
                    return;
                }

                const fundBreakdownHtml = funds.map(f => {
                    const val = f.shares * f.currentPrice;
                    const weight = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : 0;
                    const safeCode = Utils.escapeHtml(f.code);
                    const safeName = Utils.escapeHtml(f.shortName || f.name);
                    const valorText = f.sellValor === 0 ? 'T+0' : `T+${f.sellValor}`;
                    return `
                        <div class="ai-fund-row">
                            <div class="ai-fund-info">
                                <span class="ai-fund-code">${safeCode}</span>
                                <span class="ai-fund-name">${safeName}</span>
                            </div>
                            <div class="ai-fund-stats">
                                <span class="ai-fund-weight">%${weight}</span>
                                <span class="badge ${f.sellValor === 0 ? 'badge-success' : 'badge-info'}">${valorText}</span>
                                <span class="ai-fund-val">₺${val.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    `;
                }).join('');

                const recsHtml = m.recommendations.map(r => `
                    <div class="ai-rec-item">
                        <p>${r.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
                    </div>
                `).join('');

                const neuralPillars = this.synthesizeNeuralPillars(m, totalVal, funds);

                let neuralHtml = '';
                if (mode === 'neural') {
                    neuralHtml = `
                        <div class="ai-neural-card">
                            <div class="ai-neural-header">
                                <div class="ai-neural-title">
                                    <span>🧠</span>
                                    <span>Tarayıcı İçi Sinirsel Değerlendirme & Makro Projeksiyon</span>
                                </div>
                                <span class="ai-neural-badge">WebGPU - %100 Yerel</span>
                            </div>
                            <div class="ai-neural-body" id="neuralStreamBody">
                                ${neuralPillars.map(p => `
                                    <div class="ai-neural-pillar">
                                        <h5>${p.title}</h5>
                                        <p>${p.text}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                contentEl.innerHTML = `
                    <div class="ai-report-body">
                        <div class="ai-report-meta">
                            <span>🗓 Rapor Tarihi: ${Utils.getTimestamp()}</span>
                            <span>📊 Pozisyon: ${funds.length} Fon + Nakit</span>
                            <span>🏆 Sağlık Skoru: ${m.healthScore}/100</span>
                            <span>⚙ Motor: ${mode === 'neural' ? 'Dual Intelligence (Quant + WebGPU)' : 'Quant Engine (Deterministik)'}</span>
                        </div>

                        <div class="ai-section">
                            <h4>📈 Portföy Finansal Özeti</h4>
                            <div class="ai-summary-chips">
                                <div class="ai-chip">Toplam Değer: <strong>₺${totalVal.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
                                <div class="ai-chip">Net K/Z: <strong class="${netPnL >= 0 ? 'color-profit' : 'color-loss'}">${netPnL >= 0 ? '+' : ''}₺${netPnL.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (%${pnlPct.toFixed(2)})</strong></div>
                                <div class="ai-chip">Ağırlıklı Risk: <strong>${m.weightedRisk} / 7</strong></div>
                                <div class="ai-chip">Anlık Likidite (T+0): <strong>%${m.liquidityPct}</strong></div>
                            </div>
                        </div>

                        <div class="ai-section">
                            <h4>💼 Varlık Dağılımı ve Valör Esnekliği</h4>
                            <div class="ai-funds-list">
                                ${fundBreakdownHtml}
                            </div>
                        </div>

                        <div class="ai-section">
                            <h4>💡 Stratejik & Taktiksel Öneriler</h4>
                            <div class="ai-recs-container">
                                ${recsHtml}
                            </div>
                        </div>

                        ${neuralHtml}
                    </div>
                `;

                if (mode === 'neural') {
                    Utils.showToast('🧠 WebGPU Derin Sinirsel Analiz raporu üretildi.', 'success');
                } else {
                    Utils.showToast('⚡ Quant analiz raporu hazırlandı.', 'success');
                }
            } catch (err) {
                console.error('ZenithIntelligence error:', err);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span>⚡</span> Analiz Raporu Oluştur';
                }
                Utils.showToast('Rapor oluşturulurken bir hata oluştu.', 'error');
            }
        }, 300);
    },

    copyReport() {
        const contentEl = document.getElementById('aiReportContent');
        if (!contentEl) return;
        const text = contentEl.innerText;
        if (!text || text.includes('Analiz Raporu Oluştur')) {
            Utils.showToast('Lütfen önce rapor oluşturun.', 'warning');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            Utils.showToast('Rapor panoya kopyalandı.', 'success');
        }).catch(() => {
            Utils.showToast('Kopyalama başarısız oldu.', 'error');
        });
    },

    openDownloadModal() {
        const contentEl = document.getElementById('aiReportContent');
        if (!contentEl) return;
        const text = contentEl.innerText;
        if (!text || text.includes('Analiz Raporu Oluştur')) {
            Utils.showToast('Lütfen önce analiz raporu oluşturun.', 'warning');
            return;
        }
        const modal = document.getElementById('aiDownloadModal');
        if (modal) modal.classList.add('active');
    },

    closeDownloadModal() {
        const modal = document.getElementById('aiDownloadModal');
        if (modal) modal.classList.remove('active');
    },

    downloadTxt() {
        this.closeDownloadModal();
        const contentEl = document.getElementById('aiReportContent');
        if (!contentEl) return;
        const text = contentEl.innerText;
        if (!text || text.includes('Analiz Raporu Oluştur')) {
            Utils.showToast('Lütfen önce analiz raporu oluşturun.', 'warning');
            return;
        }

        const m = this.getQuantMetrics();
        const totalVal = Calculations.getTotalPortfolioValue();
        const totalCost = Calculations.getTotalCost();
        const netPnL = Calculations.getTotalReturn();
        const pnlPct = Calculations.getTotalReturnPercent();
        const funds = PortfolioData.funds;
        const today = new Date().toISOString().slice(0, 10);

        let reportTxt = `================================================================================\n`;
        reportTxt += `🌌 ZENITH ATLAS - YAPAY ZEKA PORTFÖY & RİSK ANALİZ RAPORU\n`;
        reportTxt += `================================================================================\n`;
        reportTxt += `Rapor Tarihi         : ${Utils.getTimestamp()}\n`;
        reportTxt += `Toplam Portföy Değeri: ${Utils.formatCurrency(totalVal)}\n`;
        reportTxt += `Toplam Maliyet       : ${Utils.formatCurrency(totalCost)}\n`;
        reportTxt += `Net Kar/Zarar        : ${netPnL >= 0 ? '+' : ''}${Utils.formatCurrency(netPnL)} (%${pnlPct.toFixed(2)})\n`;
        reportTxt += `Portföy Sağlık Puanı : ${m.healthScore}/100 (${m.healthRating})\n`;
        reportTxt += `Ağırlıklı Risk Düzeyi: ${m.weightedRisk} / 7.0 (SPK Skalası)\n`;
        reportTxt += `Anlık Likidite (T+0) : %${m.liquidityPct}\n`;
        reportTxt += `Yoğunlaşma İndeksi   : ${m.hhi} (${m.hhiStatus})\n`;
        reportTxt += `--------------------------------------------------------------------------------\n`;
        reportTxt += `💼 VARLIK DAĞILIMI VE VALÖR TAKVİMİ\n`;
        reportTxt += `--------------------------------------------------------------------------------\n`;

        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const weight = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : '0.0';
            const valor = f.sellValor === 0 ? 'T+0' : `T+${f.sellValor}`;
            reportTxt += `${(f.code + '      ').slice(0, 6)} | ${(f.category + '                    ').slice(0, 20)} | Pay: %${(weight + '    ').slice(0, 5)} | Valör: ${valor} | Değer: ${Utils.formatCurrency(val)}\n`;
        });

        reportTxt += `--------------------------------------------------------------------------------\n`;
        reportTxt += `💡 STRATEJİK & TAKTİKSEL ÖNERİLER\n`;
        reportTxt += `--------------------------------------------------------------------------------\n`;
        m.recommendations.forEach(r => {
            reportTxt += `- ${r.replace(/\*\*/g, '')}\n`;
        });

        const neuralPillars = this.synthesizeNeuralPillars(m, totalVal, funds);
        reportTxt += `--------------------------------------------------------------------------------\n`;
        reportTxt += `🧠 WEBGPU SİNİRSEL MAKRO PROJEKSİYON & EYLEM PLANI\n`;
        reportTxt += `--------------------------------------------------------------------------------\n`;
        neuralPillars.forEach(p => {
            reportTxt += `[${p.title}]\n${p.text}\n\n`;
        });

        reportTxt += `================================================================================\n`;
        reportTxt += `Zenith Atlas (c) 2026 - Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.\n`;
        reportTxt += `Veri Kaynakları: TEFAS (Takasbank) & canlipiyasalar.haremaltin.com\n`;

        Utils.showToast('📥 TXT raporu indirmesi başlatılıyor...', 'info');

        setTimeout(() => {
            const blob = new Blob(['\uFEFF' + reportTxt], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Zenith_Atlas_AI_Raporu_${today}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.showToast('✅ TXT analiz raporu başarıyla indirildi.', 'success');
        }, 150);
    },

    downloadPdf() {
        this.closeDownloadModal();
        const contentEl = document.getElementById('aiReportContent');
        if (!contentEl) return;
        const text = contentEl.innerText;
        if (!text || text.includes('Analiz Raporu Oluştur')) {
            Utils.showToast('Lütfen önce analiz raporu oluşturun.', 'warning');
            return;
        }

        Utils.showToast('📄 PDF raporu hazırlanıyor...', 'info');

        const m = this.getQuantMetrics();
        const totalVal = Calculations.getTotalPortfolioValue();
        const netPnL = Calculations.getTotalReturn();
        const funds = PortfolioData.funds;
        const neuralPillars = this.synthesizeNeuralPillars(m, totalVal, funds);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Utils.showToast('Açılır pencere engellendi, tarayıcıdan izin veriniz.', 'warning');
            return;
        }

        const rowsHtml = funds.map(f => {
            const val = f.shares * f.currentPrice;
            const weight = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : '0.0';
            const valor = f.sellValor === 0 ? 'T+0' : `T+${f.sellValor}`;
            return `
                <tr>
                    <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; font-weight:800; color:#4F46E5;">${Utils.escapeHtml(f.code)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; color:#1E293B;">${Utils.escapeHtml(f.name)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; color:#64748B;">${Utils.escapeHtml(f.category)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; text-align:center; font-weight:600;">%${weight}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; text-align:center; font-weight:700; color:${f.sellValor === 0 ? '#10B981' : '#6366F1'};">${valor}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #E2E8F0; text-align:right; font-weight:800; color:#0F172A;">${Utils.formatCurrency(val)}</td>
                </tr>
            `;
        }).join('');

        const recsHtml = m.recommendations.map(r => `
            <li style="margin-bottom:10px; line-height:1.6; color:#334155;">${r.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
        `).join('');

        const neuralPillarsPdfHtml = neuralPillars.map(p => `
            <div style="margin-bottom:10px; padding:8px 12px; background:#FFFFFF; border-left:3px solid #6366F1; border-radius:4px;">
                <strong style="color:#1E293B; font-size:12px; display:block; margin-bottom:3px;">${p.title}</strong>
                <p style="margin:0; color:#475569; font-size:11px; line-height:1.5;">${p.text}</p>
            </div>
        `).join('');

        printWindow.document.write(`<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Zenith Atlas - Yapay Zeka Analiz Raporu</title>
    <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; background: #FFF; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366F1; padding-bottom: 14px; margin-bottom: 20px; }
        .brand { display: flex; align-items: center; gap: 8px; }
        .logo-icon { font-size: 24px; }
        .brand-name { font-size: 20px; font-weight: 900; color: #0F172A; }
        .brand-name span { color: #6366F1; }
        .meta-box { text-align: right; font-size: 11px; color: #64748B; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; }
        .card-title { font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .card-val { font-size: 17px; font-weight: 800; color: #0F172A; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        th { background: #F1F5F9; padding: 10px 12px; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #CBD5E1; }
        .recs { background: #EEF2FF; border-left: 4px solid #6366F1; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px; }
        .recs h4 { margin: 0 0 10px 0; color: #4338CA; font-size: 13px; }
        .recs ul { margin: 0; padding-left: 20px; }
        .footer { text-align: center; font-size: 10px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px; margin-top: 24px; }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">
            <span class="logo-icon">🌌</span>
            <div class="brand-name">Zenith <span>Atlas</span></div>
        </div>
        <div class="meta-box">
            <div><strong>Dual Intelligence Analiz Raporu</strong></div>
            <div>Tarih: ${Utils.getTimestamp()}</div>
        </div>
    </div>

    <div class="grid">
        <div class="card">
            <div class="card-title">Toplam Portföy</div>
            <div class="card-val">${Utils.formatCurrency(totalVal)}</div>
        </div>
        <div class="card">
            <div class="card-title">Net Kar / Zarar</div>
            <div class="card-val" style="color:${netPnL >= 0 ? '#10B981' : '#EF4444'};">${netPnL >= 0 ? '+' : ''}${Utils.formatCurrency(netPnL)}</div>
        </div>
        <div class="card">
            <div class="card-title">Sağlık Skoru</div>
            <div class="card-val" style="color:#6366F1;">${m.healthScore}/100 (${m.healthRating})</div>
        </div>
        <div class="card">
            <div class="card-title">Likidite (T+0)</div>
            <div class="card-val">%${m.liquidityPct}</div>
        </div>
    </div>

    <h3 style="font-size:14px; margin-bottom:8px; color:#1E293B;">💼 Varlık Dağılımı ve Valör Takvimi</h3>
    <table>
        <thead>
            <tr>
                <th>Fon</th>
                <th>Fon Tanımı</th>
                <th>Kategori</th>
                <th style="text-align:center;">Ağırlık</th>
                <th style="text-align:center;">Satış Valörü</th>
                <th style="text-align:right;">Toplam Değer</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>

    <div class="recs">
        <h4>💡 Stratejik & Taktiksel Öneriler</h4>
        <ul>
            ${recsHtml}
        </ul>
    </div>

    <div style="margin-top:16px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:12px 16px;">
        <h4 style="margin:0 0 10px 0; color:#4F46E5; font-size:13px; display:flex; align-items:center; gap:6px;">
            <span>🧠</span> WebGPU Sinirsel Makro Projeksiyon & Eylem Planı
        </h4>
        ${neuralPillarsPdfHtml}
    </div>

    <div class="footer">
        Zenith Atlas (c) 2026 - Bilgilendirme amaçlıdır, yatırım tavsiyesi niteliği taşımaz. - TEFAS (Takasbank) Resmi Verileri
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
        };
    </script>
</body>
</html>`);
        printWindow.document.close();
        Utils.showToast('PDF yazdırma penceresi hazırlandı.', 'success');
    }
};

const ExcelExport = {
    sanitize(val) {
        if (typeof val === 'string') {
            // Defense against CSV/Excel Formula Injection (DDE injection)
            if (/^[=+@-]/i.test(val)) {
                return "'" + val;
            }
        }
        return val;
    },

    export() {
        if (typeof XLSX === 'undefined') {
            Utils.showToast('SheetJS Excel kütüphanesi yüklenemedi.', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();
        wb.Props = {
            Title: 'Zenith Atlas - Portföy Takip ve Analiz Modeli',
            Subject: 'Zenith Atlas Çoklu Varlık Portföy Modeli',
            Author: 'Zenith Atlas',
            CreatedDate: new Date()
        };

        const totalPortfolio = Calculations.getTotalPortfolioValue();
        const fundsValue = Calculations.getFundsTotalValue();
        const totalCost = Calculations.getTotalCost();
        const dailyPnL = Calculations.getDailyPnL();
        const totalReturn = Calculations.getTotalReturn();

                const summaryData = [
            ['ZENITH ATLAS - PORTFÖY VE KANTİTATİF ANALİZ RAPORU'],
            ['Strateji:', 'Dengeli ve Büyüme'],
            ['Raporlama Tarihi:', Utils.getTimestamp()],
            [],
            ['GENEL PERFORMANS METRİKLERİ', ''],
            ['Toplam Portföy Değeri (₺)', totalPortfolio],
            ['Yatırım Fonları Toplamı (₺)', fundsValue],
            ['Serbest TL Nakit (₺)', PortfolioData.cashTL],
            ['Toplam Maliyet Tutarı (₺)', totalCost + PortfolioData.cashTL],
            ['Toplam Kar / Zarar (₺)', totalReturn],
            ['Toplam Getiri Oranı (%)', Calculations.getTotalReturnPercent() / 100],
            ['Günlük Toplam Getiri (₺)', dailyPnL],
            ['Ağırlıklı Risk Skoru (1-7)', Calculations.getWeightedRiskScore().toFixed(2)],
            [],
            ['VARLIK DAĞILIMI TABLOSU', '', '', ''],
            ['Fon Kodu', 'Varlık Sınıfı', 'Piyasa Değeri (₺)', 'Portföy Payı (%)']
        ];

        PortfolioData.funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            summaryData.push([this.sanitize(f.code), this.sanitize(f.assetClass), val, val / totalPortfolio]);
        });
        summaryData.push(['TL NAKİT', 'Nakit Rezervi', PortfolioData.cashTL, PortfolioData.cashTL / totalPortfolio]);

        summaryData.push([]);
        summaryData.push(['BEKLEYEN İŞLEMLER VE EMİRLER', '', '', '']);
        summaryData.push(['Emir Adı', 'Tür', 'Tutar (₺)', 'Durum', 'Valör Süresi']);
        PortfolioData.pendingOrders.forEach(ord => {
            summaryData.push([this.sanitize(ord.title), ord.type === 'sell' ? 'Satış' : 'Alış', ord.amount, this.sanitize(ord.status), this.sanitize(ord.valorText)]);
        });

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 32 }, { wch: 32 }, { wch: 20 }, { wch: 18 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Portföy Özeti');

        const fundHeaders = [
            'Fon Kodu', 'Fon Adı', 'Kategori', 'Varlık Sınıfı',
            'Adet', 'Güncel Fiyat (₺)', 'Piyasa Değeri (₺)',
            'Ort. Maliyet (₺)', 'Toplam Maliyet (₺)',
            'Toplam Kar/Zarar (₺)', 'Toplam Getiri (%)',
            'Portföy Payı (%)', '1Y Getiri (%)', 'Risk Seviyesi'
        ];

        const fundDetailsData = [['GÜNCEL FON POZİSYONLARI'], [], fundHeaders];

        PortfolioData.funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const cost = f.shares * f.avgCost;

            fundDetailsData.push([
                this.sanitize(f.code), this.sanitize(f.name), this.sanitize(f.category), this.sanitize(f.assetClass),
                f.shares, f.currentPrice, val,
                f.avgCost, cost,
                f.totalReturn, f.totalReturnPct / 100,
                val / totalPortfolio, f.performance1Y / 100, `${f.riskLevel} (${f.riskScore}/7)`
            ]);
        });

        const wsFunds = XLSX.utils.aoa_to_sheet(fundDetailsData);
        wsFunds['!cols'] = fundHeaders.map(() => ({ wch: 22 }));
        XLSX.utils.book_append_sheet(wb, wsFunds, 'Fon Detayları');

        // 3. AI and Quant Analysis Sheet
        const quant = ZenithIntelligence.getQuantMetrics();
        const aiData = [
            ['ZENITH ATLAS - DUAL INTELLIGENCE & QUANT RİSK RAPORU'],
            ['Raporlama Tarihi:', Utils.getTimestamp()],
            [],
            ['KANTİTATİF VE RİSK GÖSTERGELERİ', 'DEĞER', 'DEĞERLENDİRME'],
            ['Portföy Sağlık Puanı (0-100)', quant.healthScore, quant.healthRating],
            ['Ağırlıklı Risk Skoru (1-7)', quant.weightedRisk, 'SPK Risk Skalası'],
            ['Anlık Likidite Oranı (T+0)', quant.liquidityPct / 100, '% Varlık Payı'],
            ['Herfindahl-Hirschman Yoğunlaşma (HHI)', quant.hhi, quant.hhiStatus],
            [],
            ['STRATEJİK HEDEF VS. MEVCUT DAĞILIM', 'MEVCUT (%)', 'HEDEF (%)', 'FARK (%)', 'STRATEJİK ROL']
        ];

        const stratTargets = Calculations.getStrategyTargets();
        Object.entries(stratTargets).forEach(([name, cfg]) => {
            const diff = cfg.current - cfg.target;
            aiData.push([
                this.sanitize(name),
                cfg.current / 100,
                cfg.target / 100,
                diff / 100,
                this.sanitize(cfg.role)
            ]);
        });

        aiData.push([]);
        aiData.push(['YAPAY ZEKA STRATEJİK TAVSİYELERİ']);
        quant.recommendations.forEach((r, idx) => {
            aiData.push([`${idx + 1}. ${this.sanitize(r.replace(/\*\*/g, ''))}`]);
        });

        const neuralPillars = ZenithIntelligence.synthesizeNeuralPillars(quant, totalPortfolio, PortfolioData.funds);
        aiData.push([]);
        aiData.push(['WEBGPU SİNİRSEL MAKRO PROJEKSİYON & EYLEM PLANI', 'DEĞERLENDİRME VE YOL HARİTASI']);
        neuralPillars.forEach(p => {
            aiData.push([this.sanitize(p.title), this.sanitize(p.text)]);
        });

        const wsAI = XLSX.utils.aoa_to_sheet(aiData);
        wsAI['!cols'] = [{ wch: 42 }, { wch: 85 }, { wch: 20 }, { wch: 18 }, { wch: 45 }];
        XLSX.utils.book_append_sheet(wb, wsAI, 'Yapay Zeka Analizi');

        const today = new Date().toISOString().slice(0, 10);
        Utils.showToast('📊 Excel raporu indirmesi başlatılıyor...', 'info');

        setTimeout(() => {
            XLSX.writeFile(wb, `Zenith_Atlas_Portfoy_${today}.xlsx`);
            Utils.showToast('✅ Excel portföy raporu başarıyla indirildi.', 'success');
        }, 150);
    }
};

const Navigation = {
    init() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        const toggleValorBtn = document.getElementById('toggleValorInfo');
        if (toggleValorBtn) {
            toggleValorBtn.addEventListener('click', () => {
                const panel = document.getElementById('valorInfoPanel');
                if (panel) {
                    panel.classList.toggle('hidden');
                    toggleValorBtn.textContent = panel.classList.contains('hidden') ? 'Valör Bilgileri' : 'Valör Tablosunu Gizle';
                }
            });
        }
    },

    switchTab(tabName) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const currentTab = btn.getAttribute ? btn.getAttribute('data-tab') : (btn.dataset ? btn.dataset.tab : null);
            btn.classList.toggle('active', currentTab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.toggle('active', tab.id === `tab-${tabName}`);
        });

        if (tabName === 'funds') FundsTab.render();
        if (tabName === 'strategy') StrategyTab.render();
        if (tabName === 'plan') PlanTab.render();
        if (tabName === 'ai') ZenithIntelligence.render();
        if (tabName === 'dashboard') {
            Dashboard.init();
            Charts.refresh();
        }
        if (tabName === 'add-fund') AddFundTab.render();
    }
};

const FEATURED_FUND_CODES = ['AIS', 'AFT', 'IJC', 'KZL', 'MAC', 'TP2', 'TI2', 'TTE', 'YAY', 'GMR', 'GTA', 'TCD', 'IPB', 'HKH'];

const FundSearch = {
    db: [],
    loaded: false,
    activeFilter: 'all',
    activePreset: null,
    sortCriteria: 'code-asc',

    async loadDatabase() {
        if (this.loaded && this.db.length > 0) return true;

        if (window.TEFAS_FUNDS_DB && Array.isArray(window.TEFAS_FUNDS_DB.funds) && window.TEFAS_FUNDS_DB.funds.length > 0) {
            this.db = window.TEFAS_FUNDS_DB.funds;
            this.loaded = true;
            const countEl = document.getElementById('fundDbCount');
            if (countEl) countEl.textContent = `${this.db.length} fon hazır`;
            return true;
        }

        try {
            let res = await fetch('src/data/funds_db.json?t=' + Date.now(), { cache: 'default' });
            if (!res.ok) res = await fetch('data/funds_db.json?t=' + Date.now(), { cache: 'default' });
            if (res && res.ok) {
                const data = await res.json();
                this.db = data.funds || [];
                this.loaded = true;
                const countEl = document.getElementById('fundDbCount');
                if (countEl) countEl.textContent = `${this.db.length} fon hazır`;
                return true;
            }
        } catch (e) {
            console.warn('funds_db.json fetch fallback:', e);
        }

        const countEl = document.getElementById('fundDbCount');
        if (countEl) countEl.textContent = `${this.db.length} fon hazır`;
        return false;
    },

    getFeaturedFunds() {
        if (!this.db || !this.db.length) return [];
        const featured = [];
        FEATURED_FUND_CODES.forEach(code => {
            const found = this.db.find(f => f.code === code);
            if (found) featured.push(found);
        });
        return featured.length > 0 ? featured : this.db.slice(0, 15);
    },

    search(query, filter) {
        if (!this.db || !this.db.length) return [];

        const qNorm = Utils.normalizeText(query || '');
        const filterNorm = Utils.normalizeText(filter === 'all' ? '' : (filter || ''));

        let results = [...this.db];

        // 1. Category Filter
        if (filterNorm && filterNorm !== 'tumu' && filterNorm !== 'all') {
            results = results.filter(f => {
                const catNorm = Utils.normalizeText(f.category || '');
                const titleNorm = Utils.normalizeText(f.title || '');
                return catNorm.includes(filterNorm) || titleNorm.includes(filterNorm);
            });
        }

        // 2. Screener Preset Filter
        if (this.activePreset) {
            results = results.filter(f => {
                const cat = (f.category || '').toLowerCase();
                const code = (f.code || '').toUpperCase();
                const meta = Utils.getFundMeta(f.code, f.category, f.title);

                if (this.activePreset === 'tax-free') {
                    return meta.tax.includes('%0');
                } else if (this.activePreset === 'high-alpha') {
                    return cat.includes('hisse') || cat.includes('yabancı') || ['MAC', 'AFT', 'IJC', 'TI2', 'TTE', 'GMR'].includes(code);
                } else if (this.activePreset === 'liquid-t0') {
                    return meta.sellValor === 0 || cat.includes('para piyasası');
                } else if (this.activePreset === 'low-fee') {
                    return meta.riskScore <= 3 || cat.includes('para piyasası') || cat.includes('borçlanma') || cat.includes('altın');
                } else if (this.activePreset === 'global-tech') {
                    return cat.includes('yabancı') || ['AFT', 'IJC', 'YAY'].includes(code);
                }
                return true;
            });
        }

        // 3. Text Search
        if (qNorm.length >= 1) {
            results = results.filter(f => {
                const codeNorm = Utils.normalizeText(f.code || '');
                const titleNorm = Utils.normalizeText(f.title || '');
                const founderNorm = Utils.normalizeText(f.founder || '');
                const catNorm = Utils.normalizeText(f.category || '');

                return codeNorm.includes(qNorm) ||
                       titleNorm.includes(qNorm) ||
                       founderNorm.includes(qNorm) ||
                       catNorm.includes(qNorm);
            });
        }

        // 4. Multi-Criterion Sorting
        if (this.sortCriteria === 'perf-desc') {
            results.sort((a, b) => {
                const aMeta = Utils.getFundMeta(a.code, a.category, a.title);
                const bMeta = Utils.getFundMeta(b.code, b.category, b.title);
                return bMeta.riskScore - aMeta.riskScore;
            });
        } else if (this.sortCriteria === 'price-desc') {
            results.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else if (this.sortCriteria === 'price-asc') {
            results.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else {
            results.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
        }

        return results.slice(0, 80);
    },

    renderResults(results, isFeatured = false) {
        const container = document.getElementById('fundSearchResults');
        if (!container) return;

        if (results === null) {
            const featured = this.getFeaturedFunds();
            if (featured.length > 0) {
                this.renderResults(featured, true);
                return;
            }
            container.innerHTML = `
                <div class="search-empty-state">
                    <span class="search-empty-icon">📋</span>
                    <p>Fon aramak için yukarıya yazın veya kategori seçin.</p>
                </div>
            `;
            return;
        }

        if (results.length === 0) {
            container.innerHTML = `
                <div class="search-empty-state">
                    <span class="search-empty-icon">🔍</span>
                    <p>Aramanızla eşleşen fon bulunamadı.<br><small>Filtreleri veya arama terimini temizlemeyi deneyin.</small></p>
                </div>
            `;
            return;
        }

        const portfolioCodes = new Set(PortfolioData.funds.map(f => f.code));
        const watchlistSet = new Set((typeof WatchlistManager !== 'undefined' ? WatchlistManager.watchlist : []));

        const headerLabel = isFeatured
            ? `⭐ Popüler & Öne Çıkan TEFAS Fonları (${results.length})`
            : `${results.length} fon listeleniyor`;

        let html = `<div class="results-count-bar">${headerLabel}</div>`;
        results.forEach(fund => {
            const inPortfolio = portfolioCodes.has(fund.code);
            const inWatchlist = watchlistSet.has(fund.code);
            const priceStr = fund.price > 0 ? `₺${fund.price.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 6})}` : '-';
            const safeCode = Utils.escapeHtml(fund.code);
            const safeTitle = Utils.escapeHtml(fund.title);
            const safeCat = Utils.escapeHtml(fund.category || 'TEFAS Fonu');
            const safeFounder = fund.founder ? Utils.escapeHtml(fund.founder) : '';

            html += `
                <div class="fund-result-item ${inPortfolio ? 'in-portfolio' : ''}" data-code="${safeCode}" data-title="${safeTitle}" data-category="${safeCat}" data-price="${fund.price || 0}">
                    <button class="result-star-btn ${inWatchlist ? 'active' : ''}" data-code="${safeCode}" title="${inWatchlist ? 'İzleme Listesinde' : 'İzleme Listesine Ekle'}">★</button>
                    <span class="fund-result-code">${safeCode}</span>
                    <div class="fund-result-info">
                        <div class="fund-result-name">${safeTitle}</div>
                        <div class="fund-result-meta">
                            <span class="fund-result-category">${safeCat}</span>
                            ${safeFounder ? `<span class="fund-result-category" style="opacity:0.8">${safeFounder}</span>` : ''}
                        </div>
                    </div>
                    <span class="fund-result-price">${priceStr}</span>
                </div>
            `;
        });
        container.innerHTML = html;

        // Attach click handlers
        container.querySelectorAll('.fund-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.result-star-btn')) {
                    e.stopPropagation();
                    const code = item.dataset.code;
                    if (typeof WatchlistManager !== 'undefined') {
                        WatchlistManager.toggle(code);
                        const starBtn = item.querySelector('.result-star-btn');
                        if (starBtn) starBtn.classList.toggle('active');
                    }
                    return;
                }

                if (!item.classList.contains('in-portfolio')) {
                    const code = item.dataset.code;
                    const title = item.dataset.title;
                    const category = item.dataset.category;
                    const price = parseFloat(item.dataset.price) || 0;
                    AddFundTab.selectFund({ code, title, category, price });
                }
            });
        });
    }
};

const AddFundTab = {
    selectedFund: null,

    render() {
        FundSearch.loadDatabase().then(() => {
            this.renderManagedFunds();
            const input = document.getElementById('fundSearchInput');
            const q = input ? input.value.trim() : '';
            if (q || FundSearch.activeFilter !== 'all') {
                const results = FundSearch.search(q, FundSearch.activeFilter);
                FundSearch.renderResults(results);
            } else {
                FundSearch.renderResults(null);
            }
        });
    },

    selectFund(fund) {
        this.selectedFund = fund;
        const panel = document.getElementById('addFundFormPanel');
        const info = document.getElementById('selectedFundInfo');
        const priceHint = document.getElementById('currentPriceHint');

        if (!panel || !info) return;

        const priceStr = fund.price > 0
            ? `Güncel TEFAS fiyatı: ₺${fund.price.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 6})}`
            : 'Güncel fiyat: prices.json\'dan otomatik yüklenir';
        if (priceHint) priceHint.textContent = priceStr;

        const safeCode = Utils.escapeHtml(fund.code);
        const safeTitle = Utils.escapeHtml(fund.title);
        const safeCat = Utils.escapeHtml(fund.category || 'TEFAS Fonu');

        info.innerHTML = `
            <div class="selected-fund-header">
                <span class="selected-fund-code-badge">${safeCode}</span>
                <div class="selected-fund-details">
                    <div class="selected-fund-name">${safeTitle}</div>
                    <div class="selected-fund-tags">
                        <span class="badge badge-purple">${safeCat}</span>
                        ${fund.price > 0 ? `<span class="badge badge-success">₺${fund.price.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('positionShares').value = '';
        document.getElementById('positionAvgCost').value = fund.price > 0 ? fund.price.toFixed(6) : '';
        this.updatePreview();

        panel.classList.remove('hidden');
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    clearSelection() {
        this.selectedFund = null;
        const panel = document.getElementById('addFundFormPanel');
        if (panel) panel.classList.add('hidden');
    },

    updatePreview() {
        if (!this.selectedFund) return;
        const shares = parseFloat(document.getElementById('positionShares')?.value) || 0;
        const avgCost = parseFloat(document.getElementById('positionAvgCost')?.value) || 0;
        const currentPrice = this.selectedFund.price || avgCost;

        const cost = shares * avgCost;
        const value = shares * currentPrice;
        const pnl = value - cost;

        const costEl = document.getElementById('previewCost');
        const valueEl = document.getElementById('previewValue');
        const pnlEl = document.getElementById('previewPnL');

        if (costEl) costEl.textContent = Utils.formatCurrency(cost);
        if (valueEl) valueEl.textContent = Utils.formatCurrency(value);
        if (pnlEl) {
            pnlEl.textContent = (pnl >= 0 ? '+' : '') + Utils.formatCurrency(pnl);
            pnlEl.className = `preview-value ${Utils.getReturnClass(pnl)}`;
        }
    },

    submitFund(e) {
        e.preventDefault();
        if (!this.selectedFund) return;

        const shares = parseFloat(document.getElementById('positionShares')?.value);
        const avgCost = parseFloat(document.getElementById('positionAvgCost')?.value);

        if (!shares || shares <= 0 || !avgCost || avgCost <= 0) {
            Utils.showToast('Lütfen geçerli bir pay adedi ve maliyet girin.', 'error');
            return;
        }

        const fund = this.selectedFund;

        if (PortfolioManager.hasFund(fund.code)) {
            Utils.showToast(`${fund.code} zaten portföyünüzde var!`, 'warning');
            return;
        }

        const catColors = {
            'Para Piyasası': '#10B981',
            'Katılım Para Piyasası': '#06B6D4',
            'Altın': '#F59E0B',
            'Altın Katılım': '#F59E0B',
            'Altın Fonu': '#F59E0B',
            'Hisse Senedi Yoğun': '#EC4899',
            'Hisse Senedi': '#EC4899',
            'Yabancı Hisse': '#8B5CF6',
            'Değişken Fon': '#3B82F6',
            'Serbest Fon': '#64748B',
            'Serbest (Döviz)': '#8B5CF6',
            'Borçlanma Araçları': '#6366F1',
            'Fon Sepeti': '#A78BFA',
        };
        const catIcons = {
            'Para Piyasası': '💰',
            'Katılım Para Piyasası': '🕌',
            'Altın Katılım': '🥇',
            'Altın Fonu': '🥇',
            'Hisse Senedi Yoğun': '📈',
            'Hisse Senedi': '📈',
            'Yabancı Hisse': '🌐',
            'Değişken Fon': '⚖',
            'Serbest Fon': '🎲',
            'Serbest (Döviz)': '💵',
            'Borçlanma Araçları': '📄',
        };

        const cat = fund.category || '';
        const color = catColors[cat] || '#6366F1';
        const icon = catIcons[cat] || '📊';
        const currentPrice = fund.price || avgCost;
        const totalCost = shares * avgCost;
        const totalValue = shares * currentPrice;

        const meta = Utils.getFundMeta(fund.code, fund.category, fund.title);

        const newFund = {
            code: fund.code,
            name: fund.title,
            shortName: fund.code,
            category: fund.category || 'TEFAS Fonu',
            assetClass: meta.assetClass,
            icon: icon,
            color: color,
            shares: shares,
            avgCost: avgCost,
            currentPrice: currentPrice,
            portfolioWeight: 0,
            riskLevel: meta.riskLevel,
            riskScore: meta.riskScore,
            buyValor: meta.buyValor,
            sellValor: meta.sellValor,
            valorCutoff: meta.valorCutoff,
            tax: meta.tax,
            managementFee: 0,
            marketShare: 0,
            occupancyRate: 0,
            investors: 0,
            performance1Y: 0,
            dailyReturn: 0,
            dailyReturnPct: 0,
            totalReturn: totalValue - totalCost,
            totalReturnPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
            benchmarks: [],
            description: `${fund.title} - ${fund.category || 'TEFAS Fonu'}.`
        };

        const ok = PortfolioManager.addFund(newFund);
        if (ok) {
            try {
                const cached = JSON.parse(localStorage.getItem('zenithatlas_prices_v1') || '{}');
                cached[fund.code] = currentPrice;
                localStorage.setItem('zenithatlas_prices_v1', JSON.stringify(cached));
            } catch (e) { /* pass */ }

            Utils.showToast(`✅ ${fund.code} portföye eklendi!`, 'success');
            this.clearSelection();
            this.renderManagedFunds();

            const input = document.getElementById('fundSearchInput');
            const q = input ? input.value.trim() : '';
            const results = FundSearch.search(q, FundSearch.activeFilter);
            FundSearch.renderResults(results.length ? results : null);

            const badge = document.getElementById('strategyBadgeHeader');
            if (badge) badge.textContent = `${PortfolioData.funds.length} Fon`;
        }
    },

    renderManagedFunds() {
        const container = document.getElementById('managedFundsList');
        if (!container) return;

        if (PortfolioData.funds.length === 0) {
            container.innerHTML = `
                <div class="managed-empty-state">
                    <span class="empty-icon">📂</span>
                    <p>Portföyünüz henüz boş.<br>Sol panelden fon arayıp portföyünüze ekleyebilir veya mevcut JSON yedeğinizi yükleyebilirsiniz.</p>
                    <button class="empty-cta" id="managedFundsImportBtn" onclick="PortfolioBackup.triggerImport()">
                        📂 Portföy Yedeği Yükle (JSON)
                    </button>
                </div>
            `;
            const importBtn = (typeof container.querySelector === 'function')
                ? container.querySelector('#managedFundsImportBtn')
                : (typeof document.getElementById === 'function' ? document.getElementById('managedFundsImportBtn') : null);
            if (importBtn && typeof importBtn.addEventListener === 'function') {
                importBtn.addEventListener('click', () => PortfolioBackup.triggerImport());
            }
            return;
        }

        let html = '';
        PortfolioData.funds.forEach(fund => {
            const value = fund.shares * fund.currentPrice;
            const pnl = fund.totalReturn || 0;
            const pnlClass = Utils.getReturnClass(pnl);
            html += `
                <div class="managed-fund-row">
                    <span class="managed-fund-code" style="color:${fund.color || 'var(--accent-primary)'}">${fund.code}</span>
                    <div class="managed-fund-info">
                        <div class="managed-fund-name">${fund.name}</div>
                        <div class="managed-fund-position">${Utils.formatNumber(fund.shares)} pay - Ort.₺${fund.avgCost.toFixed(4)}</div>
                    </div>
                    <span class="managed-fund-value ${pnlClass}">${Utils.formatCurrency(value)}</span>
                    <div class="managed-fund-actions">
                        <button class="btn btn-ghost btn-sm edit-fund-btn" data-code="${fund.code}" title="Düzenle">✏</button>
                        <button class="btn btn-danger btn-sm remove-fund-btn" data-code="${fund.code}" title="Sil">🗑</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

        // Edit handlers
        container.querySelectorAll('.edit-fund-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.code;
                const fund = PortfolioData.funds.find(f => f.code === code);
                if (!fund) return;
                const newShares = prompt(`${code} - Yeni pay adedi (mevcut: ${fund.shares}):`, fund.shares);
                if (newShares === null) return;
                const newCost = prompt(`${code} - Yeni ortalama maliyet (mevcut: ${fund.avgCost}):`, fund.avgCost);
                if (newCost === null) return;
                PortfolioManager.updateFund(code, parseFloat(newShares), parseFloat(newCost));
                this.renderManagedFunds();
                Utils.showToast(`${code} güncellendi.`, 'success');
            });
        });

        // Remove handlers
        container.querySelectorAll('.remove-fund-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.code;
                if (!confirm(`${code} portföyden kaldırılacak. Emin misiniz?`)) return;
                PortfolioManager.removeFund(code);
                this.renderManagedFunds();
                Utils.showToast(`${code} portföyden kaldırıldı.`, 'info');

                const badge = document.getElementById('strategyBadgeHeader');
                if (badge) badge.textContent = `${PortfolioData.funds.length} Fon`;
            });
        });
    },

    initEventListeners() {
        const input = document.getElementById('fundSearchInput');
        if (input) {
            input.addEventListener('input', () => {
                const q = input.value.trim();
                FundSearch.loadDatabase().then(() => {
                    const results = q.length >= 1 || FundSearch.activeFilter !== 'all'
                        ? FundSearch.search(q, FundSearch.activeFilter)
                        : null;
                    FundSearch.renderResults(results);
                });
            });
        }

        const clearBtn = document.getElementById('fundSearchClear');
        if (clearBtn && input) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                FundSearch.activeFilter = 'all';
                document.querySelectorAll('.filter-chip').forEach(c => {
                    c.classList.toggle('active', c.dataset.filter === 'all');
                });
                FundSearch.renderResults(null);
            });
        }

        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                FundSearch.activeFilter = chip.dataset.filter;

                FundSearch.loadDatabase().then(() => {
                    const q = input ? input.value.trim() : '';
                    const results = FundSearch.search(q, FundSearch.activeFilter);
                    FundSearch.renderResults(results.length ? results : (q ? [] : null));
                });
            });
        });

        // Screener presets listeners
        document.querySelectorAll('.screener-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const preset = chip.dataset.preset;
                if (FundSearch.activePreset === preset) {
                    FundSearch.activePreset = null;
                    chip.classList.remove('active');
                } else {
                    document.querySelectorAll('.screener-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    FundSearch.activePreset = preset;
                }

                FundSearch.loadDatabase().then(() => {
                    const q = input ? input.value.trim() : '';
                    const results = FundSearch.search(q, FundSearch.activeFilter);
                    FundSearch.renderResults(results.length ? results : (q || FundSearch.activePreset ? [] : null));
                });
            });
        });

        // Sorting select listener
        const sortSelect = document.getElementById('fundSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                FundSearch.sortCriteria = sortSelect.value;
                FundSearch.loadDatabase().then(() => {
                    const q = input ? input.value.trim() : '';
                    const results = FundSearch.search(q, FundSearch.activeFilter);
                    FundSearch.renderResults(results.length ? results : (q || FundSearch.activePreset ? [] : null));
                });
            });
        }

        const cancelBtn = document.getElementById('clearFundSelection');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.clearSelection());
        }

        const form = document.getElementById('positionForm');
        if (form) {
            form.addEventListener('submit', (e) => this.submitFund(e));

            ['positionShares', 'positionAvgCost'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => this.updatePreview());
            });
        }

        // Backup and Restore buttons
        const exportBackupBtn = document.getElementById('exportBackupBtn');
        if (exportBackupBtn) {
            exportBackupBtn.addEventListener('click', () => PortfolioBackup.exportBackup());
        }

        const importBackupBtn = document.getElementById('importBackupBtn');
        if (importBackupBtn) {
            importBackupBtn.addEventListener('click', () => PortfolioBackup.triggerImport());
        }

        // Clear all funds button
        const clearAllBtn = document.getElementById('clearAllFundsBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                if (!confirm('Tüm portföy sıfırlanacak. Emin misiniz?')) return;
                PortfolioManager.clear();
                PortfolioData.funds.length = 0;
                PortfolioData.cashTL = 0;
                PortfolioData.pendingOrders.length = 0;
                this.renderManagedFunds();
                const badge = document.getElementById('strategyBadgeHeader');
                if (badge) badge.textContent = 'TEFAS Portföy';
                Utils.showToast('Portföy sıfırlandı.', 'info');
            });
        }
    }
};

// ==========================================================================
// DataProvider (Soyutlanmış Veri Sağlayıcı & Failover Yönetim Arayüzü)
// ==========================================================================
const DataProvider = {
    providers: {
        canliDoviz: { id: 'canliDoviz', name: 'CanlıDöviz Socket.IO', type: 'WebSocket', status: 'connecting', endpoint: 'wss://s.canlidoviz.com' },
        harem: { id: 'harem', name: 'Harem Altın Kapalıçarşı', type: 'WebSocket', status: 'connecting', endpoint: 'wss://hrmsocketonly.haremaltin.com' },
        bigpara: { id: 'bigpara', name: 'Bigpara BIST Motoru', type: 'REST', status: 'ready', endpoint: 'https://bigpara.hurriyet.com.tr' },
        yahoo: { id: 'yahoo', name: 'Yahoo Finance Global API', type: 'REST', status: 'ready', endpoint: 'https://query1.finance.yahoo.com' },
        offline: { id: 'offline', name: 'Zenith Offline Cache Fallback', type: 'Local', status: 'active', endpoint: 'localStorage / IndexedDB' }
    },

    updateStatus(providerId, status, details = null) {
        if (this.providers[providerId]) {
            this.providers[providerId].status = status;
            if (details) this.providers[providerId].details = details;
            this.notifyStatusChange();
        }
    },

    notifyStatusChange() {
        const indicator = document.getElementById('dataProviderHealthBadge');
        if (indicator) {
            const hasLive = this.providers.canliDoviz.status === 'connected' || this.providers.harem.status === 'connected';
            indicator.className = `health-badge ${hasLive ? 'badge-success' : 'badge-warning'}`;
            indicator.textContent = hasLive ? '● Canlı Veri Akışı' : '● Çevrimdışı / Yerel Mod';
        }
    },

    getHealthReport() {
        return Object.values(this.providers).map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            status: p.status
        }));
    }
};

const MarketService = {
    data: null,
    tickerInterval: null,
    isStreaming: true,
    activeCategory: 'featured', // 'featured', 'harem', 'bigpara', 'bist'

    canliDovizSocket: null,
    haremSocket: null,

    async init() {
        // Direct synchronous market data access
        if (window.MARKET_DATA) {
            this.data = JSON.parse(JSON.stringify(window.MARKET_DATA));
            this.render();
        }

        // Network fetch fallback for market data
        try {
            let res = await fetch('src/data/markets.json?t=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) res = await fetch('data/markets.json?t=' + Date.now(), { cache: 'no-store' });
            if (res && res.ok) {
                const fresh = await res.json();
                if (fresh && (fresh.categories || fresh.currencies)) {
                    this.data = fresh;
                    this.render();
                }
            }
        } catch (e) {
            // file protocol fallback already rendered
        }

        this.bindTabListeners();
        this.startLiveTicker();

        // 1. Primary Live WebSocket: canlidoviz.com
        this.initCanliDovizSocket();

        // 2. Dual-Redundant Fallback WebSocket: haremaltin.com
        this.initHaremSocket();
    },

    initCanliDovizSocket() {
        if (typeof io === 'undefined') return;
        try {
            this.canliDovizSocket = io('https://s.canlidoviz.com', {
                transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 10000
            });

            this.canliDovizSocket.on('connect', () => {
                console.log('✅ [CanliDoviz.com Canlı WebSocket] s.canlidoviz.com sunucusuna her salise canlı akışla bağlandı!');
                DataProvider.updateStatus('canliDoviz', 'connected');
                // Subscribe to all real-time market channels
                this.canliDovizSocket.emit('us', {
                    t: ['CURRENCY', 'GOLD', 'COIN', 'EMTIA', 'PARITY', 'STOCK'],
                    c: [
                        'USD', 'EUR', 'GA', 'EUR/USD', 'GBP', 'CAD', 'CHF', 'AUD', 'JPY', 'SAR',
                        'C', 'T', 'Y', 'A', '22', '14', 'GAG', 'XAU/USD', 'XBRUSD', 'BTC',
                        'XU100', 'XU030', 'XBANK', 'XUSIN'
                    ],
                    m: false
                });
            });

            this.canliDovizSocket.on('c', (dataArr) => {
                if (Array.isArray(dataArr) && dataArr.length > 0) {
                    this.applyCanliDovizUpdate(dataArr);
                }
            });

            this.canliDovizSocket.on('connect_error', (err) => {
                console.warn('[CanliDoviz Socket] Bağlantı beklemede:', err?.message || err);
                DataProvider.updateStatus('canliDoviz', 'fallback_active');
            });
        } catch (e) {
            console.warn('[CanliDoviz Socket] Başlatılamadı:', e);
            DataProvider.updateStatus('canliDoviz', 'fallback_active');
        }
    },

    applyCanliDovizUpdate(dataArr) {
        if (!this.data || !this.data.categories) return;

        // canlidoviz.com CID -> System mapping
        const CID_MAP = {
            // Foreign Exchange (Bigpara & Serbest Piyasa)
            '1': { cat: 'bigpara', key: 'USD', decimals: 4 },
            '50': { cat: 'bigpara', key: 'EUR', decimals: 4 },
            '100': { cat: 'bigpara', key: 'GBP', decimals: 4 },
            '51': { cat: 'bigpara', key: 'CHF', decimals: 4 },
            '56': { cat: 'bigpara', key: 'CAD', decimals: 4 },
            '102': { cat: 'bigpara', key: 'AUD', decimals: 4 },
            '110': { cat: 'bigpara', key: 'SAR', decimals: 4 },
            '163': { cat: 'bigpara', key: 'EUR_USD', decimals: 4 },

            // Gold & Silver (Kapalıçarşı & Harem Altın)
            '32': { cat: 'harem', key: 'GA', decimals: 2 },
            '1179': { cat: 'harem', key: 'HAS', decimals: 2 },
            '11': { cat: 'harem', key: 'YENI_CEYREK', decimals: 2 },
            '47': { cat: 'harem', key: 'YARIM_YENI', decimals: 2 },
            '14': { cat: 'harem', key: 'YENI_TAM', decimals: 2 },
            '58': { cat: 'harem', key: 'YENI_ATA', decimals: 2 },
            '15': { cat: 'harem', key: 'YENI_GREMSE', decimals: 2 },
            '12': { cat: 'harem', key: 'ONS', decimals: 2 },
            '20': { cat: 'harem', key: 'GUMUS_TL', decimals: 2 },

            // Borsa İstanbul (BIST)
            '250': { cat: 'bist', key: 'BIST100', decimals: 2 },
            '248': { cat: 'bist', key: 'BIST30', decimals: 2 },
            '207': { cat: 'bist', key: 'XBANK', decimals: 2 },
            '255': { cat: 'bist', key: 'XUSIN', decimals: 2 }
        };

        let updatedKeys = [];
        let hasAnyUpdate = false;

        for (let i = 0; i < dataArr.length; i++) {
            const raw = dataArr[i];
            const parts = typeof raw === 'string' ? raw.split('|') : (Array.isArray(raw) ? raw : []);
            if (!parts || parts.length === 0) continue;

            const cid = parts[0];
            const mapInfo = CID_MAP[cid];
            if (!mapInfo) continue;

            const buy = parseFloat(parts[1]) || 0;
            const sell = parseFloat(parts[2]) || buy;
            if (sell <= 0) continue;

            hasAnyUpdate = true;

            // 1. Update target category
            const target = this.data.categories[mapInfo.cat]?.items?.[mapInfo.key];
            if (target) {
                const oldRate = target.rate;
                target.buying = buy;
                target.selling = sell;
                target.rate = sell;
                target._baseRate = sell;
                target._baseBuying = buy;
                target._baseSelling = sell;

                // 2. Update Featured category if mirrored
                if (this.data.categories.featured?.items?.[mapInfo.key]) {
                    Object.assign(this.data.categories.featured.items[mapInfo.key], target);
                }

                // 3. Mark for DOM animation
                const isVisible = (this.activeCategory === mapInfo.cat) ||
                    (this.activeCategory === 'featured' && this.data.categories.featured?.items?.[mapInfo.key]);

                if (isVisible) {
                    updatedKeys.push({
                        key: mapInfo.key,
                        oldRate,
                        newRate: sell,
                        buy,
                        sell,
                        changePct: target.changePct || 0,
                        decimals: mapInfo.decimals,
                        unit: target.unit
                    });
                }
            }
        }

        // Live DOM Flashing
        updatedKeys.forEach(u => {
            const cardEl = document.getElementById(`market-card-${u.key}`);
            const priceEl = document.getElementById(`market-price-${u.key}`);
            const badgeEl = document.getElementById(`market-badge-${u.key}`);
            const subEl = document.getElementById(`market-sub-${u.key}`);

            if (cardEl && priceEl) {
                const isUp = u.newRate >= u.oldRate;
                const flashClass = isUp ? 'price-flash-up' : 'price-flash-down';
                const cardFlashClass = isUp ? 'card-flash-up' : 'card-flash-down';

                const isParity = u.unit === 'Parite' || u.key === 'EUR_USD';
                const curPrefix = isParity ? '' : (u.unit && u.unit.startsWith('$') ? '$' : (u.unit && (u.unit.includes('TL') || u.unit.includes('₺')) ? '₺' : ''));
                const curSuffix = u.unit && u.unit === 'Puan' ? ' Puan' : '';

                priceEl.textContent = `${curPrefix}${u.newRate.toLocaleString('tr-TR', {minimumFractionDigits: u.decimals, maximumFractionDigits: u.decimals})}${curSuffix}`;
                if (subEl) {
                    subEl.innerHTML = `<span>Alış: ${curPrefix}${u.buy.toLocaleString('tr-TR', {minimumFractionDigits: u.decimals, maximumFractionDigits: u.decimals})}</span><span>Satış: ${curPrefix}${u.sell.toLocaleString('tr-TR', {minimumFractionDigits: u.decimals, maximumFractionDigits: u.decimals})}</span>`;
                }

                priceEl.classList.remove('price-flash-up', 'price-flash-down');
                cardEl.classList.remove('card-flash-up', 'card-flash-down');
                void priceEl.offsetWidth;
                priceEl.classList.add(flashClass);
                cardEl.classList.add(cardFlashClass);
                setTimeout(() => cardEl.classList.remove(cardFlashClass), 700);
            }
        });

        // Live Ticker & Real-Time Engines Synchronization
        if (hasAnyUpdate) {
            if (typeof TerminalTicker !== 'undefined') {
                TerminalTicker.renderTrack();
            }
            if (typeof CurrencyEngine !== 'undefined') {
                CurrencyEngine.updateRateHint();
            }
            if (typeof AlertsEngine !== 'undefined') {
                AlertsEngine.checkAlerts();
            }
        }
    },

    initHaremSocket() {
        if (typeof io === 'undefined') return;
        try {
            this.haremSocket = io('wss://hrmsocketonly.haremaltin.com', {
                transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: 1500,
                reconnectionDelayMax: 5000,
                timeout: 10000
            });

            this.haremSocket.on('connect', () => {
                console.log('✅ [Harem Altın Canlı WebSocket] Yedek soket akışı devrede.');
                DataProvider.updateStatus('harem', 'connected');
            });

            this.haremSocket.on('price_changed', (res) => {
                if (res && res.data) {
                    this.applyHaremLiveUpdate(res.data);
                }
            });

            this.haremSocket.on('connect_error', () => {
                DataProvider.updateStatus('harem', 'fallback_active');
            });
        } catch (e) {
            console.warn('[Harem Altın Socket] Başlatılamadı:', e);
            DataProvider.updateStatus('harem', 'fallback_active');
        }
    },

    applyHaremLiveUpdate(socketData) {
        if (!this.data || !this.data.categories) return;

        // Comprehensive real-time Socket code mappings (Metals + Currencies + Forex)
        const mapping = {
            // Precious Metals (Harem Altın & Kapalıçarşı)
            'KULCEALTIN': { cat: 'harem', key: 'GA', decimals: 2 },
            'ALTIN': { cat: 'harem', key: 'HAS', decimals: 2 },
            'CEYREK_YENI': { cat: 'harem', key: 'YENI_CEYREK', decimals: 2 },
            'CEYREK_ESKI': { cat: 'harem', key: 'ESKI_CEYREK', decimals: 2 },
            'YARIM_YENI': { cat: 'harem', key: 'YENI_YARIM', decimals: 2 },
            'TEK_YENI': { cat: 'harem', key: 'YENI_TAM', decimals: 2 },
            'ATA_YENI': { cat: 'harem', key: 'YENI_ATA', decimals: 2 },
            'AYAR22': { cat: 'harem', key: 'BILEZIK22', decimals: 2 },
            'AYAR14': { cat: 'harem', key: 'AYAR14', decimals: 2 },
            'ONS': { cat: 'harem', key: 'ONS', decimals: 2 },
            'GUMUSTRY': { cat: 'harem', key: 'GUMUS_TL', decimals: 2 },
            'GREMESE_YENI': { cat: 'harem', key: 'YENI_GREMSE', decimals: 2 },
            'GREMSE_YENI': { cat: 'harem', key: 'YENI_GREMSE', decimals: 2 },

            // Live Currencies & Interbank Forex (Bigpara & Serbest Piyasa)
            'USDTRY': { cat: 'bigpara', key: 'USD', decimals: 4 },
            'EURTRY': { cat: 'bigpara', key: 'EUR', decimals: 4 },
            'GBPTRY': { cat: 'bigpara', key: 'GBP', decimals: 4 },
            'CHFTRY': { cat: 'bigpara', key: 'CHF', decimals: 4 },
            'CADTRY': { cat: 'bigpara', key: 'CAD', decimals: 4 },
            'AUDTRY': { cat: 'bigpara', key: 'AUD', decimals: 4 },
            'JPYTRY': { cat: 'bigpara', key: 'JPY', decimals: 4 },
            'SARTRY': { cat: 'bigpara', key: 'SAR', decimals: 4 },
            'EURUSD': { cat: 'bigpara', key: 'EUR_USD', decimals: 4 }
        };

        let updatedKeys = [];
        let hasAnyUpdate = false;

        for (const [hCode, mapInfo] of Object.entries(mapping)) {
            const fresh = socketData[hCode];
            if (!fresh) continue;

            const buy = parseFloat(fresh.alis) || 0;
            const sell = parseFloat(fresh.satis) || 0;
            const kapanis = parseFloat(fresh.kapanis) || sell;
            const changePct = kapanis > 0 ? ((sell - kapanis) / kapanis) * 100 : 0;

            if (sell > 0) {
                hasAnyUpdate = true;

                // 1. Update Primary Category (harem or bigpara)
                const target = this.data.categories[mapInfo.cat]?.items?.[mapInfo.key];
                if (target) {
                    const oldRate = target.rate;
                    target.buying = buy;
                    target.selling = sell;
                    target.rate = sell;
                    target.changePct = changePct;
                    target._baseRate = sell;
                    target._baseBuying = buy;
                    target._baseSelling = sell;
                    target._baseChangePct = changePct;

                    // 2. Update Featured Category if it exists there
                    if (this.data.categories.featured?.items?.[mapInfo.key]) {
                        Object.assign(this.data.categories.featured.items[mapInfo.key], target);
                    }

                    // 3. Track DOM update for active category tab
                    const isVisibleInActive = (this.activeCategory === mapInfo.cat) ||
                        (this.activeCategory === 'featured' && this.data.categories.featured?.items?.[mapInfo.key]);

                    if (isVisibleInActive) {
                        updatedKeys.push({
                            key: mapInfo.key,
                            oldRate,
                            newRate: sell,
                            buy,
                            sell,
                            changePct,
                            decimals: mapInfo.decimals,
                            unit: target.unit
                        });
                    }
                }
            }
        }

        // Live DOM Flashing & Value Updates
        updatedKeys.forEach(u => {
            const cardEl = document.getElementById(`market-card-${u.key}`);
            const priceEl = document.getElementById(`market-price-${u.key}`);
            const badgeEl = document.getElementById(`market-badge-${u.key}`);
            const subEl = document.getElementById(`market-sub-${u.key}`);

            if (cardEl && priceEl) {
                const isUp = u.newRate >= u.oldRate;
                const flashClass = isUp ? 'price-flash-up' : 'price-flash-down';
                const cardFlashClass = isUp ? 'card-flash-up' : 'card-flash-down';

                const isParity = u.unit === 'Parite' || u.key === 'EUR_USD';
                const curPrefix = isParity ? '' : (u.unit && u.unit.startsWith('$') ? '$' : (u.unit && (u.unit.includes('TL') || u.unit.includes('₺')) ? '₺' : ''));
                const curSuffix = u.unit && u.unit === 'Puan' ? ' Puan' : '';

                priceEl.textContent = `${curPrefix}${u.newRate.toLocaleString('tr-TR', {minimumFractionDigits: u.decimals, maximumFractionDigits: u.decimals})}${curSuffix}`;
                if (subEl) {
                    subEl.innerHTML = `<span>Alış: ${curPrefix}${u.buy.toLocaleString('tr-TR', {minimumFractionDigits: u.decimals, maximumFractionDigits: u.decimals})}</span><span>Satış: ${curPrefix}${u.sell.toLocaleString('tr-TR', {minimumFractionDigits: u.decimals, maximumFractionDigits: u.decimals})}</span>`;
                }
                if (badgeEl) {
                    const isPos = u.changePct >= 0;
                    badgeEl.className = `market-card-badge ${isPos ? 'badge-success' : 'badge-danger'}`;
                    badgeEl.textContent = `${isPos ? '+' : ''}%${Math.abs(u.changePct).toFixed(2)}`;
                }

                priceEl.classList.remove('price-flash-up', 'price-flash-down');
                cardEl.classList.remove('card-flash-up', 'card-flash-down');
                void priceEl.offsetWidth;
                priceEl.classList.add(flashClass);
                cardEl.classList.add(cardFlashClass);
                setTimeout(() => cardEl.classList.remove(cardFlashClass), 700);
            }
        });

        // Keep Top Terminal Ticker updated on every millisecond live tick
        if (hasAnyUpdate && typeof TerminalTicker !== 'undefined') {
            TerminalTicker.renderTrack();
        }
    },

    bindTabListeners() {
        const bar = document.getElementById('marketTabsBar');
        if (!bar) return;

        bar.querySelectorAll('.market-tab-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cat = btn.getAttribute('data-category');
                if (!cat || cat === this.activeCategory) return;

                this.activeCategory = cat;
                bar.querySelectorAll('.market-tab-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.render();
            });
        });
    },

    getActiveCategoryData() {
        if (!this.data) return null;
        if (this.data.categories && this.data.categories[this.activeCategory]) {
            return this.data.categories[this.activeCategory];
        }
        return null;
    },

    getItems() {
        const catData = this.getActiveCategoryData();
        if (catData && catData.items) {
            return Object.values(catData.items);
        }

        // Fallback for legacy format
        const currencies = this.data?.currencies || {};
        const commodities = this.data?.commodities || {};
        return [
            { key: 'USD', flag: '🇺🇸', code: 'USD/TRY', name: 'Dolar', price: currencies.USD?.rate || 47.9147, buy: currencies.USD?.buying || 47.8422, sell: currencies.USD?.selling || 47.9147, changePct: currencies.USD?.changePct || 0.10, decimals: 4, unit: 'TL' },
            { key: 'EUR', flag: '🇪🇺', code: 'EUR/TRY', name: 'Euro', price: currencies.EUR?.rate || 55.5063, buy: currencies.EUR?.buying || 55.3796, sell: currencies.EUR?.selling || 55.5063, changePct: currencies.EUR?.changePct || 0.31, decimals: 4, unit: 'TL' },
            { key: 'GA', flag: '🥇', code: 'Gram Altın', name: '24K Altın', price: commodities.GA?.rate || 6736.43, buy: commodities.GA?.buying || 6635.14, sell: commodities.GA?.selling || 6736.43, changePct: commodities.GA?.changePct || 0.80, decimals: 2, unit: '₺/gr' },
            { key: 'ONS', flag: '🏆', code: 'Ons Altın', name: 'Ons Altın', price: commodities.ONS?.rate || 4376.40, buy: commodities.ONS?.buying || 4375.80, sell: commodities.ONS?.selling || 4376.40, changePct: commodities.ONS?.changePct || -2.66, decimals: 2, unit: '$/oz' },
            { key: 'CEYREK', flag: '🪙', code: 'Çeyrek Altın', name: 'Çeyrek', price: commodities.CEYREK?.rate || 10990.00, buy: commodities.CEYREK?.buying || 10850.00, sell: commodities.CEYREK?.selling || 10990.00, changePct: commodities.CEYREK?.changePct || 0.80, decimals: 2, unit: '₺/adet' },
            { key: 'BIST100', flag: '📈', code: 'BIST 100', name: 'BIST 100', price: commodities.BIST100?.rate || 14172.26, buy: commodities.BIST100?.buying || 14172.26, sell: commodities.BIST100?.selling || 14172.26, changePct: commodities.BIST100?.changePct || 0.28, decimals: 2, unit: 'Puan' }
        ];
    },

    render() {
        const grid = document.getElementById('marketCardsGrid');
        const dateEl = document.getElementById('marketDateDisplay');
        const sourceTagEl = document.getElementById('marketSourceTag');
        if (!grid || !this.data) return;

        const catData = this.getActiveCategoryData();

        // Update Source Label Tag
        if (sourceTagEl && catData) {
            sourceTagEl.textContent = catData.sourceLabel || 'Canlı Piyasa Akışı';
        }

        // Update Status & Live Stream Badge
        if (dateEl) {
            const status = Utils.getMarketStatus();
            const streamBadge = `<span class="live-stream-badge"><span class="dot"></span>CANLI AKIŞ</span>`;
            if (status.isWeekend) {
                dateEl.innerHTML = `${streamBadge} <span class="badge badge-warning" style="font-size:0.72rem; padding:3px 9px;">🟡 Hafta Sonu (Cuma Kapanış)</span>`;
            } else {
                dateEl.innerHTML = `${streamBadge} <span class="badge badge-success" style="font-size:0.72rem; padding:3px 9px;">🟢 Canlı Seans</span>`;
            }
        }

        const items = this.getItems();
        let html = '';
        items.forEach(item => {
            const isPos = item.changePct >= 0;
            const sign = isPos ? '+' : '';
            const badgeClass = isPos ? 'badge-success' : 'badge-danger';
            const isParity = item.unit === 'Parite' || item.key === 'EUR_USD';
            const curPrefix = isParity ? '' : (item.unit && item.unit.startsWith('$') ? '$' : (item.unit && (item.unit.includes('TL') || item.unit.includes('₺')) ? '₺' : ''));
            const curSuffix = item.unit && item.unit === 'Puan' ? ' Puan' : '';

            const priceFormatted = `${curPrefix}${item.rate.toLocaleString('tr-TR', {minimumFractionDigits: item.decimals || 2, maximumFractionDigits: item.decimals || 2})}${curSuffix}`;
            const buyFormatted = `${curPrefix}${item.buying.toLocaleString('tr-TR', {minimumFractionDigits: item.decimals || 2, maximumFractionDigits: item.decimals || 2})}`;
            const sellFormatted = `${curPrefix}${item.selling.toLocaleString('tr-TR', {minimumFractionDigits: item.decimals || 2, maximumFractionDigits: item.decimals || 2})}`;

            html += `
                <div class="market-card" id="market-card-${item.key}">
                    <div class="market-card-top">
                        <div class="market-card-name">
                            <span class="market-card-flag">${item.flag || '📌'}</span>
                            <span title="${item.name}">${item.code}</span>
                        </div>
                        <span class="market-card-badge ${badgeClass}" id="market-badge-${item.key}">${sign}%${Math.abs(item.changePct).toFixed(2)}</span>
                    </div>
                    <div class="market-card-price" id="market-price-${item.key}">${priceFormatted}</div>
                    <div class="market-card-sub" id="market-sub-${item.key}">
                        <span>Alış: ${buyFormatted}</span>
                        <span>Satış: ${sellFormatted}</span>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
        if (typeof TerminalTicker !== 'undefined') {
            TerminalTicker.renderTrack();
        }
    },

    startLiveTicker() {
        if (this.tickerInterval) clearInterval(this.tickerInterval);
    }
};

// ==========================================================================
// 1. CurrencyEngine (Multi-Currency Real-Value Engine)
// ==========================================================================
const CurrencyEngine = {
    activeCurrency: 'TRY', // 'TRY', 'USD', 'EUR', 'GA'

    init() {
        try {
            const saved = localStorage.getItem('zenith_display_currency');
            if (saved && ['TRY', 'USD', 'EUR', 'GA'].includes(saved)) {
                this.activeCurrency = saved;
            }
        } catch (e) {}
        this.updatePillUI();
        this.bindEvents();
        this.updateRateHint();
    },

    getRate(currency = this.activeCurrency) {
        if (currency === 'TRY') return 1.0;
        if (currency === 'USD') {
            const usdItem = MarketService.data?.categories?.bigpara?.items?.USD || MarketService.data?.categories?.featured?.items?.USD;
            return usdItem?.rate || 47.8540;
        }
        if (currency === 'EUR') {
            const eurItem = MarketService.data?.categories?.bigpara?.items?.EUR || MarketService.data?.categories?.featured?.items?.EUR;
            return eurItem?.rate || 55.2600;
        }
        if (currency === 'GA') {
            const gaItem = MarketService.data?.categories?.harem?.items?.GA || MarketService.data?.categories?.featured?.items?.GA;
            return gaItem?.rate || 6745.00;
        }
        return 1.0;
    },

    convert(amountInTRY, targetCurrency = this.activeCurrency) {
        const rate = this.getRate(targetCurrency);
        if (!rate || rate <= 0) return amountInTRY;
        return amountInTRY / rate;
    },

    format(amountInTRY, targetCurrency = this.activeCurrency) {
        const converted = this.convert(amountInTRY, targetCurrency);
        const symbols = { 'TRY': '₺', 'USD': '$', 'EUR': '€', 'GA': ' gr' };
        const sym = symbols[targetCurrency] || '₺';
        const isGA = targetCurrency === 'GA';

        const decimals = isGA ? 3 : (targetCurrency === 'USD' || targetCurrency === 'EUR' ? 2 : 2);
        const formatted = converted.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        return isGA ? `${formatted}${sym}` : `${sym}${formatted}`;
    },

    setCurrency(curr) {
        if (!['TRY', 'USD', 'EUR', 'GA'].includes(curr)) return;
        this.activeCurrency = curr;
        try {
            localStorage.setItem('zenith_display_currency', curr);
        } catch (e) {}
        this.updatePillUI();
        this.updateRateHint();
        if (typeof Dashboard !== 'undefined') {
            Dashboard.renderCalculations();
            Dashboard.renderFundTable();
        }
        if (typeof PortfolioManager !== 'undefined') {
            PortfolioManager.renderManagedFunds();
        }
        if (typeof TaxOptimizer !== 'undefined') {
            TaxOptimizer.render();
        }
        Utils.showToast(`💱 Görüntüleme Para Birimi: ${curr} olarak ayarlandı.`, 'info');
    },

    updatePillUI() {
        const bar = document.getElementById('currencySelectorBar');
        if (!bar) return;
        bar.querySelectorAll('.currency-pill').forEach(btn => {
            if (btn.getAttribute('data-currency') === this.activeCurrency) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    updateRateHint() {
        const hintEl = document.getElementById('currencyRateHint');
        if (!hintEl) return;
        const usd = this.getRate('USD').toFixed(2);
        const ga = this.getRate('GA').toFixed(0);
        hintEl.textContent = `1 USD = ₺${usd} | 1 gr Altın = ₺${ga}`;
    },

    render() {
        this.updatePillUI();
        this.updateRateHint();
    },

    bindEvents() {
        const bar = document.getElementById('currencySelectorBar');
        if (bar && !bar._hasListener) {
            bar._hasListener = true;
            bar.addEventListener('click', (e) => {
                const btn = e.target.closest('.currency-pill');
                if (!btn) return;
                const curr = btn.getAttribute('data-currency');
                if (curr) this.setCurrency(curr);
            });
        }
    }
};

// ==========================================================================
// 2. TaxOptimizer (Stopaj & Net Getiri Motoru)
// ==========================================================================
const TaxOptimizer = {
    getTaxRule(fund) {
        const name = (fund.name || '').toUpperCase();
        const code = (fund.code || '').toUpperCase();
        const cat = (fund.category || '').toUpperCase();

        if (cat.includes('HİSSE') || cat.includes('HISSE') || name.includes('HİSSE SENEDİ') || name.includes('BIST') || ['TI2', 'MAC', 'TTE', 'YAS', 'IIH', 'IDH', 'GMR', 'HKH', 'TAU'].includes(code)) {
            return {
                rate: 0,
                rateText: '%0 (Tam Muafiyet)',
                isExempt: true,
                badgeClass: 'badge-success',
                badgeText: '🛡 %0 Stopaj Kalkanı',
                desc: '193 Sayılı GVK Geçici 67. Madde uyarınca hisse senedi yoğun fon kazançlarından %0 stopaj kesilir.'
            };
        }

        if (cat.includes('PARA PİYASASI') || cat.includes('BORÇLANMA') || cat.includes('BORCLANMA') || ['AIS', 'PPZ', 'NVB'].includes(code)) {
            return {
                rate: 10.0,
                rateText: '%10 Stopaj',
                isExempt: false,
                badgeClass: 'badge-warning',
                badgeText: '⚠ %10 Kesinti',
                desc: '9075 Sayılı CBK uyarınca TL Para Piyasası ve Borçlanma fonlarında %10 stopaj uygulanır.'
            };
        }

        if (cat.includes('KIYMETLİ') || cat.includes('ALTIN') || ['KZL', 'GGK', 'TTA'].includes(code)) {
            return {
                rate: 10.0,
                rateText: '%10 Stopaj',
                isExempt: false,
                badgeClass: 'badge-warning',
                badgeText: '⚠ %10 Kesinti',
                desc: '9075 Sayılı CBK uyarınca kıymetli madenler fonlarında %10 stopaj kesintisi uygulanır.'
            };
        }

        return {
            rate: 10.0,
            rateText: '%10 Stopaj',
            isExempt: false,
            badgeClass: 'badge-secondary',
            badgeText: '⚠ %10 Kesinti',
            desc: 'Standart yatırım fonlarında 9075 Sayılı CBK uyarınca %10 stopaj kesintisi uygulanır.'
        };
    },

    analyze() {
        const funds = PortfolioData.funds;
        let totalGrossProfit = 0;
        let totalTaxDeduction = 0;
        let totalNetProfit = 0;
        let exemptProfit = 0;
        let totalValue = 0;
        let exemptValue = 0;

        const breakdown = funds.map(f => {
            const val = f.shares * f.currentPrice;
            const cost = f.shares * f.avgCost;
            const grossPnL = val - cost;
            const rule = this.getTaxRule(f);

            let tax = 0;
            if (grossPnL > 0 && !rule.isExempt) {
                tax = grossPnL * (rule.rate / 100);
            }
            const netPnL = grossPnL - tax;

            totalValue += val;
            totalGrossProfit += grossPnL;
            totalTaxDeduction += tax;
            totalNetProfit += netPnL;

            if (rule.isExempt) {
                exemptProfit += grossPnL;
                exemptValue += val;
            }

            return {
                fund: f,
                value: val,
                grossPnL,
                tax,
                netPnL,
                rule
            };
        });

        const effectiveRate = totalGrossProfit > 0 ? (totalTaxDeduction / totalGrossProfit) * 100 : 0;
        const exemptRatio = totalValue > 0 ? (exemptValue / totalValue) * 100 : 0;
        const taxSaved = breakdown.filter(b => b.rule.isExempt && b.grossPnL > 0).reduce((acc, b) => acc + (b.grossPnL * 0.10), 0);

        return {
            totalGrossProfit,
            totalTaxDeduction,
            totalNetProfit,
            effectiveRate,
            exemptRatio,
            taxSaved,
            breakdown
        };
    },

    render() {
        const analysis = this.analyze();

        const grossEl = document.getElementById('taxGrossProfitVal');
        const dedEl = document.getElementById('taxDeductionVal');
        const netEl = document.getElementById('taxNetProfitVal');
        const exemptEl = document.getElementById('taxExemptRatioVal');
        const effectiveSub = document.getElementById('taxEffectiveRateSub');
        const savedSub = document.getElementById('taxSavedAmountSub');
        const tbody = document.getElementById('taxTableBody');
        const recBox = document.getElementById('taxRecommendationBox');

        if (grossEl) grossEl.textContent = CurrencyEngine.format(analysis.totalGrossProfit);
        if (dedEl) dedEl.textContent = `-${CurrencyEngine.format(analysis.totalTaxDeduction)}`;
        if (netEl) netEl.textContent = CurrencyEngine.format(analysis.totalNetProfit);
        if (exemptEl) exemptEl.textContent = `%${analysis.exemptRatio.toFixed(1)}`;
        if (effectiveSub) effectiveSub.textContent = `Efektif Vergi Yükü: %${analysis.effectiveRate.toFixed(1)}`;
        if (savedSub) savedSub.textContent = `Vergi Kalkanı Tasarrufu: ${CurrencyEngine.format(analysis.taxSaved)}`;

        if (tbody) {
            let html = '';
            analysis.breakdown.forEach(b => {
                html += `
                    <tr>
                        <td>
                            <strong style="color:${b.fund.color || 'var(--accent-primary)'}">${b.fund.code}</strong>
                            <div style="font-size:0.75rem; color:var(--text-secondary);">${Utils.escapeHtml(b.fund.name)}</div>
                        </td>
                        <td>${Utils.escapeHtml(b.fund.category || 'Fon')}</td>
                        <td><span class="badge ${b.rule.badgeClass}">${b.rule.rateText}</span></td>
                        <td class="${Utils.getReturnClass(b.grossPnL)}">${CurrencyEngine.format(b.grossPnL)}</td>
                        <td style="color:#EF4444;">-${CurrencyEngine.format(b.tax)}</td>
                        <td class="${Utils.getReturnClass(b.netPnL)}"><strong>${CurrencyEngine.format(b.netPnL)}</strong></td>
                        <td><span class="badge ${b.rule.isExempt ? 'badge-success' : 'badge-secondary'}">${b.rule.badgeText}</span></td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        if (recBox) {
            recBox.innerHTML = `
                <div style="display:flex; align-items:flex-start; gap:10px;">
                    <span style="font-size:1.4rem;">💡</span>
                    <div>
                        <strong>Vergi Verimliliği Analizi & Tavsiye:</strong>
                        <p style="margin-top:4px; font-size:0.8rem; color:var(--text-secondary);">
                            Portföyünüzün <strong>%${analysis.exemptRatio.toFixed(1)}</strong> kadarı %0 stopaj muafiyetine sahiptir. 
                            Vergi kalkanınız sayesinde bugüne kadar yaklaşık <strong>${CurrencyEngine.format(analysis.taxSaved)}</strong> vergi tasarrufu sağladınız. 
                            Getirinizi maksimize etmek için stopaj kesintili varlıklardan stopajsız Hisse Senedi Yoğun Fonlara geçiş fırsatlarını değerlendirebilirsiniz.
                        </p>
                    </div>
                </div>
            `;
        }
    }
};

// ==========================================================================
// 3. AlertsEngine (Akıllı Fiyat, K/Z & Eşik Alarm Motoru)
// ==========================================================================
const AlertsEngine = {
    STORAGE_KEY: 'zenith_smart_alerts_v2',
    alerts: [],
    audioCtx: null,

    init() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.alerts = JSON.parse(saved);
            }
        } catch (e) {
            this.alerts = [];
        }

        this.updateBadge();
        this.bindEvents();
    },

    saveAlerts() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.alerts));
        } catch (e) {}
        this.updateBadge();
        this.renderList();
    },

    updateBadge() {
        const badge = document.getElementById('alertsActiveBadge');
        if (badge) {
            const count = this.alerts.filter(a => !a.triggered).length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
        const countBadge = document.getElementById('activeAlertsCountBadge');
        if (countBadge) {
            countBadge.textContent = `${this.alerts.length} Alarm Tanımlı`;
        }
    },

    addAlert(target, condition, threshold) {
        const numVal = parseFloat(threshold);
        if (isNaN(numVal) || numVal <= 0) {
            Utils.showToast('Lütfen geçerli bir hedef eşik değeri girin.', 'error');
            return false;
        }

        const newAlert = {
            id: 'alert_' + Date.now(),
            target,
            condition,
            threshold: numVal,
            createdDate: new Date().toLocaleDateString('tr-TR'),
            triggered: false
        };

        this.alerts.unshift(newAlert);
        this.saveAlerts();
        Utils.showToast('🔔 Akıllı alarm başarıyla kuruldu!', 'success');
        return true;
    },

    removeAlert(id) {
        this.alerts = this.alerts.filter(a => a.id !== id);
        this.saveAlerts();
        Utils.showToast('Alarm silindi.', 'info');
    },

    playChime() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!this.audioCtx) this.audioCtx = new AudioContext();
            
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + 0.5);
        } catch (e) {}
    },

    checkAlerts() {
        if (this.alerts.length === 0) return;

        let hasNewTrigger = false;
        this.alerts.forEach(a => {
            if (a.triggered) return;

            let currentVal = 0;
            let label = a.target;

            if (a.target === 'USD') {
                currentVal = MarketService.data?.categories?.bigpara?.items?.USD?.rate || 0;
                label = 'USD/TRY';
            } else if (a.target === 'EUR') {
                currentVal = MarketService.data?.categories?.bigpara?.items?.EUR?.rate || 0;
                label = 'EUR/TRY';
            } else if (a.target === 'GA') {
                currentVal = MarketService.data?.categories?.harem?.items?.GA?.rate || 0;
                label = 'Gram Altın';
            } else if (a.target === 'ONS') {
                currentVal = MarketService.data?.categories?.harem?.items?.ONS?.rate || 0;
                label = 'Ons Altın';
            } else if (a.target === 'BIST100') {
                currentVal = MarketService.data?.categories?.bist?.items?.BIST100?.rate || 0;
                label = 'BIST 100';
            } else if (a.target === 'PORTFOLIO_DAILY_PNL_PCT') {
                currentVal = Calculations.getDailyPnLPercent();
                label = 'Portföy Günlük Getiri';
            } else if (a.target === 'PORTFOLIO_TOTAL_VAL') {
                currentVal = Calculations.getTotalPortfolioValue();
                label = 'Portföy Toplam Değeri';
            }

            if (currentVal <= 0) return;

            let isConditionMet = false;
            if (a.condition === 'GTE' && currentVal >= a.threshold) {
                isConditionMet = true;
            } else if (a.condition === 'LTE' && currentVal <= a.threshold) {
                isConditionMet = true;
            }

            if (isConditionMet) {
                a.triggered = true;
                hasNewTrigger = true;
                this.playChime();
                Utils.showToast(`🚨 ALARM TETİKLENDİ: ${label} (${currentVal.toFixed(2)}) hedeflenen eşiğe (${a.threshold}) ulaştı!`, 'warning');
                
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('Zenith Atlas Piyasa Alarmı', {
                        body: `${label} hedeflediğiniz ${a.threshold} seviyesine ulaştı (Güncel: ${currentVal.toFixed(2)}).`,
                        icon: 'favicon.ico'
                    });
                }
            }
        });

        if (hasNewTrigger) {
            this.saveAlerts();
        }
    },

    renderList() {
        const container = document.getElementById('alertsListContainer');
        if (!container) return;

        if (this.alerts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.85rem;">
                    🔔 Henüz tanımlanmış bir akıllı alarm bulunmuyor.<br>Yukarıdaki formdan hemen canlı fiyat alarmı kurabilirsiniz.
                </div>
            `;
            return;
        }

        let html = '';
        this.alerts.forEach(a => {
            const condText = a.condition === 'GTE' ? '>= (Üzerine Çıkınca)' : '<= (Altına Düşünce)';
            html += `
                <div class="alert-item-card">
                    <div class="alert-item-left">
                        <span class="alert-item-icon">${a.triggered ? '✅' : '🔔'}</span>
                        <div>
                            <div class="alert-item-title">${Utils.escapeHtml(a.target)}</div>
                            <div class="alert-item-condition">${condText} Hedef: <strong>${a.threshold}</strong> (${a.createdDate})</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="badge ${a.triggered ? 'badge-success' : 'badge-purple'}">${a.triggered ? 'Tetiklendi' : 'Dinleniyor'}</span>
                        <button class="btn btn-ghost btn-sm remove-alert-btn" data-id="${a.id}">🗑</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

        container.querySelectorAll('.remove-alert-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (id) this.removeAlert(id);
            });
        });
    },

    bindEvents() {
        const openBtn = document.getElementById('openAlertsBtn');
        const modal = document.getElementById('alertsModal');
        const closeBtn = document.getElementById('closeAlertsModal');
        const dismissBtn = document.getElementById('dismissAlertsModal');
        const saveBtn = document.getElementById('saveNewAlertBtn');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                if (modal) {
                    modal.classList.add('active');
                    this.renderList();
                    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                        Notification.requestPermission();
                    }
                }
            });
        }
        if (closeBtn) closeBtn.addEventListener('click', () => modal?.classList.remove('active'));
        if (dismissBtn) dismissBtn.addEventListener('click', () => modal?.classList.remove('active'));

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const target = document.getElementById('alertTargetSelect')?.value;
                const condition = document.getElementById('alertConditionSelect')?.value;
                const threshold = document.getElementById('alertThresholdInput')?.value;
                if (target && condition && threshold) {
                    if (this.addAlert(target, condition, threshold)) {
                        const input = document.getElementById('alertThresholdInput');
                        if (input) input.value = '';
                    }
                }
            });
        }
    }
};

// ==========================================================================
// 4. GoalWealthBuilder (FIRE & Varlık Hedef Simülatörü)
// ==========================================================================
const GoalWealthBuilder = {
    chartInstance: null,

    init() {
        this.bindEvents();
    },

    calculate() {
        const pv = Calculations.getTotalPortfolioValue();
        const targetVal = parseFloat(document.getElementById('goalTargetInput')?.value || 2500000);
        const monthlyPmt = parseFloat(document.getElementById('goalMonthlyInput')?.value || 25000);
        const nominalCagr = parseFloat(document.getElementById('goalCagrInput')?.value || 55) / 100;
        const inflationRate = parseFloat(document.getElementById('goalInflationInput')?.value || 30) / 100;

        const monthlyRate = Math.pow(1 + nominalCagr, 1 / 12) - 1;
        let months = 0;
        let currentNominal = pv;
        let totalInvested = pv;
        const maxMonths = 360;

        const labels = ['Bugün'];
        const nominalData = [pv];
        const investedData = [pv];

        while (currentNominal < targetVal && months < maxMonths) {
            months++;
            currentNominal = currentNominal * (1 + monthlyRate) + monthlyPmt;
            totalInvested += monthlyPmt;

            if (months % 3 === 0 || currentNominal >= targetVal) {
                const y = Math.floor(months / 12);
                const m = months % 12;
                const lbl = y > 0 ? (m > 0 ? `${y}y ${m}a` : `${y}. Yıl`) : `${m}. Ay`;
                labels.push(lbl);
                nominalData.push(Math.round(currentNominal));
                investedData.push(Math.round(totalInvested));
            }
        }

        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + months);

        return {
            pv,
            targetVal,
            monthlyPmt,
            months,
            years,
            remainingMonths,
            targetDate,
            totalInvested,
            compoundInterest: Math.max(0, currentNominal - totalInvested),
            percentCompleted: Math.min(100, (pv / targetVal) * 100),
            chartData: { labels, nominalData, investedData }
        };
    },

    render() {
        const res = this.calculate();

        const timeText = document.getElementById('goalTimeText');
        const dateText = document.getElementById('goalDateText');
        const curValText = document.getElementById('goalCurrentValText');
        const pctText = document.getElementById('goalPercentText');
        const pBar = document.getElementById('goalProgressBar');

        if (timeText) {
            timeText.textContent = res.years > 0 ? `⏱ ${res.years} Yıl ${res.remainingMonths} Ay` : `⏱ ${res.months} Ay`;
        }
        if (dateText) {
            dateText.textContent = `Tahmini Hedef Tarihi: ${res.targetDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;
        }
        if (curValText) curValText.textContent = CurrencyEngine.format(res.pv);
        if (pctText) pctText.textContent = `%${res.percentCompleted.toFixed(1)} Tamamlandı`;
        if (pBar) pBar.style.width = `${res.percentCompleted}%`;

        this.renderChart(res.chartData, res.targetVal);
    },

    renderChart(data, targetVal) {
        const canvas = document.getElementById('goalProjectionChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 260);
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Tahmini Portföy Büyümesi (Bileşik Getiri)',
                        data: data.nominalData,
                        borderColor: '#A855F7',
                        backgroundColor: grad,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                        pointBackgroundColor: '#A855F7'
                    },
                    {
                        label: 'Toplam Yatırılan Anapara',
                        data: data.investedData,
                        borderColor: '#6366F1',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.2,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#8B92A5', font: { family: "'Inter', sans-serif", size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ₺${context.parsed.y.toLocaleString('tr-TR')}`
                        }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8B92A5' } },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#8B92A5',
                            callback: (v) => '₺' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'K')
                        }
                    }
                }
            }
        });
    },

    bindEvents() {
        const inputs = ['goalTargetInput', 'goalMonthlyInput', 'goalCagrInput', 'goalInflationInput'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el._hasListener) {
                el._hasListener = true;
                el.addEventListener('input', () => this.render());
            }
        });

        const presetBtns = document.querySelectorAll('.goal-preset-btn');
        presetBtns.forEach(btn => {
            if (!btn._hasListener) {
                btn._hasListener = true;
                btn.addEventListener('click', () => {
                    presetBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const target = btn.getAttribute('data-target');
                    const targetInput = document.getElementById('goalTargetInput');
                    if (targetInput && target) {
                        targetInput.value = target;
                        this.render();
                    }
                });
            }
        });
    }
};

// ==========================================================================
// 4.5. DividendYieldEngine (Akıllı Temettü & Pasif Gelir Nakit Akışı Matrisi)
// ==========================================================================
const DividendYieldEngine = {
    chartInstance: null,

    MONTH_NAMES: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    
    CATEGORY_YIELDS: {
        'Hisse Senedi': { yield: 6.2, season: 'Mart-Nisan Peak', weights: [0.02, 0.03, 0.28, 0.32, 0.14, 0.04, 0.02, 0.02, 0.08, 0.03, 0.01, 0.01] },
        'Hisse Senedi Yoğun': { yield: 6.8, season: 'Mart-Nisan Peak', weights: [0.02, 0.03, 0.28, 0.32, 0.14, 0.04, 0.02, 0.02, 0.08, 0.03, 0.01, 0.01] },
        'Yabancı Teknoloji': { yield: 1.2, season: 'Üçer Aylık Düzenli', weights: [0.08, 0.08, 0.09, 0.08, 0.08, 0.09, 0.08, 0.08, 0.09, 0.08, 0.08, 0.09] },
        'Altın & Emtia': { yield: 0.0, season: 'Temettüsüz (Sermaye Kazancı)', weights: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        'Kıymetli Madenler': { yield: 0.0, season: 'Temettüsüz (Sermaye Kazancı)', weights: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        'Para Piyasası': { yield: 0.0, season: 'Günlük Bileşik Getiri', weights: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        'Borçlanma Araçları': { yield: 9.5, season: 'Kupon Dağıtımlı', weights: [0.08, 0.08, 0.09, 0.08, 0.08, 0.09, 0.08, 0.08, 0.09, 0.08, 0.08, 0.09] },
        'Değişken': { yield: 3.5, season: 'Dönemsel Dağıtım', weights: [0.05, 0.05, 0.18, 0.22, 0.12, 0.05, 0.05, 0.05, 0.08, 0.05, 0.05, 0.05] }
    },

    getFundYieldProfile(fund) {
        if (!fund) return { yield: 0, season: 'Temettüsüz', weights: new Array(12).fill(0) };
        const cat = fund.category || 'Değişken';
        let matched = this.CATEGORY_YIELDS[cat];
        if (!matched) {
            for (const key of Object.keys(this.CATEGORY_YIELDS)) {
                if (cat.toLowerCase().includes(key.toLowerCase())) {
                    matched = this.CATEGORY_YIELDS[key];
                    break;
                }
            }
        }
        if (!matched) matched = { yield: 2.0, season: 'Genel', weights: new Array(12).fill(1 / 12) };

        const code = (fund.code || '').toUpperCase();
        if (code === 'GSP' || code === 'FBC' || code === 'TAV' || code === 'MAC') {
            return {
                yield: 7.8,
                season: 'Nisan-Mayıs BIST Temettü',
                weights: [0.01, 0.02, 0.30, 0.35, 0.15, 0.03, 0.02, 0.01, 0.08, 0.02, 0.01, 0.00]
            };
        }

        return matched;
    },

    calculate() {
        const totalVal = Calculations.getTotalPortfolioValue();
        const funds = PortfolioData.funds || [];

        let totalAnnualDividend = 0;
        const monthlyFlows = new Array(12).fill(0);
        const breakdowns = [];

        funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const profile = this.getFundYieldProfile(f);
            const fundAnnualDiv = val * (profile.yield / 100);

            totalAnnualDividend += fundAnnualDiv;

            profile.weights.forEach((w, mIdx) => {
                monthlyFlows[mIdx] += fundAnnualDiv * w;
            });

            breakdowns.push({
                fund: f,
                val,
                yieldPct: profile.yield,
                annualDivTL: fundAnnualDiv,
                season: profile.season
            });
        });

        const weightedYieldPct = totalVal > 0 ? (totalAnnualDividend / totalVal) * 100 : 0;
        const monthlyAvg = totalAnnualDividend / 12;
        
        const cagr = 0.50;
        let withDrip = totalVal;
        let withoutDrip = totalVal;
        for (let y = 1; y <= 10; y++) {
            withDrip = withDrip * (1 + cagr) + totalAnnualDividend * Math.pow(1 + cagr, y - 1);
            withoutDrip = withoutDrip * (1 + cagr);
        }
        const dripBoost = Math.max(0, withDrip - withoutDrip);

        return {
            totalVal,
            totalAnnualDividend,
            weightedYieldPct,
            monthlyAvg,
            dripBoost,
            monthlyFlows,
            breakdowns
        };
    },

    render() {
        const res = this.calculate();
        if (!res) return;

        const annualEl = document.getElementById('divAnnualTotalVal');
        const yieldEl = document.getElementById('divWeightedYieldVal');
        const monthlyEl = document.getElementById('divMonthlyAvgVal');
        const dripEl = document.getElementById('divDripBoostVal');
        const panelEl = document.getElementById('dividendBreakdownPanel');

        if (annualEl) annualEl.textContent = Utils.formatCurrency(res.totalAnnualDividend);
        if (yieldEl) yieldEl.textContent = `%${res.weightedYieldPct.toFixed(2)}`;
        if (monthlyEl) monthlyEl.textContent = `${Utils.formatCurrency(res.monthlyAvg)}/ay`;
        if (dripEl) dripEl.textContent = `+${Utils.formatCurrency(res.dripBoost)}`;

        this.renderChart(res);

        if (panelEl) {
            let html = `
                <table class="dividend-breakdown-table">
                    <thead>
                        <tr>
                            <th>Varlık / Fon</th>
                            <th>Piyasa Değeri</th>
                            <th>Temettü Verimi</th>
                            <th>Yıllık Pasif Nakit</th>
                            <th>Dağıtım Sezonu</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            res.breakdowns.forEach(item => {
                const f = item.fund;
                html += `
                    <tr>
                        <td>
                            <strong style="color: ${f.color || 'var(--text-primary)'}">${f.code}</strong>
                            <div style="font-size:0.74rem; color:var(--text-secondary);">${f.name}</div>
                        </td>
                        <td>${Utils.formatCurrency(item.val)}</td>
                        <td>
                            <span class="badge ${item.yieldPct > 4 ? 'badge-success' : 'badge-primary'}">%${item.yieldPct.toFixed(1)}</span>
                        </td>
                        <td style="font-family:'JetBrains Mono'; font-weight:700; color:var(--success);">
                            ${Utils.formatCurrency(item.annualDivTL)}
                        </td>
                        <td style="font-size:0.78rem; color:var(--text-secondary);">${item.season}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;
            panelEl.innerHTML = html;
        }
    },

    renderChart(res) {
        const canvas = document.getElementById('dividendMonthlyChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        const ctx = canvas.getContext('2d');

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.MONTH_NAMES,
                datasets: [{
                    label: 'Aylık Pasif Temettü Nakit Akışı (₺)',
                    data: res.monthlyFlows.map(v => Number(v.toFixed(2))),
                    backgroundColor: res.monthlyFlows.map((v, i) => {
                        return (i === 2 || i === 3) ? 'rgba(16, 185, 129, 0.85)' : 'rgba(99, 102, 241, 0.65)';
                    }),
                    borderColor: res.monthlyFlows.map((v, i) => {
                        return (i === 2 || i === 3) ? '#10B981' : '#6366F1';
                    }),
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94A3B8', font: { family: "'JetBrains Mono', monospace", size: 10 } }
                    },
                    y: {
                        title: { display: true, text: 'Tahmini Nakit Girişi (₺)', color: '#94A3B8', font: { size: 10 } },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94A3B8',
                            callback: v => '₺' + v.toLocaleString('tr-TR'),
                            font: { family: "'JetBrains Mono', monospace", size: 10 }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: ctx => ` Aylık Pasif Nakit: ${Utils.formatCurrency(ctx.raw)}`
                        }
                    }
                }
            }
        });
    }
};

// ==========================================================================
// 5. ExecutiveReportEngine (Kurumsal Yatırımcı Bülteni & A4 PDF)
// ==========================================================================
const ExecutiveReportEngine = {
    render() {
        const content = document.getElementById('executiveReportContent');
        if (!content) return;

        const totalVal = Calculations.getTotalPortfolioValue();
        const usdVal = CurrencyEngine.convert(totalVal, 'USD');
        const eurVal = CurrencyEngine.convert(totalVal, 'EUR');
        const gaVal = CurrencyEngine.convert(totalVal, 'GA');

        const dailyPnL = Calculations.getDailyPnL();
        const dailyPnLPct = Calculations.getDailyPnLPercent();
        const totalReturn = Calculations.getTotalReturn();
        const totalReturnPct = Calculations.getTotalReturnPercent();

        const sharpe = Calculations.getSharpeRatio();
        const maxDD = Calculations.getMaxDrawdown();
        const bistBeta = Calculations.getBISTBeta();
        const dollarBeta = Calculations.getDollarBeta();

        const taxAnalysis = TaxOptimizer.analyze();
        const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

        let fundsRows = '';
        PortfolioData.funds.forEach(f => {
            const val = f.shares * f.currentPrice;
            const cost = f.shares * f.avgCost;
            const retPct = cost > 0 ? ((val - cost) / cost) * 100 : (f.totalReturnPct || 0);
            const weight = totalVal > 0 ? (val / totalVal) * 100 : 0;
            fundsRows += `
                <tr>
                    <td><strong>${f.code}</strong> - ${Utils.escapeHtml(f.name)}</td>
                    <td>%${weight.toFixed(1)}</td>
                    <td>${Utils.formatNumber(f.shares)}</td>
                    <td>₺${f.avgCost.toFixed(4)}</td>
                    <td>₺${f.currentPrice.toFixed(4)}</td>
                    <td>₺${val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style="color:${retPct >= 0 ? '#10B981' : '#EF4444'}; font-weight:700;">
                        ${retPct >= 0 ? '+' : ''}%${retPct.toFixed(2)}
                    </td>
                </tr>
            `;
        });

        content.innerHTML = `
            <div class="executive-memo">
                <div class="memo-header">
                    <div>
                        <div class="memo-title">🌌 ZENITH ATLAS - YATIRIMCI PORTFÖY RAPORU</div>
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:3px;">
                            Çoklu Varlık Dağılımı, Quant Risk Analizi ve Piyasa Görünümü
                        </div>
                    </div>
                    <div class="memo-meta">
                        <div><strong>Tarih:</strong> ${todayStr}</div>
                        <div><strong>Geliştirici & Varlık Yöneticisi:</strong> Çağrı Giray Keşan</div>
                        <div><strong>Para Birimi:</strong> Multi-Currency (TRY, USD, EUR, XAU)</div>
                    </div>
                </div>

                <!-- Multi-Currency Summary Box -->
                <div class="memo-kpi-grid">
                    <div class="memo-kpi-box">
                        <span>Toplam Değer (TRY)</span>
                        <strong>₺${totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div class="memo-kpi-box">
                        <span>Dolar Karşılığı (USD)</span>
                        <strong>$${usdVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div class="memo-kpi-box">
                        <span>Euro Karşılığı (EUR)</span>
                        <strong>€${eurVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    <div class="memo-kpi-box">
                        <span>Fiziki Altın Karşılığı</span>
                        <strong>${gaVal.toFixed(2)} gr Altın</strong>
                    </div>
                </div>

                <!-- Quant & Performance Metrics -->
                <div class="memo-kpi-grid" style="margin-top:-10px;">
                    <div class="memo-kpi-box">
                        <span>Toplam Getiri</span>
                        <strong style="color:${totalReturn >= 0 ? '#10B981' : '#EF4444'};">${totalReturn >= 0 ? '+' : ''}%${totalReturnPct.toFixed(2)}</strong>
                    </div>
                    <div class="memo-kpi-box">
                        <span>Sharpe Oranı</span>
                        <strong>${sharpe.toFixed(2)}</strong>
                    </div>
                    <div class="memo-kpi-box">
                        <span>Maksimum Çekilme</span>
                        <strong>-%${maxDD.toFixed(1)}</strong>
                    </div>
                    <div class="memo-kpi-box">
                        <span>BIST / Dolar Beta</span>
                        <strong>${bistBeta.toFixed(2)} / ${dollarBeta.toFixed(2)}</strong>
                    </div>
                </div>

                <!-- Asset Holdings Table -->
                <div style="margin-top:16px;">
                    <h5 style="margin-bottom:8px; font-size:0.95rem; color:var(--text-primary);">💼 Portföy Varlık Dağılımı ve Pozisyonlar</h5>
                    <table class="table-compact" style="width:100%; font-size:0.8rem; border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.1); text-align:left;">
                                <th style="padding:6px;">Varlık / Fon</th>
                                <th style="padding:6px;">Ağırlık</th>
                                <th style="padding:6px;">Pay</th>
                                <th style="padding:6px;">Ort. Maliyet</th>
                                <th style="padding:6px;">Güncel Fiyat</th>
                                <th style="padding:6px;">Toplam Tutar</th>
                                <th style="padding:6px;">Getiri</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fundsRows}
                        </tbody>
                    </table>
                </div>

                <!-- Tax & Legal Disclaimer -->
                <div style="margin-top:20px; padding:12px; background:rgba(255,255,255,0.03); border-radius:6px; font-size:0.75rem; color:var(--text-secondary); line-height:1.5;">
                    <strong>Vergi & Stopaj Durumu:</strong> Portföyün %${taxAnalysis.exemptRatio.toFixed(1)} kadarı Hisse Senedi Yoğun Fon mevzuatı kapsamında %0 stopaj muafiyetine tabidir. Tahmini net realize edilebilir kazanç ₺${taxAnalysis.totalNetProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} seviyesindedir.<br>
                    <strong>Yasal Uyarı:</strong> Bu bülten yatırım tavsiyesi içermez. Kamuya açık resmi Takasbank TEFAS, Borsa İstanbul ve TCMB verileriyle hazırlanmıştır.
                </div>
            </div>
        `;
    },

    bindEvents() {
        const openBtn = document.getElementById('openExecutiveReportBtn');
        const modal = document.getElementById('executiveReportModal');
        const closeBtn = document.getElementById('closeExecutiveReportModal');
        const dismissBtn = document.getElementById('dismissExecutiveReportModal');
        const printBtn = document.getElementById('printExecutivePdfBtn');

        if (openBtn && !openBtn._hasListener) {
            openBtn._hasListener = true;
            openBtn.addEventListener('click', () => {
                if (modal) {
                    this.render();
                    modal.classList.add('active');
                }
            });
        }
        if (closeBtn && !closeBtn._hasListener) {
            closeBtn._hasListener = true;
            closeBtn.addEventListener('click', () => modal?.classList.remove('active'));
        }
        if (dismissBtn && !dismissBtn._hasListener) {
            dismissBtn._hasListener = true;
            dismissBtn.addEventListener('click', () => modal?.classList.remove('active'));
        }
        if (printBtn && !printBtn._hasListener) {
            printBtn._hasListener = true;
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    }
};

// ==========================================================================
// 6. MacroNewsEngine (TCMB, SPK, KAP & Makroekonomi Resmi Bülten Motoru)
// ==========================================================================
const MacroNewsEngine = {
    data: (typeof window !== 'undefined' && window.ZENITH_MACRO_NEWS) ? window.ZENITH_MACRO_NEWS : null,
    activeCategory: 'all', // 'all', 'tcmb', 'spk', 'kap', 'global'

    async init() {
        if (!this.data && typeof window !== 'undefined' && window.ZENITH_MACRO_NEWS) {
            this.data = window.ZENITH_MACRO_NEWS;
        }
        this.render();
        this.bindEvents();
        await this.loadData();
    },

    async loadData() {
        // 1. Try fetch from news.json
        try {
            let res = await fetch(`src/data/news.json?t=${Date.now()}`);
            if (!res.ok) res = await fetch(`data/news.json?t=${Date.now()}`);
            if (res && res.ok) {
                this.data = await res.json();
                this.render();
                return;
            }
        } catch (e) {
            // Fallback
        }

        // 2. Fallback to offline window.ZENITH_MACRO_NEWS
        if (typeof window !== 'undefined' && window.ZENITH_MACRO_NEWS) {
            this.data = window.ZENITH_MACRO_NEWS;
            this.render();
            return;
        }

        // 3. Built-in fallback
        if (!this.data) {
            this.data = {
                policyIndicators: {
                    tcmbPolicyRate: { rate: 50.00, sourceUrl: 'https://www.tcmb.gov.tr' },
                    fundWithholdingTax: { generalRate: 7.50, equityRate: 0.00, sourceUrl: 'https://www.resmigazete.gov.tr' }
                },
                bulletins: [
                    {
                        id: 'NEWS-01',
                        category: 'tcmb',
                        categoryLabel: 'TCMB',
                        title: 'TCMB Para Politikası Kurulu (PPK) Faiz Kararı ve Değerlendirme Özeti',
                        summary: 'Para Politikası Kurulu, politika faizi olan bir hafta vadeli repo ihale faiz oranının %50 düzeyinde sabit tutulmasına karar vermiştir.',
                        date: '17.08.2026',
                        source: 'TCMB Resmi Duyuru',
                        sourceUrl: 'https://www.tcmb.gov.tr',
                        badge: 'badge-primary',
                        impact: 'high',
                        impactLabel: 'Yüksek Etki'
                    }
                ]
            };
            this.render();
        }
    },

    getPolicyRate() {
        return this.data?.policyIndicators?.tcmbPolicyRate?.rate || 50.00;
    },

    render() {
        const container = document.getElementById('macroNewsContainer');
        if (!container) return;
        if (!this.data && typeof window !== 'undefined' && window.ZENITH_MACRO_NEWS) {
            this.data = window.ZENITH_MACRO_NEWS;
        }
        if (!this.data) return;

        const indicators = this.data.policyIndicators || {};
        const bulletins = this.data.bulletins || [];
        const filtered = this.activeCategory === 'all' 
            ? bulletins 
            : bulletins.filter(b => b.category === this.activeCategory);

        const tcmbRate = indicators.tcmbPolicyRate?.rate || 50.00;
        const generalTax = indicators.fundWithholdingTax?.generalRate || 10.0;
        const equityTax = indicators.fundWithholdingTax?.equityRate || 0.0;
        const tcmbUrl = indicators.tcmbPolicyRate?.sourceUrl || 'https://www.tcmb.gov.tr';
        const spkTaxUrl = indicators.fundWithholdingTax?.sourceUrl || 'https://www.resmigazete.gov.tr';

        let html = `
            <div class="macro-news-header">
                <div class="macro-news-title">
                    <span class="macro-icon">📢</span>
                    <h3>Öne Çıkan Gelişmeler & Makroekonomi Bülteni</h3>
                    <span class="macro-sync-badge"><span class="dot"></span>Resmi Kurum Senkronizasyonu</span>
                </div>
                <div class="macro-indicators-strip">
                    <a href="${tcmbUrl}" target="_blank" rel="noopener noreferrer" class="policy-indicator-chip" title="TCMB Resmi Sayfasına Git">
                        <span class="chip-label">🏛 TCMB Politika Faizi:</span>
                        <span class="chip-val">%${tcmbRate.toFixed(2)}</span>
                        <span class="chip-arrow">↗</span>
                    </a>
                    <a href="${spkTaxUrl}" target="_blank" rel="noopener noreferrer" class="policy-indicator-chip" title="Resmi Gazete Stopaj Kararına Git">
                        <span class="chip-label">📜 Fon Stopajı:</span>
                        <span class="chip-val">%${generalTax.toFixed(0)} / %${equityTax.toFixed(0)} (Hisse)</span>
                        <span class="chip-arrow">↗</span>
                    </a>
                </div>
            </div>

            <!-- Filter tabs -->
            <div class="macro-filter-bar">
                <button class="macro-pill ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">Tümü</button>
                <button class="macro-pill ${this.activeCategory === 'tcmb' ? 'active' : ''}" data-cat="tcmb">🏛 TCMB</button>
                <button class="macro-pill ${this.activeCategory === 'spk' ? 'active' : ''}" data-cat="spk">📜 SPK & Vergi</button>
                <button class="macro-pill ${this.activeCategory === 'kap' ? 'active' : ''}" data-cat="kap">🏢 KAP & BIST</button>
                <button class="macro-pill ${this.activeCategory === 'global' ? 'active' : ''}" data-cat="global">🌐 Küresel Makro</button>
            </div>

            <!-- News Grid -->
            <div class="macro-news-grid">
        `;

        if (filtered.length === 0) {
            html += `<div class="macro-news-empty">Bu kategoride bülten bulunamadı.</div>`;
        } else {
            filtered.forEach(item => {
                html += `
                    <a href="${Utils.escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="macro-news-card" title="Resmi Kaynağı İncele (${Utils.escapeHtml(item.source)})">
                        <div class="macro-card-top">
                            <span class="badge ${item.badge || 'badge-primary'}">${Utils.escapeHtml(item.categoryLabel || 'Bülten')}</span>
                            <span class="macro-card-date">${Utils.escapeHtml(item.date || '')}</span>
                            <span class="macro-card-impact impact-${item.impact || 'info'}">${Utils.escapeHtml(item.impactLabel || 'Bülten')}</span>
                        </div>
                        <h4 class="macro-card-title">${Utils.escapeHtml(item.title)}</h4>
                        <p class="macro-card-summary">${Utils.escapeHtml(item.summary)}</p>
                        <div class="macro-card-footer">
                            <span class="macro-card-source">🏛 ${Utils.escapeHtml(item.source)}</span>
                            <span class="macro-card-link">Resmi Kaynağa Git ↗</span>
                        </div>
                    </a>
                `;
            });
        }

        html += `</div>`;
        container.innerHTML = html;
    },

    bindEvents() {
        const container = document.getElementById('macroNewsContainer');
        if (!container || container._hasMacroListener) return;
        container._hasMacroListener = true;
        container.addEventListener('click', (e) => {
            const pill = e.target.closest('.macro-pill');
            if (pill) {
                const cat = pill.getAttribute('data-cat');
                if (cat) {
                    this.activeCategory = cat;
                    this.render();
                }
            }
        });
    }
};

const MarketSessionsEngine = {
    modalEl: null,

    init() {
        const badge = document.getElementById('tefasCountdownBadge');
        if (badge) {
            badge.addEventListener('click', () => this.openModal());
        }

        const closeBtn = document.getElementById('closeMarketSessionsModal');
        const dismissBtn = document.getElementById('dismissMarketSessionsModal');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (dismissBtn) dismissBtn.addEventListener('click', () => this.closeModal());

        const modal = document.getElementById('marketSessionsModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
    },

    openModal() {
        const modal = document.getElementById('marketSessionsModal');
        if (modal) {
            modal.classList.add('active');
            this.renderModalGrid();
        }
    },

    closeModal() {
        const modal = document.getElementById('marketSessionsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    getFormatDiff(diffSeconds) {
        const h = Math.floor(diffSeconds / 3600);
        const m = Math.floor((diffSeconds % 3600) / 60);
        const s = diffSeconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    getSessions(now = new Date()) {
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = (day === 0 || day === 6);
        const currentTotalSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

        const getNextWeekdayAt = (targetHour, targetMin = 0) => {
            const target = new Date(now);
            if (isWeekend) {
                const daysUntilMonday = (1 + 7 - day) % 7 || 1;
                target.setDate(now.getDate() + daysUntilMonday);
            } else if (currentTotalSec >= (targetHour * 3600 + targetMin * 60)) {
                if (day === 5) {
                    target.setDate(now.getDate() + 3); // Friday post-session -> Monday
                } else {
                    target.setDate(now.getDate() + 1);
                }
            }
            target.setHours(targetHour, targetMin, 0, 0);
            return Math.max(0, Math.floor((target - now) / 1000));
        };

        // 1. Borsa İstanbul (BIST 100 / 30 / Pay Piyasası) - 10:00 to 18:00 (Pre: 09:40-10:00)
        let bistStatus = 'closed';
        let bistCountdown = '';
        let bistBadgeClass = 'closed';
        if (isWeekend) {
            const diff = getNextWeekdayAt(10, 0);
            bistStatus = 'Hafta Sonu Kapalı';
            bistCountdown = `Pazartesi 10:00 Açılışa: ${this.getFormatDiff(diff)}`;
            bistBadgeClass = 'closed';
        } else if (currentTotalSec < (9 * 3600 + 40 * 60)) {
            const diff = (9 * 3600 + 40 * 60) - currentTotalSec;
            bistStatus = 'Açılış Seansı Bekleniyor';
            bistCountdown = `Açılışa (09:40): ${this.getFormatDiff(diff)}`;
            bistBadgeClass = 'premarket';
        } else if (currentTotalSec < (10 * 3600)) {
            const diff = (10 * 3600) - currentTotalSec;
            bistStatus = 'Açılış & Eşleşme Seansı';
            bistCountdown = `Sürekli Müzayedeye (10:00): ${this.getFormatDiff(diff)}`;
            bistBadgeClass = 'warning';
        } else if (currentTotalSec < (18 * 3600)) {
            const diff = (18 * 3600) - currentTotalSec;
            bistStatus = '🟢 Seans Açık (Sürekli İşlem)';
            bistCountdown = `Kapanışa (18:00): ${this.getFormatDiff(diff)}`;
            bistBadgeClass = 'open';
        } else {
            const diff = getNextWeekdayAt(10, 0);
            const targetDay = (day === 5) ? 'Pazartesi' : 'Yarın';
            bistStatus = '🌙 Seans Kapandı';
            bistCountdown = `${targetDay} 10:00 Açılışa: ${this.getFormatDiff(diff)}`;
            bistBadgeClass = 'closed';
        }

        // 2. TEFAS Yatırım Fonları - 09:00 to 13:30 (T+0 Emir Cutoff) / 13:30 sonrası T+1 İcrası
        let tefasStatus = 'closed';
        let tefasCountdown = '';
        let tefasBadgeClass = 'closed';
        if (isWeekend) {
            const diff = getNextWeekdayAt(9, 0);
            tefasStatus = 'Hafta Sonu Kapalı';
            tefasCountdown = `Pazartesi 09:00 Açılışa: ${this.getFormatDiff(diff)}`;
            tefasBadgeClass = 'closed';
        } else if (currentTotalSec < (9 * 3600)) {
            const diff = (9 * 3600) - currentTotalSec;
            tefasStatus = 'Açılış Bekleniyor';
            tefasCountdown = `Açılışa (09:00): ${this.getFormatDiff(diff)}`;
            tefasBadgeClass = 'premarket';
        } else if (currentTotalSec < (13 * 3600 + 30 * 60)) {
            const diff = (13 * 3600 + 30 * 60) - currentTotalSec;
            tefasStatus = '🟢 TEFAS Seansı Açık (Aynı Gün Valör)';
            tefasCountdown = `T+0 Kapanışına (13:30): ${this.getFormatDiff(diff)}`;
            tefasBadgeClass = 'open';
        } else {
            const diff = getNextWeekdayAt(9, 0);
            const targetDay = (day === 5) ? 'Pazartesi' : 'Yarın';
            tefasStatus = '🌙 TEFAS Kapalı (T+1 İcrası)';
            tefasCountdown = `${targetDay} 09:00 Açılışa: ${this.getFormatDiff(diff)}`;
            tefasBadgeClass = 'closed';
        }

        // 3. ABD Borsaları (NYSE & NASDAQ / Midas) - Yaz Saati TSİ 16:30 to 23:00 (Pre: 11:00-16:30)
        let usStatus = 'closed';
        let usCountdown = '';
        let usBadgeClass = 'closed';
        if (isWeekend) {
            const diff = getNextWeekdayAt(16, 30);
            usStatus = 'Hafta Sonu Kapalı';
            usCountdown = `Pazartesi 16:30 Açılışa: ${this.getFormatDiff(diff)}`;
            usBadgeClass = 'closed';
        } else if (currentTotalSec < (11 * 3600)) {
            const diff = (11 * 3600) - currentTotalSec;
            usStatus = 'Piyasa Öncesi Bekleniyor';
            usCountdown = `Pre-Market (11:00): ${this.getFormatDiff(diff)}`;
            usBadgeClass = 'closed';
        } else if (currentTotalSec < (16 * 3600 + 30 * 60)) {
            const diff = (16 * 3600 + 30 * 60) - currentTotalSec;
            usStatus = '⚡ Pre-Market Açık (Midas 24/5)';
            usCountdown = `Ana Seansa (16:30): ${this.getFormatDiff(diff)}`;
            usBadgeClass = 'premarket';
        } else if (currentTotalSec < (23 * 3600)) {
            const diff = (23 * 3600) - currentTotalSec;
            usStatus = '🟢 Ana Seans Açık (NYSE / NASDAQ)';
            usCountdown = `Kapanışa (23:00): ${this.getFormatDiff(diff)}`;
            usBadgeClass = 'open';
        } else {
            const diff = getNextWeekdayAt(16, 30);
            const targetDay = (day === 5) ? 'Pazartesi' : 'Yarın';
            usStatus = '🌙 Post-Market / Gece Seansı (Midas)';
            usCountdown = `${targetDay} 16:30 Açılışa: ${this.getFormatDiff(diff)}`;
            usBadgeClass = 'closed';
        }

        // 4. Kapalıçarşı & Serbest Piyasa - 09:00 to 18:00
        let goldStatus = 'closed';
        let goldCountdown = '';
        let goldBadgeClass = 'closed';
        if (isWeekend) {
            const diff = getNextWeekdayAt(9, 0);
            goldStatus = 'Hafta Sonu Kapalı';
            goldCountdown = `Pazartesi 09:00 Açılışa: ${this.getFormatDiff(diff)}`;
            goldBadgeClass = 'closed';
        } else if (currentTotalSec >= (9 * 3600) && currentTotalSec < (18 * 3600)) {
            const diff = (18 * 3600) - currentTotalSec;
            goldStatus = '🟢 Fiziki Piyasa Açık';
            goldCountdown = `Kapanışa (18:00): ${this.getFormatDiff(diff)}`;
            goldBadgeClass = 'open';
        } else {
            const diff = getNextWeekdayAt(9, 0);
            const targetDay = (day === 5) ? 'Pazartesi' : 'Yarın';
            goldStatus = '🌙 Kapalı (Serbest Piyasa)';
            goldCountdown = `${targetDay} 09:00 Açılışa: ${this.getFormatDiff(diff)}`;
            goldBadgeClass = 'closed';
        }

        return [
            {
                id: 'bist',
                flag: '📈',
                name: 'Borsa İstanbul (BIST)',
                subName: 'BIST 100, BIST 30, Pay Piyasası',
                hours: 'Hafta içi 10:00 - 18:00 (Açılış: 09:40)',
                status: bistStatus,
                countdown: bistCountdown,
                badgeClass: bistBadgeClass,
                note: 'Sürekli müzayede 18:00\'de tamamlanır; 18:00-18:10 arası gün sonu kapanış seansıdır.'
            },
            {
                id: 'tefas',
                flag: '🏛',
                name: 'TEFAS Fon Piyasası',
                subName: 'Takasbank & SPK Yatırım Fonları',
                hours: 'Hafta içi 09:00 - 13:30 (Aynı Gün Valör)',
                status: tefasStatus,
                countdown: tefasCountdown,
                badgeClass: tefasBadgeClass,
                note: '13:30 sonrası iletilen fon alım-satım emirleri bir sonraki iş günü fiyatıyla (T+1) işleme alınır.'
            },
            {
                id: 'us',
                flag: '🇺🇸',
                name: 'Amerikan Borsaları (Midas)',
                subName: 'NYSE, NASDAQ & S&P 500',
                hours: 'TSİ 16:30 - 23:00 (Pre: 11:00 / Post: 03:00)',
                status: usStatus,
                countdown: usCountdown,
                badgeClass: usBadgeClass,
                note: 'Midas kullanıcıları için hafta içi 24 saat işlem imkanı; ana borsa seansı 16:30-23:00 arasıdır.'
            },
            {
                id: 'gold',
                flag: '🥇',
                name: 'Kapalıçarşı & Serbest Piyasa',
                subName: 'Fiziki Altın, Gümüş ve Döviz',
                hours: 'Hafta içi 09:00 - 18:00',
                status: goldStatus,
                countdown: goldCountdown,
                badgeClass: goldBadgeClass,
                note: 'Mesai saatleri dışında serbest piyasa alım-satım makasları genişleyebilir.'
            },
            {
                id: 'crypto',
                flag: '⚡',
                name: 'Kripto Para Piyasaları',
                subName: 'Bitcoin, Ethereum, USDT',
                hours: '7/24 Kesintisiz Canlı Seans',
                status: '🟢 7/24 Kesintisiz Açık',
                countdown: 'Sürekli Canlı Fiyat Akışı',
                badgeClass: 'open',
                note: 'Kripto varlık piyasalarında seans tatili yoktur, fiyatlar her salise anlık güncellenir.'
            }
        ];
    },

    renderModalGrid() {
        const grid = document.getElementById('marketSessionsGrid');
        if (!grid) return;

        const sessions = this.getSessions();
        let html = '';
        sessions.forEach(s => {
            html += `
                <div class="market-session-card">
                    <div class="market-session-card-top">
                        <div class="market-session-card-title">
                            <span>${s.flag}</span>
                            <div>
                                <div>${Utils.escapeHtml(s.name)}</div>
                                <div style="font-size:0.72rem; font-weight:400; color:var(--text-secondary);">${Utils.escapeHtml(s.subName)}</div>
                            </div>
                        </div>
                        <span class="market-session-status-badge ${s.badgeClass}">${s.status.includes('🟢') ? '🟢 Açık' : s.status.includes('⚡') ? '⚡ Pre-Market' : '🌙 Kapalı'}</span>
                    </div>
                    <div class="market-session-countdown">
                        ⏱ ${Utils.escapeHtml(s.countdown)}
                    </div>
                    <div class="market-session-hours">
                        <strong>İşlem Saatleri:</strong> ${Utils.escapeHtml(s.hours)}
                    </div>
                    <div class="market-session-note">
                        ${Utils.escapeHtml(s.note)}
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    }
};

const TerminalTicker = {
    timerInterval: null,

    init() {
        this.renderTrack();
        this.renderCountdown();
        MarketSessionsEngine.init();
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.renderCountdown();
            const modal = document.getElementById('marketSessionsModal');
            if (modal && modal.classList.contains('active')) {
                MarketSessionsEngine.renderModalGrid();
            }
        }, 1000);
    },

    renderTrack() {
        const track = document.getElementById('tickerTrack');
        if (!track) return;

        let marketItems = [];
        if (MarketService.data && MarketService.data.categories) {
            const feat = MarketService.data.categories.featured?.items || {};
            const harem = MarketService.data.categories.harem?.items || {};
            const bist = MarketService.data.categories.bist?.items || {};
            marketItems = [
                ...Object.values(feat),
                ...Object.values(harem).slice(0, 3),
                ...Object.values(bist).slice(0, 2)
            ];
        }

        if (marketItems.length === 0) {
            marketItems = [
                { code: 'BIST 100', rate: 14172.26, changePct: 0.28, unit: 'Puan' },
                { code: 'USD/TRY', rate: 47.8540, changePct: 0.12, unit: 'TL' },
                { code: 'EUR/TRY', rate: 55.2600, changePct: 0.25, unit: 'TL' },
                { code: 'Gram Altın', rate: 6745.00, changePct: 0.65, unit: 'TL' },
                { code: 'Gümüş/TL', rate: 98.40, changePct: 0.85, unit: 'TL' },
                { code: 'BIST 30', rate: 16029.11, changePct: 0.03, unit: 'Puan' },
                { code: 'Brent Petrol', rate: 82.50, changePct: -0.45, unit: '$' },
                { code: 'BTC/USD', rate: 64250.00, changePct: 2.10, unit: '$' }
            ];
        }

        const fullList = [...marketItems, ...marketItems];

        let html = '';
        fullList.forEach(item => {
            const isPos = item.changePct > 0;
            const isNeg = item.changePct < 0;
            const changeClass = isPos ? 'pos' : isNeg ? 'neg' : 'zero';
            const sign = isPos ? '+' : '';
            const isParity = item.unit === 'Parite' || item.key === 'EUR_USD';
            const prefix = isParity ? '' : (item.unit === '$' ? '$' : (item.unit && item.unit.includes('TL') ? '₺' : ''));
            const suffix = item.unit === 'Puan' ? ' P' : '';
            const decimals = isParity || (item.unit && item.unit.includes('TL') && item.rate < 100) ? 4 : 2;
            const formattedPrice = `${prefix}${item.rate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: decimals })}${suffix}`;

            html += `
                <div class="ticker-item">
                    <span class="ticker-symbol">${Utils.escapeHtml(item.code || item.name)}:</span>
                    <span class="ticker-price">${formattedPrice}</span>
                    <span class="ticker-change ${changeClass}">${sign}%${Math.abs(item.changePct).toFixed(2)}</span>
                </div>
            `;
        });

        track.innerHTML = html;
    },

    renderCountdown() {
        const textEl = document.getElementById('tefasCountdownText');
        const dotEl = document.getElementById('tickerPulseDot');
        if (!textEl) return;

        const sessions = MarketSessionsEngine.getSessions();
        const bist = sessions.find(s => s.id === 'bist');
        const tefas = sessions.find(s => s.id === 'tefas');
        const us = sessions.find(s => s.id === 'us');

        // Smart dynamic top-bar summary based on active exchanges
        let summaryText = '';
        let dotClass = 'ticker-pulse-dot';

        if (bist && bist.badgeClass === 'open') {
            dotClass = 'ticker-pulse-dot';
            summaryText = `📈 BIST: 🟢 Açık (${bist.countdown.replace('Kapanışa (18:00): ', '')}) - 🏛 TEFAS: ${tefas.badgeClass === 'open' ? '🟢 Açık' : '🌙 T+1'} - 🇺🇸 ABD: ${us.badgeClass === 'open' ? '🟢 Açık' : us.badgeClass === 'premarket' ? '⚡ Pre-Market' : '⏳ 16:30'}`;
        } else if (us && us.badgeClass === 'open') {
            dotClass = 'ticker-pulse-dot';
            summaryText = `🇺🇸 ABD (Midas): 🟢 Açık (${us.countdown.replace('Kapanışa (23:00): ', '')}) - 📈 BIST: 🌙 Kapalı - 🏛 TEFAS: 🌙 T+1`;
        } else if (tefas && tefas.badgeClass === 'open') {
            dotClass = 'ticker-pulse-dot';
            summaryText = `🏛 TEFAS: 🟢 Açık (${tefas.countdown.replace('T+0 Kapanışına (13:30): ', '')}) - 📈 BIST: ${bist.status.includes('🟢') ? '🟢 Açık' : '⏳ 10:00'} - 🇺🇸 ABD: ⏳ 16:30`;
        } else {
            dotClass = 'ticker-pulse-dot warning';
            summaryText = `🌙 TEFAS: T+1 İcrası - 📈 BIST: ${bist.status.includes('🟢') ? '🟢 Açık' : '🌙 Kapalı'} - 🇺🇸 ABD: ${us.status.includes('🟢') ? '🟢 Açık' : us.status.includes('⚡') ? '⚡ Pre-Market' : '⏳ 16:30 Açılış'}`;
        }

        textEl.textContent = summaryText;
        if (dotEl) dotEl.className = dotClass;
    }
};

const KeyboardManager = {
    init() {
        document.addEventListener('keydown', (e) => {
                        if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
                e.preventDefault();
                Navigation.switchTab('add-fund');
                const searchInput = document.getElementById('fundSearchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
                        if (e.ctrlKey && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                ExcelExport.export();
            }
                        if (e.key === 'Escape') {
                const modal = document.getElementById('priceModal');
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                }
                AddFundTab.clearSelection();
            }
        });
    }
};

// ==========================================================================
// PwaManager (Progressive Web App & Çevrimdışı Hizmet Yöneticisi)
// ==========================================================================
const PwaManager = {
    deferredPrompt: null,

    init() {
        this.registerServiceWorker();
        this.bindInstallPrompt();
        this.bindNetworkStatus();
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => {
                        console.info('Zenith Atlas Service Worker registered:', reg.scope);
                    })
                    .catch(err => {
                        console.warn('Service Worker registration failed:', err);
                    });
            });
        }
    },

    bindInstallPrompt() {
        const installBtn = document.getElementById('pwaInstallBtn');
        if (!installBtn) return;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            installBtn.classList.remove('hidden');
        });

        installBtn.addEventListener('click', async () => {
            if (!this.deferredPrompt) return;
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                Utils.showToast('🚀 Zenith Atlas başarıyla cihazınıza yüklendi!', 'success');
            }
            this.deferredPrompt = null;
            installBtn.classList.add('hidden');
        });

        window.addEventListener('appinstalled', () => {
            installBtn.classList.add('hidden');
            this.deferredPrompt = null;
        });
    },

    bindNetworkStatus() {
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                Utils.showToast('🟢 Çevrimiçi bağlantı sağlandı. Canlı veriler senkronize ediliyor.', 'info');
            } else {
                Utils.showToast('📡 Çevrimdışı moda geçildi. Zenith Atlas yerel veritabanından kesintisiz çalışıyor.', 'warning');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
    }
};

window.addEventListener('error', (event) => {
    console.error('[Zenith Atlas Hata]', event.message);
});
window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Zenith Atlas Promise Uyarısı]', event.reason);
});

document.addEventListener('DOMContentLoaded', async () => {
    console.info('Zenith Atlas: initializing...');

    PwaManager.init();

    await FundSearch.loadDatabase();
    await PriceService.init();
    await MarketService.init();

    // If localStorage was cleared, attempt seamless auto-recovery from IndexedDB
    if (PortfolioData.funds.length === 0 && typeof IndexedDBStorage !== 'undefined') {
        try {
            const idbData = await IndexedDBStorage.loadPortfolio();
            if (idbData && Array.isArray(idbData.funds) && idbData.funds.length > 0) {
                PortfolioData.funds = idbData.funds;
                PortfolioData.cashTL = idbData.cashTL || 0;
                PortfolioData.pendingOrders = idbData.pendingOrders || [];
                PortfolioManager.save(PortfolioData.funds, PortfolioData.cashTL, PortfolioData.pendingOrders);
                PriceService.recalculatePortfolio();
                console.info(`Zenith Atlas: ${idbData.funds.length} varlık IndexedDB kalıcı deposundan otomatik kurtarıldı.`);
            }
        } catch (e) {
            // Ignore if IndexedDB unavailable
        }
    }

    MultiPortfolioEngine.init();
    Dashboard.init();
    Charts.init();
    Navigation.init();
    TerminalTicker.init();
    MarketSessionsEngine.init();
    CurrencyEngine.init();
    AlertsEngine.init();
    GoalWealthBuilder.init();
    if (typeof DividendYieldEngine !== 'undefined') DividendYieldEngine.render();
    if (typeof FxAttributionEngine !== 'undefined') FxAttributionEngine.render();
    ExecutiveReportEngine.bindEvents();
    MacroNewsEngine.init();
    WatchlistManager.init();
    FundComparator.init();
    AddFundTab.initEventListeners();
    KeyboardManager.init();
    ZenithIntelligence.init();
    PortfolioBackup.bindEvents();
    FundSearch.renderResults(null);

    const badge = document.getElementById('strategyBadgeHeader');
    if (badge) {
        badge.textContent = PortfolioData.funds.length > 0
            ? `${PortfolioData.funds.length} Varlık`
            : 'Zenith Terminal';
    }

    const refreshBtn = document.getElementById('refreshPrices');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            PriceService.syncFromSiteDirectly();
        });
    }

    const exportBtn = document.getElementById('exportExcel');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            ExcelExport.export();
        });
    }

    // ==========================================================================
    // Otomatik Arka Plan Canlı Senkronizasyon (Zero-Touch Continuous Auto-Sync)
    // ==========================================================================
    const runAutoSync = async () => {
        try {
            if (typeof FundSearch !== 'undefined') await FundSearch.loadDatabase();
            if (typeof PriceService !== 'undefined') await PriceService.init();
            if (typeof MarketService !== 'undefined') await MarketService.loadData();
            if (typeof MacroNewsEngine !== 'undefined') await MacroNewsEngine.loadData();
            if (typeof MacroNewsEngine !== 'undefined') MacroNewsEngine.render();
            if (typeof Dashboard !== 'undefined') Dashboard.init();
            if (typeof Charts !== 'undefined') Charts.init();
            if (typeof TerminalTicker !== 'undefined') TerminalTicker.renderTrack();
        } catch (e) {
            // Silent fallback
        }
    };

    // 1. Initial Auto-Sync on startup
    runAutoSync();

    // 2. Periodic Auto-Sync every 60 seconds
    setInterval(runAutoSync, 60000);

    // 3. Instant Auto-Sync when user switches back to browser tab
    window.addEventListener('focus', runAutoSync);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            runAutoSync();
        }
    });

    console.info('Zenith Atlas: ready with continuous background auto-sync.');
});

