/**
 * CryptoPulse - Web Storage Manager
 * Encapsulates LocalStorage, SessionStorage, default seed states, schema validation,
 * and Multi-Tab Synchronization via the HTML5 'storage' event.
 */
const StorageManager = (function() {
  'use strict';

  const KEYS = {
    PORTFOLIO: 'cryptopulse_portfolio_v1',
    WATCHLIST: 'cryptopulse_watchlist_v1',
    ALERTS: 'cryptopulse_alerts_v1',
    SETTINGS: 'cryptopulse_settings_v1',
    MARKET_CACHE: 'cryptopulse_market_cache_v1'
  };

  const DEFAULT_SETTINGS = {
    theme: 'dark',
    sound: true,
    refreshInterval: 8, // seconds
    isAutoRefresh: true,
    viewMode: 'grid', // 'grid' or 'table'
    currency: 'USD'
  };

  const DEFAULT_WATCHLIST = ['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano'];

  const INITIAL_PORTFOLIO = {
    cashBalance: 100000.00, // $100k demo paper trading funds
    holdings: {
      bitcoin: {
        symbol: 'BTC',
        name: 'Bitcoin',
        amount: 0.75,
        totalCostUsd: 65000.00,
        averageBuyPrice: 86666.67
      },
      ethereum: {
        symbol: 'ETH',
        name: 'Ethereum',
        amount: 5.2,
        totalCostUsd: 16000.00,
        averageBuyPrice: 3076.92
      },
      solana: {
        symbol: 'SOL',
        name: 'Solana',
        amount: 35.0,
        totalCostUsd: 7000.00,
        averageBuyPrice: 200.00
      }
    },
    transactions: [
      {
        id: 'tx_init_1',
        type: 'BUY',
        coinId: 'bitcoin',
        coinSymbol: 'BTC',
        coinName: 'Bitcoin',
        amount: 0.75,
        priceUsd: 86666.67,
        totalUsd: 65000.00,
        feeUsd: 65.00,
        timestamp: Date.now() - (86400000 * 2) // 2 days ago
      },
      {
        id: 'tx_init_2',
        type: 'BUY',
        coinId: 'ethereum',
        coinSymbol: 'ETH',
        coinName: 'Ethereum',
        amount: 5.2,
        priceUsd: 3076.92,
        totalUsd: 16000.00,
        feeUsd: 16.00,
        timestamp: Date.now() - (86400000 * 1.5)
      },
      {
        id: 'tx_init_3',
        type: 'BUY',
        coinId: 'solana',
        coinSymbol: 'SOL',
        coinName: 'Solana',
        amount: 35.0,
        priceUsd: 200.00,
        totalUsd: 7000.00,
        feeUsd: 7.00,
        timestamp: Date.now() - 86400000
      }
    ]
  };

  const DEFAULT_ALERTS = [
    {
      id: 'alert_demo_1',
      coinId: 'bitcoin',
      coinSymbol: 'BTC',
      targetPrice: 105000,
      condition: 'above',
      createdPrice: 94500,
      createdAt: Date.now() - 3600000,
      triggered: false
    },
    {
      id: 'alert_demo_2',
      coinId: 'ethereum',
      coinSymbol: 'ETH',
      targetPrice: 3000,
      condition: 'below',
      createdPrice: 3180,
      createdAt: Date.now() - 7200000,
      triggered: false
    }
  ];

  // Helper safe getItem
  function get(key, defaultValue) {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null || stored === undefined) {
        return defaultValue;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.warn(`[StorageManager] Failed to read key "${key}":`, e);
      return defaultValue;
    }
  }

  // Helper safe setItem
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[StorageManager] Failed to write key "${key}":`, e);
      return false;
    }
  }

  // Multi-tab sync setup
  function initMultiTabSync() {
    window.addEventListener('storage', function(e) {
      if (!e.key || !Object.values(KEYS).includes(e.key)) return;

      console.info(`[StorageManager] Multi-tab sync detected for "${e.key}"`);

      // Dispatch jQuery custom event if jQuery is loaded
      if (window.$ && typeof $(document).trigger === 'function') {
        $(document).trigger('storage:synced', {
          key: e.key,
          oldValue: e.oldValue,
          newValue: e.newValue
        });
      }
    });
  }

  // Auto initialize sync listener
  initMultiTabSync();

  return {
    KEYS,

    // ==========================================
    // PORTFOLIO OPERATIONS
    // ==========================================
    getPortfolio: function() {
      const p = get(KEYS.PORTFOLIO, null);
      if (!p || typeof p.cashBalance !== 'number') {
        set(KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
        return JSON.parse(JSON.stringify(INITIAL_PORTFOLIO));
      }
      return p;
    },

    savePortfolio: function(portfolio) {
      const success = set(KEYS.PORTFOLIO, portfolio);
      if (success && window.$ && typeof $(document).trigger === 'function') {
        $(document).trigger('portfolio:updated', [portfolio]);
      }
      return success;
    },

    buyAsset: function(coinId, symbol, name, amount, pricePerCoin) {
      const portfolio = this.getPortfolio();
      const grossCost = amount * pricePerCoin;
      const fee = grossCost * 0.001; // 0.1% paper trading commission
      const totalCost = grossCost + fee;

      if (portfolio.cashBalance < totalCost) {
        return {
          success: false,
          error: `Insufficient cash balance. Required: $${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Available: $${portfolio.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        };
      }

      // Deduct cash
      portfolio.cashBalance -= totalCost;

      // Update holdings
      if (!portfolio.holdings[coinId]) {
        portfolio.holdings[coinId] = {
          symbol: symbol.toUpperCase(),
          name: name,
          amount: amount,
          totalCostUsd: totalCost,
          averageBuyPrice: pricePerCoin
        };
      } else {
        const existing = portfolio.holdings[coinId];
        const newAmount = existing.amount + amount;
        const newTotalCost = existing.totalCostUsd + totalCost;
        existing.amount = newAmount;
        existing.totalCostUsd = newTotalCost;
        existing.averageBuyPrice = newTotalCost / newAmount;
      }

      // Append transaction
      const tx = {
        id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type: 'BUY',
        coinId,
        coinSymbol: symbol.toUpperCase(),
        coinName: name,
        amount,
        priceUsd: pricePerCoin,
        totalUsd: totalCost,
        feeUsd: fee,
        timestamp: Date.now()
      };

      portfolio.transactions.unshift(tx);
      this.savePortfolio(portfolio);

      return {
        success: true,
        transaction: tx,
        portfolio
      };
    },

    sellAsset: function(coinId, symbol, name, amount, pricePerCoin) {
      const portfolio = this.getPortfolio();
      const holding = portfolio.holdings[coinId];

      if (!holding || holding.amount < amount) {
        const currentHeld = holding ? holding.amount : 0;
        return {
          success: false,
          error: `Insufficient ${symbol.toUpperCase()} holdings. You hold: ${currentHeld}, Attempted to sell: ${amount}`
        };
      }

      const grossReturn = amount * pricePerCoin;
      const fee = grossReturn * 0.001;
      const netCashGain = grossReturn - fee;

      // Credit cash
      portfolio.cashBalance += netCashGain;

      // Reduce holding
      holding.amount -= amount;
      if (holding.amount <= 0.000001) {
        delete portfolio.holdings[coinId];
      } else {
        // Adjust cost basis proportionately
        holding.totalCostUsd = holding.amount * holding.averageBuyPrice;
      }

      // Append transaction
      const tx = {
        id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type: 'SELL',
        coinId,
        coinSymbol: symbol.toUpperCase(),
        coinName: name,
        amount,
        priceUsd: pricePerCoin,
        totalUsd: netCashGain,
        feeUsd: fee,
        timestamp: Date.now()
      };

      portfolio.transactions.unshift(tx);
      this.savePortfolio(portfolio);

      return {
        success: true,
        transaction: tx,
        portfolio
      };
    },

    deleteTransaction: function(txId) {
      const portfolio = this.getPortfolio();
      const prevLength = portfolio.transactions.length;
      portfolio.transactions = portfolio.transactions.filter(t => t.id !== txId);
      if (portfolio.transactions.length !== prevLength) {
        this.savePortfolio(portfolio);
        return true;
      }
      return false;
    },

    // ==========================================
    // WATCHLIST OPERATIONS
    // ==========================================
    getWatchlist: function() {
      return get(KEYS.WATCHLIST, DEFAULT_WATCHLIST);
    },

    toggleWatchlist: function(coinId) {
      const list = this.getWatchlist();
      const index = list.indexOf(coinId);
      let isAdded = false;

      if (index > -1) {
        list.splice(index, 1);
        isAdded = false;
      } else {
        list.push(coinId);
        isAdded = true;
      }

      set(KEYS.WATCHLIST, list);

      if (window.$ && typeof $(document).trigger === 'function') {
        $(document).trigger('watchlist:changed', { coinId, isAdded, watchlist: list });
      }

      return { isAdded, watchlist: list };
    },

    isWatchlisted: function(coinId) {
      return this.getWatchlist().includes(coinId);
    },

    // ==========================================
    // PRICE ALERTS OPERATIONS
    // ==========================================
    getAlerts: function() {
      return get(KEYS.ALERTS, DEFAULT_ALERTS);
    },

    addAlert: function(alertData) {
      const alerts = this.getAlerts();
      const newAlert = {
        id: 'alt_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        coinId: alertData.coinId,
        coinSymbol: alertData.coinSymbol.toUpperCase(),
        targetPrice: parseFloat(alertData.targetPrice),
        condition: alertData.condition || 'above', // 'above' or 'below'
        createdPrice: parseFloat(alertData.createdPrice) || 0,
        createdAt: Date.now(),
        triggered: false
      };

      alerts.unshift(newAlert);
      set(KEYS.ALERTS, alerts);

      if (window.$ && typeof $(document).trigger === 'function') {
        $(document).trigger('alerts:updated', [alerts]);
      }

      return newAlert;
    },

    removeAlert: function(alertId) {
      let alerts = this.getAlerts();
      alerts = alerts.filter(a => a.id !== alertId);
      set(KEYS.ALERTS, alerts);

      if (window.$ && typeof $(document).trigger === 'function') {
        $(document).trigger('alerts:updated', [alerts]);
      }

      return alerts;
    },

    markAlertTriggered: function(alertId) {
      const alerts = this.getAlerts();
      const target = alerts.find(a => a.id === alertId);
      if (target && !target.triggered) {
        target.triggered = true;
        target.triggeredAt = Date.now();
        set(KEYS.ALERTS, alerts);
        if (window.$ && typeof $(document).trigger === 'function') {
          $(document).trigger('alerts:updated', [alerts]);
        }
      }
    },

    // ==========================================
    // SETTINGS OPERATIONS
    // ==========================================
    getSettings: function() {
      return Object.assign({}, DEFAULT_SETTINGS, get(KEYS.SETTINGS, {}));
    },

    saveSettings: function(newSettings) {
      const current = this.getSettings();
      const merged = Object.assign({}, current, newSettings);
      set(KEYS.SETTINGS, merged);

      if (window.$ && typeof $(document).trigger === 'function') {
        $(document).trigger('settings:updated', [merged]);
      }

      return merged;
    },

    // ==========================================
    // MARKET CACHE OPERATIONS (Offline Fallback)
    // ==========================================
    getCachedMarketData: function() {
      return get(KEYS.MARKET_CACHE, null);
    },

    setCachedMarketData: function(data) {
      const payload = {
        timestamp: Date.now(),
        data: data
      };
      set(KEYS.MARKET_CACHE, payload);
    },

    // ==========================================
    // DATA EXPORT / IMPORT / RESET
    // ==========================================
    exportAllData: function() {
      const dataPackage = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        portfolio: this.getPortfolio(),
        watchlist: this.getWatchlist(),
        alerts: this.getAlerts(),
        settings: this.getSettings()
      };

      const jsonStr = JSON.stringify(dataPackage, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `cryptopulse_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    importAllData: function(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON structure.');
        }

        if (parsed.portfolio) set(KEYS.PORTFOLIO, parsed.portfolio);
        if (Array.isArray(parsed.watchlist)) set(KEYS.WATCHLIST, parsed.watchlist);
        if (Array.isArray(parsed.alerts)) set(KEYS.ALERTS, parsed.alerts);
        if (parsed.settings) set(KEYS.SETTINGS, parsed.settings);

        if (window.$ && typeof $(document).trigger === 'function') {
          $(document).trigger('data:imported');
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    resetToDefaults: function() {
      localStorage.removeItem(KEYS.PORTFOLIO);
      localStorage.removeItem(KEYS.WATCHLIST);
      localStorage.removeItem(KEYS.ALERTS);
      localStorage.removeItem(KEYS.SETTINGS);
      localStorage.removeItem(KEYS.MARKET_CACHE);

      set(KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
      set(KEYS.WATCHLIST, DEFAULT_WATCHLIST);
      set(KEYS.ALERTS, DEFAULT_ALERTS);
      set(KEYS.SETTINGS, DEFAULT_SETTINGS);

      if (window.$ && typeof $(document).trigger === 'function') {
        $(document).trigger('data:reset');
      }
    }
  };
})();
