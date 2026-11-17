/**
 * CryptoPulse - UI Rendering & DOM Manipulation Engine
 * Handles dynamic element generation, jQuery animations, view switches,
 * modal dialogs, and real-time visual highlight flashes.
 */
const UIManager = (function() {
  'use strict';

  // Helper number formatters
  function formatCurrency(val) {
    if (val === undefined || val === null || isNaN(val)) return '$0.00';
    if (val >= 1000) {
      return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (val >= 1) {
      return '$' + val.toFixed(2);
    } else if (val >= 0.001) {
      return '$' + val.toFixed(4);
    } else {
      return '$' + val.toFixed(6);
    }
  }

  function formatLargeNumber(num) {
    if (!num || isNaN(num)) return '$0';
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
  }

  function formatPercent(pct) {
    if (pct === undefined || pct === null || isNaN(pct)) return '0.00%';
    const sign = pct >= 0 ? '+' : '';
    return sign + pct.toFixed(2) + '%';
  }

  function formatRelativeTime(timestamp) {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  return {
    formatCurrency,
    formatLargeNumber,
    formatPercent,
    formatRelativeTime,

    /**
     * Updates Global Header Metrics Bar
     */
    renderHeaderMetrics: function(assets) {
      if (!assets || assets.length === 0) return;

      const totalMarketCap = assets.reduce((acc, c) => acc + (c.marketCapUsd || 0), 0);
      const totalVolume = assets.reduce((acc, c) => acc + (c.volumeUsd24Hr || 0), 0);

      const btc = assets.find(a => a.symbol === 'BTC');
      const btcDominance = btc && totalMarketCap > 0 
        ? ((btc.marketCapUsd / totalMarketCap) * 100).toFixed(1) + '%' 
        : '56.4%';

      // Top Gainer
      const sortedByGain = [...assets].sort((a, b) => b.changePercent24Hr - a.changePercent24Hr);
      const topGainer = sortedByGain[0];

      $('#metricTotalMarketCap').text(formatLargeNumber(totalMarketCap));
      $('#metric24hVolume').text(formatLargeNumber(totalVolume));
      $('#metricBtcDominance').text(btcDominance);
      if (topGainer) {
        $('#metricTopGainer').html(`
          <span class="font-medium">${topGainer.symbol}</span>
          <span class="badge badge-success">${formatPercent(topGainer.changePercent24Hr)}</span>
        `);
      }
    },

    /**
     * Renders the continuous Marquee Ticker Tape at the top
     */
    renderMarquee: function(assets) {
      const $track = $('#marqueeTrack');
      if ($track.length === 0 || !assets || assets.length === 0) return;

      // Duplicate list for seamless infinite scroll
      const items = [...assets.slice(0, 10), ...assets.slice(0, 10)];
      const html = items.map(coin => {
        const isUp = coin.changePercent24Hr >= 0;
        const colorClass = isUp ? 'text-success' : 'text-danger';
        const sign = isUp ? '▲' : '▼';
        return `
          <div class="ticker-item" data-ticker-id="${coin.id}">
            <span class="ticker-symbol font-bold">${coin.symbol}</span>
            <span class="ticker-price price-val" data-price="${coin.priceUsd}">${formatCurrency(coin.priceUsd)}</span>
            <span class="ticker-change ${colorClass}">${sign} ${formatPercent(coin.changePercent24Hr)}</span>
          </div>
        `;
      }).join('');

      $track.html(html);
    },

    /**
     * Renders Market Assets in Grid Card View
     */
    renderMarketGrid: function(assets) {
      const $container = $('#marketGrid');
      if ($container.length === 0) return;

      if (!assets || assets.length === 0) {
        $container.html(`
          <div class="empty-state card">
            <div class="empty-icon">🔍</div>
            <h3>No assets match your search</h3>
            <p>Try searching for a different cryptocurrency or clear filters.</p>
          </div>
        `);
        return;
      }

      const watchlist = StorageManager.getWatchlist();

      const html = assets.map(coin => {
        const isUp = coin.changePercent24Hr >= 0;
        const badgeCls = isUp ? 'badge-success' : 'badge-danger';
        const isFav = watchlist.includes(coin.id);

        return `
          <div class="market-card card" data-coin-id="${coin.id}">
            <div class="card-header">
              <div class="coin-info">
                <span class="coin-rank">#${coin.rank}</span>
                <div class="coin-titles">
                  <h4 class="coin-name">${coin.name}</h4>
                  <span class="coin-symbol">${coin.symbol}</span>
                </div>
              </div>
              <button class="btn-icon btn-favorite ${isFav ? 'active' : ''}" data-id="${coin.id}" title="${isFav ? 'Remove from Watchlist' : 'Add to Watchlist'}">
                ${isFav ? '★' : '☆'}
              </button>
            </div>

            <div class="card-body">
              <div class="price-row">
                <div class="price-container">
                  <span class="price-label">Price</span>
                  <div class="price-display font-bold price-val" data-price="${coin.priceUsd}">${formatCurrency(coin.priceUsd)}</div>
                </div>
                <div class="change-container text-right">
                  <span class="price-label">24h Change</span>
                  <span class="badge ${badgeCls}">${formatPercent(coin.changePercent24Hr)}</span>
                </div>
              </div>

              <!-- Sparkline Canvas -->
              <div class="sparkline-wrapper">
                <canvas class="sparkline-canvas" width="260" height="48" data-coin-id="${coin.id}"></canvas>
              </div>

              <div class="card-stats">
                <div class="stat-item">
                  <span class="stat-label">Market Cap</span>
                  <span class="stat-value font-medium">${formatLargeNumber(coin.marketCapUsd)}</span>
                </div>
                <div class="stat-item text-right">
                  <span class="stat-label">24h Volume</span>
                  <span class="stat-value font-medium">${formatLargeNumber(coin.volumeUsd24Hr)}</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button class="btn btn-sm btn-outline btn-details" data-id="${coin.id}">Details</button>
              <button class="btn btn-sm btn-outline btn-alert-open" data-id="${coin.id}" title="Set Price Alert">🔔 Alert</button>
              <button class="btn btn-sm btn-primary btn-trade-open" data-id="${coin.id}" data-mode="buy">Trade</button>
            </div>
          </div>
        `;
      }).join('');

      $container.html(html);

      // Render sparklines on the freshly appended canvas elements
      assets.forEach(coin => {
        const canvas = $container.find(`canvas[data-coin-id="${coin.id}"]`)[0];
        if (canvas && coin.sparkline) {
          ChartRenderer.renderSparkline(canvas, coin.sparkline, coin.changePercent24Hr >= 0);
        }
      });
    },

    /**
     * Renders Market Assets in Table List View
     */
    renderMarketTable: function(assets) {
      const $tbody = $('#marketTableBody');
      if ($tbody.length === 0) return;

      if (!assets || assets.length === 0) {
        $tbody.html(`
          <tr>
            <td colspan="8" class="text-center py-6 text-muted">
              No cryptocurrencies match your criteria.
            </td>
          </tr>
        `);
        return;
      }

      const watchlist = StorageManager.getWatchlist();

      const html = assets.map(coin => {
        const isUp = coin.changePercent24Hr >= 0;
        const badgeCls = isUp ? 'badge-success' : 'badge-danger';
        const isFav = watchlist.includes(coin.id);

        return `
          <tr data-coin-id="${coin.id}">
            <td class="text-center">
              <button class="btn-icon btn-favorite ${isFav ? 'active' : ''}" data-id="${coin.id}">
                ${isFav ? '★' : '☆'}
              </button>
            </td>
            <td class="font-medium text-muted">#${coin.rank}</td>
            <td>
              <div class="table-coin-cell">
                <div class="coin-names">
                  <span class="font-bold">${coin.name}</span>
                  <span class="text-muted text-sm">${coin.symbol}</span>
                </div>
              </div>
            </td>
            <td class="font-bold price-val" data-price="${coin.priceUsd}">${formatCurrency(coin.priceUsd)}</td>
            <td>
              <span class="badge ${badgeCls}">${formatPercent(coin.changePercent24Hr)}</span>
            </td>
            <td>
              <div class="table-sparkline-box">
                <canvas class="table-sparkline" width="100" height="28" data-coin-id="${coin.id}"></canvas>
              </div>
            </td>
            <td class="font-medium">${formatLargeNumber(coin.marketCapUsd)}</td>
            <td class="text-right">
              <div class="action-btn-group">
                <button class="btn btn-xs btn-outline btn-details" data-id="${coin.id}">Chart</button>
                <button class="btn btn-xs btn-primary btn-trade-open" data-id="${coin.id}" data-mode="buy">Trade</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      $tbody.html(html);

      // Render sparklines
      assets.forEach(coin => {
        const canvas = $tbody.find(`canvas[data-coin-id="${coin.id}"]`)[0];
        if (canvas && coin.sparkline) {
          ChartRenderer.renderSparkline(canvas, coin.sparkline, coin.changePercent24Hr >= 0);
        }
      });
    },

    /**
     * Renders Watchlist View
     */
    renderWatchlist: function(allAssets) {
      const $container = $('#watchlistContainer');
      if ($container.length === 0) return;

      const watchlistIds = StorageManager.getWatchlist();
      const filtered = allAssets.filter(a => watchlistIds.includes(a.id));

      if (filtered.length === 0) {
        $container.html(`
          <div class="empty-state card">
            <div class="empty-icon">⭐</div>
            <h3>Your Watchlist is empty</h3>
            <p>Click the star icon (☆) on any cryptocurrency in the Markets tab to track it here in real-time.</p>
          </div>
        `);
        return;
      }

      // Re-use grid card renderer inside watchlist container
      const html = filtered.map(coin => {
        const isUp = coin.changePercent24Hr >= 0;
        const badgeCls = isUp ? 'badge-success' : 'badge-danger';

        return `
          <div class="market-card card" data-coin-id="${coin.id}">
            <div class="card-header">
              <div class="coin-info">
                <span class="coin-rank">#${coin.rank}</span>
                <div class="coin-titles">
                  <h4 class="coin-name">${coin.name}</h4>
                  <span class="coin-symbol">${coin.symbol}</span>
                </div>
              </div>
              <button class="btn-icon btn-favorite active" data-id="${coin.id}" title="Remove from Watchlist">
                ★
              </button>
            </div>
            <div class="card-body">
              <div class="price-row">
                <div>
                  <span class="price-label">Price</span>
                  <div class="price-display font-bold price-val" data-price="${coin.priceUsd}">${formatCurrency(coin.priceUsd)}</div>
                </div>
                <div class="text-right">
                  <span class="price-label">24h Change</span>
                  <span class="badge ${badgeCls}">${formatPercent(coin.changePercent24Hr)}</span>
                </div>
              </div>
              <div class="sparkline-wrapper">
                <canvas class="sparkline-canvas" width="260" height="48" data-coin-id="${coin.id}"></canvas>
              </div>
            </div>
            <div class="card-footer">
              <button class="btn btn-sm btn-outline btn-details" data-id="${coin.id}">Details</button>
              <button class="btn btn-sm btn-outline btn-alert-open" data-id="${coin.id}">🔔 Alert</button>
              <button class="btn btn-sm btn-primary btn-trade-open" data-id="${coin.id}" data-mode="buy">Trade</button>
            </div>
          </div>
        `;
      }).join('');

      $container.html(html);

      filtered.forEach(coin => {
        const canvas = $container.find(`canvas[data-coin-id="${coin.id}"]`)[0];
        if (canvas && coin.sparkline) {
          ChartRenderer.renderSparkline(canvas, coin.sparkline, coin.changePercent24Hr >= 0);
        }
      });
    },

    /**
     * Renders Portfolio Overview, Holdings, and Calculations
     */
    renderPortfolio: function(assets) {
      const portfolio = StorageManager.getPortfolio();
      let totalHoldingsValue = 0;
      let totalCostBasis = 0;
      const holdingsList = [];
      const donutSlices = [];

      for (let coinId in portfolio.holdings) {
        const holding = portfolio.holdings[coinId];
        const currentCoin = assets.find(a => a.id === coinId || a.symbol === holding.symbol);
        const currentPrice = currentCoin ? currentCoin.priceUsd : holding.averageBuyPrice;
        const currentValue = holding.amount * currentPrice;
        const pnlUsd = currentValue - holding.totalCostUsd;
        const pnlPct = holding.totalCostUsd > 0 ? (pnlUsd / holding.totalCostUsd) * 100 : 0;

        totalHoldingsValue += currentValue;
        totalCostBasis += holding.totalCostUsd;

        holdingsList.push({
          coinId,
          symbol: holding.symbol,
          name: holding.name || (currentCoin ? currentCoin.name : holding.symbol),
          amount: holding.amount,
          currentPrice,
          currentValue,
          averageBuyPrice: holding.averageBuyPrice,
          pnlUsd,
          pnlPct
        });

        donutSlices.push({
          label: holding.symbol,
          value: currentValue
        });
      }

      // Add Cash slice to donut
      donutSlices.unshift({
        label: 'Cash (USD)',
        value: portfolio.cashBalance
      });

      const netWorth = portfolio.cashBalance + totalHoldingsValue;
      const totalPnlUsd = totalHoldingsValue - totalCostBasis;
      const totalPnlPct = totalCostBasis > 0 ? (totalPnlUsd / totalCostBasis) * 100 : 0;

      // Update Summary Cards
      $('#portfolioNetWorth').text(formatCurrency(netWorth));
      $('#portfolioCashBalance').text(formatCurrency(portfolio.cashBalance));
      $('#portfolioHoldingsValue').text(formatCurrency(totalHoldingsValue));

      const isPnlPos = totalPnlUsd >= 0;
      $('#portfolioTotalPnl').html(`
        <span class="${isPnlPos ? 'text-success' : 'text-danger'} font-bold">
          ${isPnlPos ? '+' : ''}${formatCurrency(totalPnlUsd)}
        </span>
        <span class="badge ${isPnlPos ? 'badge-success' : 'badge-danger'} text-xs">
          ${formatPercent(totalPnlPct)}
        </span>
      `);

      // Header Quick Balance
      $('#headerCashBalance').text(formatCurrency(portfolio.cashBalance));

      // Render Donut Chart
      const donutCanvas = document.getElementById('portfolioDonutCanvas');
      if (donutCanvas) {
        ChartRenderer.renderAllocationDonut(donutCanvas, donutSlices, netWorth);
      }

      // Render Holdings Table
      const $holdingsTbody = $('#holdingsTableBody');
      if ($holdingsTbody.length > 0) {
        if (holdingsList.length === 0) {
          $holdingsTbody.html(`
            <tr>
              <td colspan="7" class="text-center py-6 text-muted">
                No active crypto holdings yet. Click "Trade" on any market card to begin!
              </td>
            </tr>
          `);
        } else {
          const html = holdingsList.map(h => {
            const isPos = h.pnlUsd >= 0;
            return `
              <tr>
                <td>
                  <div class="font-bold">${h.name}</div>
                  <span class="text-xs text-muted">${h.symbol}</span>
                </td>
                <td class="font-medium">${h.amount.toFixed(4)}</td>
                <td class="font-bold">${formatCurrency(h.currentPrice)}</td>
                <td>${formatCurrency(h.averageBuyPrice)}</td>
                <td class="font-bold">${formatCurrency(h.currentValue)}</td>
                <td>
                  <span class="badge ${isPos ? 'badge-success' : 'badge-danger'}">
                    ${isPos ? '+' : ''}${formatCurrency(h.pnlUsd)} (${formatPercent(h.pnlPct)})
                  </span>
                </td>
                <td class="text-right">
                  <div class="action-btn-group">
                    <button class="btn btn-xs btn-primary btn-trade-open" data-id="${h.coinId}" data-mode="buy">+ Buy</button>
                    <button class="btn btn-xs btn-danger btn-trade-open" data-id="${h.coinId}" data-mode="sell">- Sell</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');

          $holdingsTbody.html(html);
        }
      }

      // Render Ledger Transactions
      this.renderTransactions(portfolio.transactions);
    },

    /**
     * Renders Transaction History Ledger
     */
    renderTransactions: function(transactions) {
      const $tbody = $('#transactionsTableBody');
      if ($tbody.length === 0) return;

      if (!transactions || transactions.length === 0) {
        $tbody.html(`
          <tr>
            <td colspan="8" class="text-center py-6 text-muted">
              No transactions recorded yet.
            </td>
          </tr>
        `);
        return;
      }

      const html = transactions.map(tx => {
        const isBuy = tx.type === 'BUY';
        const badgeCls = isBuy ? 'badge-success' : 'badge-danger';

        return `
          <tr data-tx-id="${tx.id}">
            <td class="text-xs text-muted">${formatRelativeTime(tx.timestamp)}</td>
            <td>
              <span class="badge ${badgeCls}">${tx.type}</span>
            </td>
            <td>
              <span class="font-bold">${tx.coinName || tx.coinSymbol}</span>
              <span class="text-xs text-muted">(${tx.coinSymbol})</span>
            </td>
            <td class="font-medium">${tx.amount.toFixed(4)}</td>
            <td>${formatCurrency(tx.priceUsd)}</td>
            <td class="font-bold">${formatCurrency(tx.totalUsd)}</td>
            <td class="text-xs text-muted">${formatCurrency(tx.feeUsd || 0)}</td>
            <td class="text-right">
              <button class="btn-icon btn-delete-tx text-danger" data-tx-id="${tx.id}" title="Delete record">
                ✕
              </button>
            </td>
          </tr>
        `;
      }).join('');

      $tbody.html(html);
    },

    /**
     * Renders Active Price Alerts
     */
    renderAlerts: function() {
      const $container = $('#alertsList');
      if ($container.length === 0) return;

      const alerts = StorageManager.getAlerts();

      if (alerts.length === 0) {
        $container.html(`
          <div class="empty-state card">
            <div class="empty-icon">🔔</div>
            <h3>No Price Alerts Configured</h3>
            <p>Set price alerts on any cryptocurrency to receive instant real-time sound and banner notifications.</p>
          </div>
        `);
        return;
      }

      const html = alerts.map(a => {
        const condLabel = a.condition === 'above' ? 'Rises Above' : 'Falls Below';
        const statusBadge = a.triggered
          ? `<span class="badge badge-warning">Triggered (${formatRelativeTime(a.triggeredAt || a.createdAt)})</span>`
          : `<span class="badge badge-success">Active & Monitoring</span>`;

        return `
          <div class="alert-card card ${a.triggered ? 'alert-card-triggered' : ''}" data-alert-id="${a.id}">
            <div class="alert-info">
              <div class="alert-title font-bold">
                ${a.coinSymbol} ${condLabel} ${formatCurrency(a.targetPrice)}
              </div>
              <div class="alert-meta text-xs text-muted">
                Created when price was ${formatCurrency(a.createdPrice)} • ${formatRelativeTime(a.createdAt)}
              </div>
            </div>
            <div class="alert-actions">
              ${statusBadge}
              <button class="btn-icon btn-delete-alert text-danger" data-alert-id="${a.id}" title="Remove alert">
                ✕
              </button>
            </div>
          </div>
        `;
      }).join('');

      $container.html(html);
    },

    /**
     * Prepends a live simulated trade to the real-time activity stream
     */
    addLiveTradeItem: function(trade) {
      const $container = $('#whaleStreamContainer');
      if ($container.length === 0) return;

      const isBuy = trade.action === 'BUY';
      const colorCls = isBuy ? 'text-success' : 'text-danger';
      const badgeCls = isBuy ? 'badge-success' : 'badge-danger';

      const itemHtml = `
        <div class="stream-item card" style="display:none;">
          <div class="stream-left">
            <span class="badge ${badgeCls}">${trade.action}</span>
            <div class="stream-details">
              <span class="font-bold">${trade.amount} ${trade.symbol}</span>
              <span class="text-xs text-muted">@ ${formatCurrency(trade.priceUsd)} on ${trade.exchange}</span>
            </div>
          </div>
          <div class="stream-right text-right">
            <div class="font-bold ${colorCls}">${formatCurrency(trade.totalUsd)}</div>
            <span class="text-xs text-muted">${formatRelativeTime(trade.timestamp)}</span>
          </div>
        </div>
      `;

      const $el = $(itemHtml);
      $container.prepend($el);
      $el.slideDown(250);

      // Keep max 25 items to prevent DOM bloat
      if ($container.children().length > 25) {
        $container.children().last().remove();
      }
    },

    /**
     * Real-Time Pulse Animation for micro-ticks
     */
    highlightPriceChange: function(coinId, direction) {
      const cls = direction === 'up' ? 'flash-green' : 'flash-red';

      // Highlight in Grid Cards
      const $card = $(`.market-card[data-coin-id="${coinId}"]`);
      if ($card.length > 0) {
        const $priceEl = $card.find('.price-display');
        $priceEl.removeClass('flash-green flash-red');
        void $priceEl[0].offsetWidth; // trigger reflow
        $priceEl.addClass(cls);
        setTimeout(() => $priceEl.removeClass(cls), 750);
      }

      // Highlight in Table Rows
      const $row = $(`tr[data-coin-id="${coinId}"]`);
      if ($row.length > 0) {
        const $priceCell = $row.find('.price-val');
        $priceCell.removeClass('flash-green flash-red');
        void $priceCell[0].offsetWidth;
        $priceCell.addClass(cls);
        setTimeout(() => $priceCell.removeClass(cls), 750);
      }

      // Highlight in Marquee Ticker
      const $ticker = $(`.ticker-item[data-ticker-id="${coinId}"]`);
      if ($ticker.length > 0) {
        $ticker.removeClass('flash-green flash-red');
        void $ticker[0].offsetWidth;
        $ticker.addClass(cls);
        setTimeout(() => $ticker.removeClass(cls), 750);
      }
    },

    /**
     * Toast Notification Stack System
     */
    showToast: function(title, message, type = 'info', duration = 4000) {
      let $container = $('#toastContainer');
      if ($container.length === 0) {
        $('body').append('<div id="toastContainer" class="toast-container"></div>');
        $container = $('#toastContainer');
      }

      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
      };

      const icon = icons[type] || 'ℹ';

      const toastHtml = `
        <div class="toast toast-${type}" style="display:none;">
          <div class="toast-icon">${icon}</div>
          <div class="toast-content">
            <h5 class="toast-title">${title}</h5>
            <p class="toast-message">${message}</p>
          </div>
          <button class="toast-close" title="Dismiss">✕</button>
        </div>
      `;

      const $toast = $(toastHtml);
      $container.append($toast);
      $toast.slideDown(200);

      // Click to dismiss
      $toast.find('.toast-close').on('click', function() {
        $toast.fadeOut(200, function() {
          $toast.remove();
        });
      });

      // Auto dismiss
      if (duration > 0) {
        setTimeout(function() {
          if ($toast.parent().length > 0) {
            $toast.fadeOut(300, function() {
              $toast.remove();
            });
          }
        }, duration);
      }
    },

    /**
     * Modal Dialog Controllers
     */
    openModal: function(modalSelector) {
      const $m = $(modalSelector);
      if ($m.length === 0) return;
      $('body').addClass('modal-open');
      $m.fadeIn(200);
      $m.find('input:visible:first').focus();
    },

    closeModal: function(modalSelector) {
      const $m = modalSelector ? $(modalSelector) : $('.modal');
      $m.fadeOut(200, function() {
        if ($('.modal:visible').length === 0) {
          $('body').removeClass('modal-open');
        }
      });
    },

    populateTradeModal: function(coinId, mode = 'buy') {
      const coin = ApiManager.getAssetById(coinId);
      if (!coin) return;

      const portfolio = StorageManager.getPortfolio();
      const holding = portfolio.holdings[coin.id] || { amount: 0 };

      $('#tradeCoinId').val(coin.id);
      $('#tradeCoinSymbol').val(coin.symbol);
      $('#tradeCoinName').val(coin.name);
      $('#tradeCurrentPrice').val(coin.priceUsd);

      $('#tradeModalTitle').text(`Trade ${coin.name} (${coin.symbol})`);
      $('#tradeDisplayPrice').text(formatCurrency(coin.priceUsd));
      $('#tradeCashAvailable').text(formatCurrency(portfolio.cashBalance));
      $('#tradeHoldingsAvailable').text(`${holding.amount.toFixed(4)} ${coin.symbol}`);

      // Set Active tab in modal (Buy or Sell)
      $('.trade-tab-btn').removeClass('active');
      $(`.trade-tab-btn[data-mode="${mode}"]`).addClass('active');
      $('#tradeModeInput').val(mode);

      // Reset input fields
      $('#tradeAmount').val('');
      $('#tradeTotalUsd').val('');
      $('#tradeFeeEstimate').text('$0.00');
      $('#tradeValidationMsg').empty();

      this.openModal('#tradeModal');
    },

    populateDetailModal: function(coinId) {
      const coin = ApiManager.getAssetById(coinId);
      if (!coin) return;

      $('#detailModalTitle').html(`
        <span class="font-bold">${coin.name}</span>
        <span class="text-muted">(${coin.symbol})</span>
        <span class="badge ${coin.changePercent24Hr >= 0 ? 'badge-success' : 'badge-danger'} ml-2">
          ${formatPercent(coin.changePercent24Hr)}
        </span>
      `);

      $('#detailPrice').text(formatCurrency(coin.priceUsd));
      $('#detailMarketCap').text(formatLargeNumber(coin.marketCapUsd));
      $('#detail24hVolume').text(formatLargeNumber(coin.volumeUsd24Hr));
      $('#detail24hHigh').text(formatCurrency(coin.high24h));
      $('#detail24hLow').text(formatCurrency(coin.low24h));
      $('#detailRank').text('#' + coin.rank);
      $('#detailSupply').text(coin.supply ? coin.supply.toLocaleString() + ' ' + coin.symbol : 'N/A');

      // Bind quick trade button
      $('#detailBtnTrade').attr('data-id', coin.id);
      $('#detailBtnAlert').attr('data-id', coin.id);

      this.openModal('#detailModal');

      // Draw high resolution interactive chart
      const canvas = document.getElementById('detailPriceChart');
      if (canvas && coin.sparkline) {
        ChartRenderer.renderDetailChart(canvas, coin.sparkline, {
          isPositive: coin.changePercent24Hr >= 0
        });
      }
    },

    populateAlertModal: function(coinId) {
      const coin = ApiManager.getAssetById(coinId);
      if (!coin) return;

      $('#alertCoinId').val(coin.id);
      $('#alertCoinSymbol').val(coin.symbol);
      $('#alertCurrentPrice').val(coin.priceUsd);

      $('#alertModalCoinName').text(`${coin.name} (${coin.symbol})`);
      $('#alertModalCurrentPrice').text(formatCurrency(coin.priceUsd));

      // Default suggested target price (+5%)
      const suggested = +(coin.priceUsd * 1.05).toFixed(coin.priceUsd > 10 ? 2 : 4);
      $('#alertTargetPrice').val(suggested);
      $('#alertCondition').val('above');

      this.openModal('#alertModal');
    }
  };
})();
