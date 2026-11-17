/**
 * CryptoPulse - Main Application Entry Point
 * Orchestrates module initialization when DOM is fully ready.
 */
$(document).ready(function() {
  'use strict';

  console.info('[CryptoPulse] Initializing Application...');

  // 1. Retrieve persistent settings
  const settings = StorageManager.getSettings();

  // Apply Theme
  if (settings.theme === 'light') {
    $('body').removeClass('dark-theme').addClass('light-theme');
    $('#btnThemeToggle').html('🌙 <span class="nav-text">Dark Mode</span>');
  } else {
    $('body').removeClass('light-theme').addClass('dark-theme');
    $('#btnThemeToggle').html('☀️ <span class="nav-text">Light Mode</span>');
  }

  // Apply Sound Preference
  SoundManager.init(!settings.sound);
  if (!settings.sound) {
    $('#btnSoundToggle').html('🔇 <span class="nav-text">Sound Off</span>');
  } else {
    $('#btnSoundToggle').html('🔊 <span class="nav-text">Sound On</span>');
  }

  // Apply Refresh Interval
  $('#refreshIntervalSelect').val(settings.refreshInterval || 8);

  // Apply View Mode
  if (settings.viewMode === 'table') {
    $('#btnViewTable').addClass('active');
    $('#btnViewGrid').removeClass('active');
    $('#marketGrid').hide();
    $('#marketTableWrapper').show();
  } else {
    $('#btnViewGrid').addClass('active');
    $('#btnViewTable').removeClass('active');
    $('#marketGrid').show();
    $('#marketTableWrapper').hide();
  }

  // 2. Initialize Event Listeners & Delegations
  EventsManager.init();

  // 3. Initial Market Fetch & start live polling
  ApiManager.fetchMarketData();
  ApiManager.startPolling(settings.refreshInterval || 8);

  // 4. Initial Portfolio & Alerts render
  UIManager.renderPortfolio(ApiManager.getAssets());
  UIManager.renderAlerts();

  // 5. Welcome Toast & Notification
  setTimeout(() => {
    UIManager.showToast(
      'CryptoPulse Live Active',
      'Real-time streaming connected with DOM, Events, Storage, and AJAX.',
      'info',
      4500
    );
  }, 600);

  console.info('[CryptoPulse] App Ready.');
});
