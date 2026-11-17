/**
 * CryptoPulse - AJAX & Real-Time Market Service
 * Implements jQuery $.ajax integration, remote REST endpoints, offline caching,
 * resilient fallback simulation, live micro-tick engine, and polling timers.
 */
const ApiManager = (function() {
  'use strict';

  // Realistic seed market data for offline/fallback mode
  const SEED_ASSETS = [
    {
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      priceUsd: 94850.25,
      changePercent24Hr: 3.42,
      marketCapUsd: 1870500000000,
      volumeUsd24Hr: 48200000000,
      supply: 19780000,
      maxSupply: 21000000,
      high24h: 96200.00,
      low24h: 91400.50,
      rank: 1,
      sparkline: [91500, 92100, 91800, 93200, 92900, 94100, 93800, 95100, 94600, 94850]
    },
    {
      id: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      priceUsd: 3180.60,
      changePercent24Hr: -1.24,
      marketCapUsd: 382400000000,
      volumeUsd24Hr: 22400000000,
      supply: 120250000,
      maxSupply: null,
      high24h: 3255.00,
      low24h: 3120.10,
      rank: 2,
      sparkline: [3240, 3220, 3260, 3210, 3190, 3175, 3195, 3160, 3190, 3180]
    },
    {
      id: 'solana',
      symbol: 'SOL',
      name: 'Solana',
      priceUsd: 218.45,
      changePercent24Hr: 6.85,
      marketCapUsd: 102500000000,
      volumeUsd24Hr: 8900000000,
      supply: 469200000,
      maxSupply: null,
      high24h: 224.50,
      low24h: 202.80,
      rank: 3,
      sparkline: [204, 206, 210, 208, 214, 212, 217, 215, 221, 218.45]
    },
    {
      id: 'binance-coin',
      symbol: 'BNB',
      name: 'BNB',
      priceUsd: 642.10,
      changePercent24Hr: 0.95,
      marketCapUsd: 93500000000,
      volumeUsd24Hr: 1850000000,
      supply: 145800000,
      maxSupply: 200000000,
      high24h: 651.00,
      low24h: 635.40,
      rank: 4,
      sparkline: [636, 638, 642, 639, 645, 640, 641, 643, 640, 642.10]
    },
    {
      id: 'ripple',
      symbol: 'XRP',
      name: 'XRP',
      priceUsd: 1.15,
      changePercent24Hr: 14.28,
      marketCapUsd: 65400000000,
      volumeUsd24Hr: 7200000000,
      supply: 56900000000,
      maxSupply: 100000000000,
      high24h: 1.22,
      low24h: 0.98,
      rank: 5,
      sparkline: [0.99, 1.02, 1.05, 1.03, 1.09, 1.12, 1.10, 1.18, 1.13, 1.15]
    },
    {
      id: 'cardano',
      symbol: 'ADA',
      name: 'Cardano',
      priceUsd: 0.76,
      changePercent24Hr: -2.85,
      marketCapUsd: 26900000000,
      volumeUsd24Hr: 1450000000,
      supply: 35700000000,
      maxSupply: 45000000000,
      high24h: 0.81,
      low24h: 0.74,
      rank: 6,
      sparkline: [0.79, 0.80, 0.78, 0.77, 0.79, 0.76, 0.78, 0.75, 0.77, 0.76]
    },
    {
      id: 'dogecoin',
      symbol: 'DOGE',
      name: 'Dogecoin',
      priceUsd: 0.38,
      changePercent24Hr: 5.12,
      marketCapUsd: 55800000000,
      volumeUsd24Hr: 5800000000,
      supply: 146800000000,
      maxSupply: null,
      high24h: 0.41,
      low24h: 0.35,
      rank: 7,
      sparkline: [0.36, 0.37, 0.35, 0.38, 0.37, 0.39, 0.38, 0.40, 0.37, 0.38]
    },
    {
      id: 'avalanche-2',
      symbol: 'AVAX',
      name: 'Avalanche',
      priceUsd: 34.80,
      changePercent24Hr: 4.15,
      marketCapUsd: 14200000000,
      volumeUsd24Hr: 890000000,
      supply: 408000000,
      maxSupply: 720000000,
      high24h: 36.10,
      low24h: 33.20,
      rank: 8,
      sparkline: [33.4, 33.8, 34.2, 33.9, 34.5, 34.1, 35.0, 34.6, 35.2, 34.8]
    },
    {
      id: 'polkadot',
      symbol: 'DOT',
      name: 'Polkadot',
      priceUsd: 6.85,
      changePercent24Hr: -0.84,
      marketCapUsd: 9800000000,
      volumeUsd24Hr: 420000000,
      supply: 1430000000,
      maxSupply: null,
      high24h: 7.05,
      low24h: 6.70,
      rank: 9,
      sparkline: [6.92, 6.95, 6.88, 6.85, 6.90, 6.82, 6.88, 6.80, 6.86, 6.85]
    },
    {
      id: 'chainlink',
      symbol: 'LINK',
      name: 'Chainlink',
      priceUsd: 15.60,
      changePercent24Hr: 3.20,
      marketCapUsd: 9480000000,
      volumeUsd24Hr: 540000000,
      supply: 608000000,
      maxSupply: 1000000000,
      high24h: 16.10,
      low24h: 14.95,
      rank: 10,
      sparkline: [15.1, 15.2, 15.4, 15.3, 15.7, 15.5, 15.8, 15.4, 15.7, 15.6]
    },
    {
      id: 'polygon-ecosystem-token',
      symbol: 'POL',
      name: 'Polygon',
      priceUsd: 0.44,
      changePercent24Hr: -1.75,
      marketCapUsd: 3500000000,
      volumeUsd24Hr: 210000000,
      supply: 7960000000,
      maxSupply: 10000000000,
      high24h: 0.46,
      low24h: 0.43,
      rank: 11,
      sparkline: [0.45, 0.46, 0.45, 0.44, 0.45, 0.44, 0.45, 0.43, 0.45, 0.44]
    },
    {
      id: 'uniswap',
      symbol: 'UNI',
      name: 'Uniswap',
      priceUsd: 9.40,
      changePercent24Hr: 2.10,
      marketCapUsd: 5640000000,
      volumeUsd24Hr: 310000000,
      supply: 600000000,
      maxSupply: 1000000000,
      high24h: 9.75,
      low24h: 9.10,
      rank: 12,
      sparkline: [9.15, 9.20, 9.35, 9.28, 9.45, 9.32, 9.50, 9.38, 9.45, 9.40]
    }
  ];

  let currentAssets = JSON.parse(JSON.stringify(SEED_ASSETS));
  let isFetching = false;
  let pollingInterval = null;
  let countdownTimer = null;
  let tickInterval = null;
  let whaleInterval = null;

  let countdownSecondsLeft = 8;
  let totalCountdownPeriod = 8;
  let isAutoRefreshPaused = false;
  let dataSourceMode = 'Live Real-Time API';

  // Normalize CoinCap API Response
  function parseCoinCapData(apiResponse) {
    if (!apiResponse || !Array.isArray(apiResponse.data)) {
      throw new Error('Invalid CoinCap response schema');
    }

    return apiResponse.data.map(item => {
      const price = parseFloat(item.priceUsd) || 0;
      const change = parseFloat(item.changePercent24Hr) || 0;
      const rank = parseInt(item.rank, 10) || 99;

      // Find existing to preserve sparkline or generate realistic one
      const existing = currentAssets.find(a => a.id === item.id || a.symbol === item.symbol);
      let sparkline = existing ? [...existing.sparkline] : [];
      if (sparkline.length < 5) {
        sparkline = generateSparklineFromPrice(price, change);
      } else {
        sparkline.push(price);
        if (sparkline.length > 10) sparkline.shift();
      }

      return {
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        priceUsd: price,
        changePercent24Hr: change,
        marketCapUsd: parseFloat(item.marketCapUsd) || 0,
        volumeUsd24Hr: parseFloat(item.volumeUsd24Hr) || 0,
        supply: parseFloat(item.supply) || 0,
        maxSupply: item.maxSupply ? parseFloat(item.maxSupply) : null,
        high24h: existing ? Math.max(existing.high24h, price) : price * 1.04,
        low24h: existing ? Math.min(existing.low24h, price) : price * 0.96,
        rank: rank,
        sparkline: sparkline
      };
    });
  }

  // Normalize CoinGecko API Response
  function parseCoinGeckoData(apiResponse) {
    if (!Array.isArray(apiResponse)) {
      throw new Error('Invalid CoinGecko response schema');
    }

    return apiResponse.map(coin => ({
      id: coin.id,
      symbol: (coin.symbol || '').toUpperCase(),
      name: coin.name,
      priceUsd: coin.current_price,
      changePercent24Hr: coin.price_change_percentage_24h || 0,
      marketCapUsd: coin.market_cap || 0,
      volumeUsd24Hr: coin.total_volume || 0,
      supply: coin.circulating_supply || 0,
      maxSupply: coin.total_supply || null,
      high24h: coin.high_24h || coin.current_price * 1.03,
      low24h: coin.low_24h || coin.current_price * 0.97,
      rank: coin.market_cap_rank || 99,
      sparkline: (coin.sparkline_in_7d && coin.sparkline_in_7d.price) 
        ? coin.sparkline_in_7d.price.slice(-10) 
        : generateSparklineFromPrice(coin.current_price, coin.price_change_percentage_24h)
    }));
  }

  function generateSparklineFromPrice(basePrice, change24h) {
    const points = [];
    const isUp = change24h >= 0;
    const startPrice = basePrice * (1 - (change24h / 100));

    for (let i = 0; i < 10; i++) {
      const progress = i / 9;
      const trend = startPrice + ((basePrice - startPrice) * progress);
      const noise = (Math.random() - 0.5) * (basePrice * 0.015);
      points.push(Math.max(0.01, +(trend + noise).toFixed(2)));
    }
    points[9] = basePrice;
    return points;
  }

  return {
    /**
     * Executes the primary AJAX request to fetch live market data.
     * Demonstrates complete $.ajax lifecycle: beforeSend, success, error, complete.
     */
    fetchMarketData: function(isManual = false) {
      if (isFetching) return;
      isFetching = true;

      const self = this;
      const startTime = performance.now();

      // Trigger custom AJAX start event
      if (window.$ && typeof $(document).trigger === 'function') {
        $(document).trigger('ajax:start', { isManual });
      }

      // Primary live public API endpoint
      const primaryUrl = 'https://api.coincap.io/v2/assets?limit=25';

      $.ajax({
        url: primaryUrl,
        method: 'GET',
        dataType: 'json',
        timeout: 6000, // 6 second timeout
        beforeSend: function(xhr) {
          // jQuery AJAX Hook: executed right before sending
          $('#syncIndicator').addClass('spinning');
          $('#dataSourceLabel').text('Connecting to API...');
        },
        success: function(response) {
          // jQuery AJAX Success
          try {
            const parsed = parseCoinCapData(response);
            currentAssets = parsed;
            dataSourceMode = 'CoinCap REST API (Live)';

            // Persist to offline cache
            StorageManager.setCachedMarketData(parsed);

            self.onMarketDataReceived(parsed, performance.now() - startTime);
          } catch (err) {
            console.warn('[ApiManager] Parsing CoinCap response failed, trying fallback...', err);
            self.fetchFallbackCoinGecko(startTime);
          }
        },
        error: function(xhr, status, error) {
          // jQuery AJAX Error: gracefully fall back to CoinGecko or offline cached / simulation
          console.info(`[ApiManager] CoinCap error (${status}): ${error}. Initiating fallback mechanism...`);
          self.fetchFallbackCoinGecko(startTime);
        },
        complete: function(xhr, status) {
          // jQuery AJAX Complete
          isFetching = false;
          $('#syncIndicator').removeClass('spinning');
          self.resetCountdown();

          if (window.$ && typeof $(document).trigger === 'function') {
            $(document).trigger('ajax:complete', { status });
          }
        }
      });
    },

    /**
     * Secondary AJAX Fallback (CoinGecko public markets endpoint)
     */
    fetchFallbackCoinGecko: function(startTime) {
      const self = this;
      const fallbackUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true';

      $.ajax({
        url: fallbackUrl,
        method: 'GET',
        dataType: 'json',
        timeout: 5000,
        success: function(response) {
          try {
            const parsed = parseCoinGeckoData(response);
            currentAssets = parsed;
            dataSourceMode = 'CoinGecko REST API (Live)';
            StorageManager.setCachedMarketData(parsed);
            self.onMarketDataReceived(parsed, performance.now() - startTime);
          } catch (e) {
            self.handleOfflineOrSimulatedMode();
          }
        },
        error: function() {
          self.handleOfflineOrSimulatedMode();
        }
      });
    },

    /**
     * Resilient offline mode: reads from LocalStorage cache or uses seed data with live simulated ticks
     */
    handleOfflineOrSimulatedMode: function() {
      const cached = StorageManager.getCachedMarketData();
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        currentAssets = cached.data;
        const cacheAgeMin = Math.round((Date.now() - cached.timestamp) / 60000);
        dataSourceMode = `Offline Cache (${cacheAgeMin}m ago) + Real-Time Engine`;
      } else {
        dataSourceMode = 'Real-Time Simulation Engine';
      }

      this.onMarketDataReceived(currentAssets, 50);
    },

    /**
     * Processes normalized market assets, checks alerts, and dispatches event
     */
    onMarketDataReceived: function(assets, durationMs) {
      // Check active price alerts against new prices
      this.checkPriceAlerts(assets);

      if (window.$ && typeof $(document).trigger === 'function') {
        $(document).trigger('market:updated', {
          assets: assets,
          dataSource: dataSourceMode,
          durationMs: Math.round(durationMs),
          timestamp: Date.now()
        });
      }
    },

    /**
     * Real-Time Micro-Tick Engine:
     * Simulates live high-frequency orderbook ticks between AJAX polling cycles
     */
    startMicroTickEngine: function() {
      if (tickInterval) clearInterval(tickInterval);

      const self = this;
      tickInterval = setInterval(function() {
        if (!currentAssets || currentAssets.length === 0) return;

        // Pick 1 to 2 random coins to tick
        const numTicks = Math.random() > 0.4 ? 1 : 2;

        for (let i = 0; i < numTicks; i++) {
          const randomIndex = Math.floor(Math.random() * Math.min(10, currentAssets.length));
          const coin = currentAssets[randomIndex];
          if (!coin) continue;

          const oldPrice = coin.priceUsd;
          // Micro-volatility between -0.15% and +0.16%
          const pctDelta = (Math.random() * 0.31) - 0.15;
          const deltaPrice = oldPrice * (pctDelta / 100);
          const newPrice = Math.max(0.0001, +(oldPrice + deltaPrice).toFixed(coin.priceUsd > 10 ? 2 : 4));

          coin.priceUsd = newPrice;
          coin.changePercent24Hr = +(coin.changePercent24Hr + (pctDelta * 0.2)).toFixed(2);
          coin.high24h = Math.max(coin.high24h, newPrice);
          coin.low24h = Math.min(coin.low24h, newPrice);

          // Update sparkline tail
          if (coin.sparkline && coin.sparkline.length > 0) {
            coin.sparkline[coin.sparkline.length - 1] = newPrice;
          }

          const direction = newPrice >= oldPrice ? 'up' : 'down';

          // Fire real-time micro-tick event
          if (window.$ && typeof $(document).trigger === 'function') {
            $(document).trigger('market:tick', {
              coinId: coin.id,
              coinSymbol: coin.symbol,
              oldPrice: oldPrice,
              newPrice: newPrice,
              direction: direction
            });
          }

          // Check alerts for this coin
          self.checkSingleCoinAlert(coin);
        }
      }, 1600); // every 1.6 seconds for pleasant real-time responsiveness
    },

    /**
     * Real-Time Live Whale & Transaction Stream Simulator
     */
    startWhaleStream: function() {
      if (whaleInterval) clearInterval(whaleInterval);

      const exchanges = ['Binance', 'Coinbase', 'Kraken', 'Uniswap DEX', 'Bybit'];
      const actions = ['BUY', 'SELL'];

      whaleInterval = setInterval(function() {
        if (!currentAssets || currentAssets.length === 0) return;

        const coin = currentAssets[Math.floor(Math.random() * Math.min(8, currentAssets.length))];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];

        // Generate realistic transaction volume
        const usdValue = Math.floor(Math.random() * 450000) + 25000;
        const coinAmount = +(usdValue / coin.priceUsd).toFixed(coin.priceUsd > 100 ? 2 : 1);

        const tradeEvent = {
          id: 'trade_' + Date.now(),
          coinId: coin.id,
          symbol: coin.symbol,
          action: action,
          amount: coinAmount,
          priceUsd: coin.priceUsd,
          totalUsd: usdValue,
          exchange: exchange,
          timestamp: Date.now()
        };

        if (window.$ && typeof $(document).trigger === 'function') {
          $(document).trigger('whale:trade', [tradeEvent]);
        }
      }, 4200); // new simulated live trade every 4.2 seconds
    },

    /**
     * Checks if current market prices trigger any user configured price alerts
     */
    checkPriceAlerts: function(assets) {
      const alerts = StorageManager.getAlerts();
      const untriggered = alerts.filter(a => !a.triggered);
      if (untriggered.length === 0) return;

      untriggered.forEach(alert => {
        const coin = assets.find(c => c.id === alert.coinId || c.symbol === alert.coinSymbol);
        if (coin) {
          this.evaluateAlert(alert, coin);
        }
      });
    },

    checkSingleCoinAlert: function(coin) {
      const alerts = StorageManager.getAlerts();
      const matched = alerts.filter(a => !a.triggered && (a.coinId === coin.id || a.coinSymbol === coin.symbol));
      matched.forEach(alert => {
        this.evaluateAlert(alert, coin);
      });
    },

    evaluateAlert: function(alert, coin) {
      let conditionMet = false;
      if (alert.condition === 'above' && coin.priceUsd >= alert.targetPrice) {
        conditionMet = true;
      } else if (alert.condition === 'below' && coin.priceUsd <= alert.targetPrice) {
        conditionMet = true;
      }

      if (conditionMet) {
        StorageManager.markAlertTriggered(alert.id);
        if (window.$ && typeof $(document).trigger === 'function') {
          $(document).trigger('alert:triggered', {
            alert: alert,
            currentPrice: coin.priceUsd
          });
        }
      }
    },

    /**
     * Polling Controller and Countdown Timer
     */
    startPolling: function(intervalSec = 8) {
      this.stopPolling();
      totalCountdownPeriod = intervalSec;
      countdownSecondsLeft = intervalSec;

      const self = this;

      // Primary interval
      pollingInterval = setInterval(function() {
        if (!isAutoRefreshPaused) {
          self.fetchMarketData();
        }
      }, intervalSec * 1000);

      // Smooth countdown progress ticker (runs every 100ms)
      countdownTimer = setInterval(function() {
        if (isAutoRefreshPaused || isFetching) return;

        countdownSecondsLeft -= 0.1;
        if (countdownSecondsLeft < 0) {
          countdownSecondsLeft = totalCountdownPeriod;
        }

        const pct = Math.max(0, Math.min(100, (countdownSecondsLeft / totalCountdownPeriod) * 100));

        // Update UI countdown
        $('#countdownBar').css('width', pct + '%');
        $('#countdownText').text(Math.ceil(countdownSecondsLeft) + 's');
      }, 100);

      this.startMicroTickEngine();
      this.startWhaleStream();
    },

    stopPolling: function() {
      if (pollingInterval) clearInterval(pollingInterval);
      if (countdownTimer) clearInterval(countdownTimer);
      if (tickInterval) clearInterval(tickInterval);
      if (whaleInterval) clearInterval(whaleInterval);
      pollingInterval = null;
      countdownTimer = null;
      tickInterval = null;
      whaleInterval = null;
    },

    resetCountdown: function() {
      countdownSecondsLeft = totalCountdownPeriod;
      $('#countdownBar').css('width', '100%');
      $('#countdownText').text(totalCountdownPeriod + 's');
    },

    togglePause: function() {
      isAutoRefreshPaused = !isAutoRefreshPaused;
      return isAutoRefreshPaused;
    },

    isPaused: function() {
      return isAutoRefreshPaused;
    },

    getAssets: function() {
      return currentAssets;
    },

    getAssetById: function(id) {
      return currentAssets.find(a => a.id === id || a.symbol.toLowerCase() === id.toLowerCase());
    },

    getDataSourceMode: function() {
      return dataSourceMode;
    }
  };
})();
