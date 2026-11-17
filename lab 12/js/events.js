/**
 * CryptoPulse - Event Management & User Interactions
 * Implements mouse events, form validations, debounced inputs, keyboard shortcuts,
 * event delegation, and decoupled jQuery custom event handlers.
 */
const EventsManager = (function() {
  'use strict';

  let currentCategory = 'all';
  let searchTerm = '';
  let debounceTimer = null;
  let sortConfig = {
    column: 'rank',
    ascending: true
  };

  /**
   * Filters and sorts the master asset list based on active UI state
   */
  function getFilteredAndSortedAssets() {
    let assets = [...ApiManager.getAssets()];

    // Search filter
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase().trim();
      assets = assets.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.symbol.toLowerCase().includes(q)
      );
    }

    // Category / Chip filter
    if (currentCategory === 'gainers') {
      assets = assets.filter(a => a.changePercent24Hr > 0);
    } else if (currentCategory === 'losers') {
      assets = assets.filter(a => a.changePercent24Hr < 0);
    } else if (currentCategory === 'volume') {
      assets = assets.sort((a, b) => b.volumeUsd24Hr - a.volumeUsd24Hr);
    } else if (currentCategory === 'largecap') {
      assets = assets.filter(a => a.marketCapUsd >= 50e9);
    }

    // Column Sorting
    assets.sort((a, b) => {
      let valA = a[sortConfig.column];
      let valB = b[sortConfig.column];

      if (sortConfig.column === 'rank') {
        valA = a.rank || 999;
        valB = b.rank || 999;
      }

      if (typeof valA === 'string') {
        return sortConfig.ascending 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      return sortConfig.ascending ? valA - valB : valB - valA;
    });

    return assets;
  }

  function refreshMarketViews() {
    const assets = getFilteredAndSortedAssets();
    UIManager.renderMarketGrid(assets);
    UIManager.renderMarketTable(assets);
  }

  return {
    init: function() {
      this.bindNavigation();
      this.bindSearchAndFilters();
      this.bindTradeForm();
      this.bindAlertForm();
      this.bindActionDelegations();
      this.bindHeaderControls();
      this.bindDataBackup();
      this.bindKeyboardShortcuts();
      this.bindCustomEvents();
    },

    /**
     * Tab Navigation Switching
     */
    bindNavigation: function() {
      $('.nav-tab').on('click', function(e) {
        e.preventDefault();
        SoundManager.play('click');

        const targetTab = $(this).data('tab');
        $('.nav-tab').removeClass('active');
        $(this).addClass('active');

        // Fade switch views
        $('.view-section').hide();
        $(`#view-${targetTab}`).fadeIn(200);

        // Tab specific refreshes
        const allAssets = ApiManager.getAssets();
        if (targetTab === 'markets') {
          refreshMarketViews();
        } else if (targetTab === 'watchlist') {
          UIManager.renderWatchlist(allAssets);
        } else if (targetTab === 'portfolio') {
          UIManager.renderPortfolio(allAssets);
        } else if (targetTab === 'alerts') {
          UIManager.renderAlerts();
        }
      });

      // View switcher (Grid vs Table)
      $('#btnViewGrid').on('click', function() {
        SoundManager.play('click');
        $(this).addClass('active');
        $('#btnViewTable').removeClass('active');
        $('#marketTableWrapper').hide();
        $('#marketGrid').fadeIn(200);
        StorageManager.saveSettings({ viewMode: 'grid' });
      });

      $('#btnViewTable').on('click', function() {
        SoundManager.play('click');
        $(this).addClass('active');
        $('#btnViewGrid').removeClass('active');
        $('#marketGrid').hide();
        $('#marketTableWrapper').fadeIn(200);
        StorageManager.saveSettings({ viewMode: 'table' });
      });
    },

    /**
     * Search Input Debouncing and Filter Chips
     */
    bindSearchAndFilters: function() {
      // Debounced search input
      $('#marketSearchInput').on('input', function() {
        const val = $(this).val();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchTerm = val;
          refreshMarketViews();
        }, 180);
      });

      // Clear search
      $('#btnClearSearch').on('click', function() {
        $('#marketSearchInput').val('').focus();
        searchTerm = '';
        refreshMarketViews();
      });

      // Filter chips
      $('.filter-chip').on('click', function() {
        SoundManager.play('click');
        $('.filter-chip').removeClass('active');
        $(this).addClass('active');
        currentCategory = $(this).data('category');
        refreshMarketViews();
      });

      // Table Header Sorting
      $(document).on('click', 'th[data-sort]', function() {
        const col = $(this).data('sort');
        if (sortConfig.column === col) {
          sortConfig.ascending = !sortConfig.ascending;
        } else {
          sortConfig.column = col;
          sortConfig.ascending = true;
        }

        // Update sort indicator icons
        $('th[data-sort] .sort-icon').text('↕');
        const arrow = sortConfig.ascending ? '▲' : '▼';
        $(this).find('.sort-icon').text(arrow);

        refreshMarketViews();
      });
    },

    /**
     * Event Delegation for dynamically rendered buttons (Trade, Details, Favorite, Alerts)
     */
    bindActionDelegations: function() {
      // Favorite toggle
      $(document).on('click', '.btn-favorite', function(e) {
        e.stopPropagation();
        const coinId = $(this).data('id');
        const res = StorageManager.toggleWatchlist(coinId);
        SoundManager.play('click');

        const coin = ApiManager.getAssetById(coinId);
        const name = coin ? coin.name : coinId;

        if (res.isAdded) {
          $(this).addClass('active').text('★');
          UIManager.showToast('Watchlist Updated', `Added ${name} to your watchlist.`, 'success', 2500);
        } else {
          $(this).removeClass('active').text('☆');
          UIManager.showToast('Watchlist Updated', `Removed ${name} from watchlist.`, 'info', 2500);
        }

        // Refresh views to keep favorite buttons synchronized
        refreshMarketViews();
        if ($('#view-watchlist').is(':visible')) {
          UIManager.renderWatchlist(ApiManager.getAssets());
        }
      });

      // Open Trade Modal
      $(document).on('click', '.btn-trade-open', function(e) {
        e.stopPropagation();
        SoundManager.play('click');
        const coinId = $(this).data('id');
        const mode = $(this).data('mode') || 'buy';
        UIManager.populateTradeModal(coinId, mode);
      });

      // Open Coin Details Modal
      $(document).on('click', '.btn-details, .market-card', function(e) {
        // Prevent opening if user clicked a button inside card
        if ($(e.target).closest('button').length > 0) return;
        SoundManager.play('click');
        const coinId = $(this).data('coin-id') || $(this).data('id');
        UIManager.populateDetailModal(coinId);
      });

      // Open Alert Modal
      $(document).on('click', '.btn-alert-open', function(e) {
        e.stopPropagation();
        SoundManager.play('click');
        const coinId = $(this).data('id');
        UIManager.populateAlertModal(coinId);
      });

      // Delete Transaction
      $(document).on('click', '.btn-delete-tx', function(e) {
        e.stopPropagation();
        const txId = $(this).data('tx-id');
        const $row = $(this).closest('tr');

        $row.css('background', 'rgba(239, 68, 68, 0.2)');
        setTimeout(() => {
          if (confirm('Delete this transaction record?')) {
            StorageManager.deleteTransaction(txId);
            $row.fadeOut(250, function() {
              $(this).remove();
            });
            UIManager.showToast('Record Deleted', 'Transaction removed from ledger.', 'info', 2500);
            UIManager.renderPortfolio(ApiManager.getAssets());
          } else {
            $row.css('background', '');
          }
        }, 50);
      });

      // Delete Price Alert
      $(document).on('click', '.btn-delete-alert', function(e) {
        e.stopPropagation();
        const alertId = $(this).data('alert-id');
        const $card = $(this).closest('.alert-card');

        StorageManager.removeAlert(alertId);
        $card.slideUp(200, function() {
          $(this).remove();
          if ($('#alertsList .alert-card').length === 0) {
            UIManager.renderAlerts();
          }
        });
        UIManager.showToast('Alert Removed', 'Price alert has been deleted.', 'info', 2000);
      });

      // Close modal on backdrop click or close button
      $('.modal-close, .modal-backdrop, .btn-modal-cancel').on('click', function() {
        UIManager.closeModal();
      });

      $('.modal-content').on('click', function(e) {
        e.stopPropagation(); // prevent backdrop click closing
      });
    },

    /**
     * Trade Modal Bidirectional Calculations & Form Submission
     */
    bindTradeForm: function() {
      // Toggle Buy vs Sell inside modal
      $('.trade-tab-btn').on('click', function() {
        SoundManager.play('click');
        $('.trade-tab-btn').removeClass('active');
        $(this).addClass('active');
        const mode = $(this).data('mode');
        $('#tradeModeInput').val(mode);
        $('#tradeAmount').val('');
        $('#tradeTotalUsd').val('');
        $('#tradeFeeEstimate').text('$0.00');
        $('#tradeValidationMsg').empty();
      });

      // Real-time Bidirectional Calculation: typing Amount calculates Total USD
      $('#tradeAmount').on('input', function() {
        const amount = parseFloat($(this).val()) || 0;
        const price = parseFloat($('#tradeCurrentPrice').val()) || 0;
        const gross = amount * price;
        const fee = gross * 0.001;
        const total = gross + fee;

        if (amount > 0) {
          $('#tradeTotalUsd').val(gross.toFixed(2));
          $('#tradeFeeEstimate').text(UIManager.formatCurrency(fee));
        } else {
          $('#tradeTotalUsd').val('');
          $('#tradeFeeEstimate').text('$0.00');
        }
      });

      // Typing Total USD calculates Coin Amount
      $('#tradeTotalUsd').on('input', function() {
        const usd = parseFloat($(this).val()) || 0;
        const price = parseFloat($('#tradeCurrentPrice').val()) || 0;

        if (usd > 0 && price > 0) {
          const amount = +(usd / price).toFixed(6);
          const fee = usd * 0.001;
          $('#tradeAmount').val(amount);
          $('#tradeFeeEstimate').text(UIManager.formatCurrency(fee));
        } else {
          $('#tradeAmount').val('');
          $('#tradeFeeEstimate').text('$0.00');
        }
      });

      // Percentage Quick Buttons (25%, 50%, 75%, 100%)
      $('.btn-pct').on('click', function() {
        SoundManager.play('click');
        const pct = parseFloat($(this).data('pct')) / 100;
        const mode = $('#tradeModeInput').val();
        const price = parseFloat($('#tradeCurrentPrice').val()) || 1;
        const coinId = $('#tradeCoinId').val();
        const portfolio = StorageManager.getPortfolio();

        if (mode === 'buy') {
          const maxUsd = portfolio.cashBalance * pct;
          const gross = maxUsd / 1.001; // account for fee
          const amount = +(gross / price).toFixed(6);
          $('#tradeAmount').val(amount).trigger('input');
        } else {
          const holding = portfolio.holdings[coinId] || { amount: 0 };
          const sellAmount = +(holding.amount * pct).toFixed(6);
          $('#tradeAmount').val(sellAmount).trigger('input');
        }
      });

      // Trade Form Submission
      $('#tradeForm').on('submit', function(e) {
        e.preventDefault();
        const mode = $('#tradeModeInput').val();
        const coinId = $('#tradeCoinId').val();
        const symbol = $('#tradeCoinSymbol').val();
        const name = $('#tradeCoinName').val();
        const amount = parseFloat($('#tradeAmount').val());
        const price = parseFloat($('#tradeCurrentPrice').val());

        if (!amount || amount <= 0 || isNaN(amount)) {
          $('#tradeValidationMsg').html('<div class="text-danger text-sm">Please enter a valid amount.</div>');
          return;
        }

        let result;
        if (mode === 'buy') {
          result = StorageManager.buyAsset(coinId, symbol, name, amount, price);
        } else {
          result = StorageManager.sellAsset(coinId, symbol, name, amount, price);
        }

        if (result.success) {
          SoundManager.play('trade');
          UIManager.closeModal('#tradeModal');

          const actionVerb = mode === 'buy' ? 'Purchased' : 'Sold';
          UIManager.showToast(
            'Trade Executed!',
            `Successfully ${actionVerb} ${amount} ${symbol} for ${UIManager.formatCurrency(result.transaction.totalUsd)}`,
            'success',
            4000
          );

          UIManager.renderPortfolio(ApiManager.getAssets());
        } else {
          $('#tradeValidationMsg').html(`<div class="text-danger text-sm">${result.error}</div>`);
        }
      });
    },

    /**
     * Alert Modal Form Submission
     */
    bindAlertForm: function() {
      $('#alertForm').on('submit', function(e) {
        e.preventDefault();
        const coinId = $('#alertCoinId').val();
        const symbol = $('#alertCoinSymbol').val();
        const currentPrice = parseFloat($('#alertCurrentPrice').val());
        const targetPrice = parseFloat($('#alertTargetPrice').val());
        const condition = $('#alertCondition').val();

        if (!targetPrice || targetPrice <= 0 || isNaN(targetPrice)) {
          alert('Please enter a valid target price.');
          return;
        }

        StorageManager.addAlert({
          coinId,
          coinSymbol: symbol,
          targetPrice,
          condition,
          createdPrice: currentPrice
        });

        SoundManager.play('alert');
        UIManager.closeModal('#alertModal');
        UIManager.showToast('Price Alert Set', `We will notify you when ${symbol} reaches ${UIManager.formatCurrency(targetPrice)}.`, 'success', 3500);
        UIManager.renderAlerts();
      });
    },

    /**
     * Header & Control Bar Actions (Theme, Sound, Refresh, Interval)
     */
    bindHeaderControls: function() {
      // Theme Toggle
      $('#btnThemeToggle').on('click', function() {
        SoundManager.play('click');
        const isDark = $('body').hasClass('dark-theme');
        if (isDark) {
          $('body').removeClass('dark-theme').addClass('light-theme');
          $(this).html('🌙 <span class="nav-text">Dark Mode</span>');
          StorageManager.saveSettings({ theme: 'light' });
        } else {
          $('body').removeClass('light-theme').addClass('dark-theme');
          $(this).html('☀️ <span class="nav-text">Light Mode</span>');
          StorageManager.saveSettings({ theme: 'dark' });
        }
        // Redraw canvas charts with updated theme colors
        refreshMarketViews();
        if ($('#view-portfolio').is(':visible')) {
          UIManager.renderPortfolio(ApiManager.getAssets());
        }
      });

      // Sound Toggle
      $('#btnSoundToggle').on('click', function() {
        const currentlyMuted = SoundManager.isMuted();
        const newMuted = !currentlyMuted;
        SoundManager.setMuted(newMuted);
        StorageManager.saveSettings({ sound: !newMuted });

        if (newMuted) {
          $(this).html('🔇 <span class="nav-text">Sound Off</span>');
          UIManager.showToast('Sound Muted', 'Audio feedback disabled.', 'info', 2000);
        } else {
          $(this).html('🔊 <span class="nav-text">Sound On</span>');
          SoundManager.play('tickUp');
          UIManager.showToast('Sound Enabled', 'Audio feedback enabled.', 'success', 2000);
        }
      });

      // Manual AJAX Refresh
      $('#btnManualRefresh').on('click', function() {
        SoundManager.play('click');
        $(this).find('.refresh-icon').addClass('spinning');
        ApiManager.fetchMarketData(true);
      });

      // Pause / Resume Auto-Refresh
      $('#btnToggleAutoRefresh').on('click', function() {
        SoundManager.play('click');
        const isPaused = ApiManager.togglePause();
        if (isPaused) {
          $(this).html('▶ <span class="control-label">Resume</span>');
          $('#countdownText').text('Paused');
          $('#countdownBar').css('background', '#f59e0b');
          UIManager.showToast('Auto-Refresh Paused', 'Real-time updates paused.', 'warning', 2500);
        } else {
          $(this).html('⏸ <span class="control-label">Pause</span>');
          $('#countdownBar').css('background', '');
          ApiManager.resetCountdown();
          UIManager.showToast('Auto-Refresh Resumed', 'Live polling active.', 'info', 2000);
        }
      });

      // Refresh Interval Select
      $('#refreshIntervalSelect').on('change', function() {
        const sec = parseInt($(this).val(), 10) || 8;
        StorageManager.saveSettings({ refreshInterval: sec });
        ApiManager.startPolling(sec);
        UIManager.showToast('Interval Updated', `Polling interval set to ${sec} seconds.`, 'info', 2000);
      });

      // Keyboard Shortcuts Modal Open
      $('#btnShortcutsHelp').on('click', function() {
        UIManager.openModal('#shortcutsModal');
      });
    },

    /**
     * Backup & Persistence Operations
     */
    bindDataBackup: function() {
      // Export JSON
      $('#btnExportData').on('click', function() {
        SoundManager.play('click');
        StorageManager.exportAllData();
        UIManager.showToast('Backup Exported', 'Portfolio and settings downloaded as JSON.', 'success', 3000);
      });

      // Import JSON trigger
      $('#btnImportData').on('click', function() {
        $('#fileImportInput').click();
      });

      $('#fileImportInput').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
          const res = StorageManager.importAllData(evt.target.result);
          if (res.success) {
            UIManager.showToast('Backup Restored', 'Your data was restored successfully.', 'success', 3500);
            location.reload();
          } else {
            UIManager.showToast('Import Failed', res.error, 'error', 4000);
          }
        };
        reader.readAsText(file);
      });

      // Reset Demo Data
      $('#btnResetData').on('click', function() {
        if (confirm('Reset portfolio and all settings back to default demo data?')) {
          StorageManager.resetToDefaults();
          UIManager.showToast('Data Reset', 'All data restored to factory defaults.', 'info', 3000);
          setTimeout(() => location.reload(), 400);
        }
      });
    },

    /**
     * Power-User Keyboard Shortcuts
     */
    bindKeyboardShortcuts: function() {
      $(document).on('keydown', function(e) {
        // Do not intercept if user is typing in an input or textarea
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const isInputFocused = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

        if (e.key === 'Escape') {
          UIManager.closeModal();
          return;
        }

        if (isInputFocused) return;

        if (e.key === '/') {
          e.preventDefault();
          $('#marketSearchInput').focus();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          $('#btnManualRefresh').click();
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          $('#btnToggleAutoRefresh').click();
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          $('#btnThemeToggle').click();
        } else if (e.key === '?') {
          e.preventDefault();
          UIManager.openModal('#shortcutsModal');
        }
      });
    },

    /**
     * Decoupled Custom Event Handlers
     */
    bindCustomEvents: function() {
      // Market data updated from AJAX
      $(document).on('market:updated', function(e, data) {
        $('#dataSourceLabel').text(data.dataSource);
        $('#btnManualRefresh .refresh-icon').removeClass('spinning');

        UIManager.renderHeaderMetrics(data.assets);
        UIManager.renderMarquee(data.assets);
        refreshMarketViews();

        if ($('#view-watchlist').is(':visible')) {
          UIManager.renderWatchlist(data.assets);
        }
        if ($('#view-portfolio').is(':visible')) {
          UIManager.renderPortfolio(data.assets);
        }
      });

      // Real-time micro-tick event
      $(document).on('market:tick', function(e, tick) {
        UIManager.highlightPriceChange(tick.coinId, tick.direction);
        SoundManager.play(tick.direction === 'up' ? 'tickUp' : 'tickDown');

        // Update live price in open trade modal if same coin
        if ($('#tradeModal').is(':visible') && $('#tradeCoinId').val() === tick.coinId) {
          $('#tradeCurrentPrice').val(tick.newPrice);
          $('#tradeDisplayPrice').text(UIManager.formatCurrency(tick.newPrice));
          $('#tradeAmount').trigger('input');
        }
      });

      // Multi-Tab Sync detected from storage event
      $(document).on('storage:synced', function(e, data) {
        UIManager.showToast('Multi-Tab Sync', 'Portfolio updated from another browser tab.', 'info', 3000);
        UIManager.renderPortfolio(ApiManager.getAssets());
        UIManager.renderWatchlist(ApiManager.getAssets());
        UIManager.renderAlerts();
      });

      // Price Alert Triggered
      $(document).on('alert:triggered', function(e, data) {
        SoundManager.play('alert');
        const cond = data.alert.condition === 'above' ? 'surpassed' : 'dropped below';
        UIManager.showToast(
          '🔔 Price Alert Triggered!',
          `${data.alert.coinSymbol} has ${cond} ${UIManager.formatCurrency(data.alert.targetPrice)} (Now: ${UIManager.formatCurrency(data.currentPrice)})`,
          'warning',
          6000
        );
        UIManager.renderAlerts();
      });

      // Live simulated whale trade
      $(document).on('whale:trade', function(e, trade) {
        UIManager.addLiveTradeItem(trade);
      });
    }
  };
})();
