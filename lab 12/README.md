# ⚡ CryptoPulse Live - Real-Time Market & Portfolio Terminal
### Interactive Real-Time Web Application Built with JavaScript & jQuery

CryptoPulse Live is a high-performance, real-time financial tracking and paper-trading terminal built with vanilla **JavaScript**, **jQuery**, modern **HTML5**, and **CSS3**. It demonstrates advanced frontend web engineering across **DOM Manipulation**, **Event Systems**, **Web Storage**, and **AJAX Integration**.

---

## 🚀 Key Architectural Pillars

### 1. 🌐 DOM (Document Object Model) Manipulation with jQuery
- **Dynamic Renderers**:
  - **Market Grid & Table**: Dynamically builds responsive asset cards and structured data tables from remote JSON payloads (`UIManager.renderMarketGrid`, `UIManager.renderMarketTable`).
  - **Live Marquee Ticker**: Renders an infinite, smoothly scrolling ticker tape showing current prices and 24h percentage swings (`#marqueeTrack`).
  - **Portfolio Overview & Holdings**: Calculates real-time net worth, cash reserves, crypto valuation, and unrealized profit/loss across all active holdings.
  - **Transaction Ledger**: Appends and animates chronological transaction rows with status badges and deletion triggers.
  - **Dynamic Price Alert Cards**: Generates cards with monitoring status and trigger indicators.
- **DOM Traversal & Class Manipulation**:
  - Leverages `.find()`, `.closest()`, `.parent()`, `.siblings()`, and `.children()` for contextual querying.
  - Dynamic class toggling (`.addClass()`, `.removeClass()`, `.toggleClass()`) for active navigation tabs, filter chips, favorite stars, and theme switching.
- **jQuery Animations**:
  - `.fadeIn()`, `.fadeOut()`, `.slideDown()`, and `.slideUp()` for smooth view transitions, modals, and toast notifications.
  - Animated row removal with confirmation feedback on ledger deletions.
- **Zero-Dependency High-DPI HTML5 Canvas Engine**:
  - Dynamic sparkline trend curves for every cryptocurrency card and table row.
  - Interactive price chart in the Detail Modal with crosshair cursor and floating hover tooltips.
  - Donut chart in the Portfolio view rendering asset allocation distribution.

---

### 2. ⚡ Event Handling & Delegation
- **Event Delegation**:
  - Dynamically generated action buttons (`.btn-trade-open`, `.btn-favorite`, `.btn-details`, `.btn-alert-open`, `.btn-delete-tx`) use delegated handlers (`$(document).on('click', '.btn-trade-open', ...)`), ensuring zero memory leaks and continuous responsiveness without rebinding.
- **Debounced Live Search**:
  - The live search input (`#marketSearchInput`) employs an input debouncing timer (180ms), providing instant, silky-smooth filtering across asset names and ticker symbols without UI stutter.
- **Bidirectional Real-Time Form Calculations**:
  - In the Trade Modal, typing a unit amount instantly computes the total USD value, fee, and net balance; typing a USD amount back-calculates the exact unit quantity.
  - Percentage quick buttons (25%, 50%, 75%, MAX 100%) dynamically compute available balances based on the active mode (Buy vs Sell).
- **Power-User Keyboard Shortcuts**:
  - `/` &rarr; Instantly focuses the market search box.
  - `R` &rarr; Triggers an immediate manual AJAX data refresh.
  - `P` &rarr; Pauses or resumes real-time live polling.
  - `T` &rarr; Toggles Dark / Light theme.
  - `?` &rarr; Opens the Keyboard Shortcuts cheat-sheet modal.
  - `Escape` &rarr; Closes any open modal dialog.
- **Decoupled Custom jQuery Events**:
  - `market:updated` &rarr; Dispatched when fresh AJAX data is processed; triggers updates across all views.
  - `market:tick` &rarr; Dispatched by the real-time tick engine; triggers in-place price mutations, glowing visual pulses, and audio cues.
  - `portfolio:updated` &rarr; Dispatched upon executed trades; refreshes holdings, metrics, and donut charts.
  - `alert:triggered` &rarr; Dispatched when a price threshold is crossed; triggers sound and toast notifications.
  - `storage:synced` &rarr; Dispatched when multi-tab synchronization detects external state updates.

---

### 3. 💾 Storage Integration (`localStorage` & Multi-Tab Sync)
- **Persistent State Management**:
  - **Watchlist**: Persists user-starred cryptocurrencies (`cryptopulse_watchlist_v1`).
  - **Portfolio**: Stores available cash balance ($100,000 USD default paper trading balance), active coin holdings, average buy prices, and transaction records (`cryptopulse_portfolio_v1`).
  - **Alerts**: Saves configured price triggers with conditions and states (`cryptopulse_alerts_v1`).
  - **User Preferences**: Stores theme (`dark`/`light`), sound mute toggle, active polling interval, and view mode (`grid`/`table`).
- **Offline Market Cache**:
  - The latest remote AJAX response is cached in `localStorage` with a timestamp (`cryptopulse_market_cache_v1`). If the network disconnects or an API fails, the application gracefully hydrates from cache.
- **Multi-Tab Cross-Window Synchronization**:
  - Listens to the window `storage` event (`window.addEventListener('storage', ...)`).
  - Executing a trade or adding a favorite in Tab A instantly syncs the balances, holdings, and notifications in Tab B in real-time!
- **Data Export & Import**:
  - **Export JSON**: Downloads a clean, formatted `.json` backup file containing portfolio, transactions, and settings.
  - **Import JSON**: Validates and restores user backup files using the HTML5 `FileReader` API.
  - **Reset to Defaults**: One-click restore to reset all test data back to initial demo state.

---

### 4. 🔄 AJAX Integration & Real-Time Engine
- **Robust jQuery `$.ajax` Implementation**:
  - Connects to public REST APIs (CoinCap / CoinGecko markets).
  - Complete lifecycle hooks:
    - `beforeSend`: Initiates spinner animations and updates feed status.
    - `success`: Normalizes data, updates timestamps, fires `market:updated`, and caches to storage.
    - `error`: Gracefully catches network failure, timeouts, or rate limits, seamlessly falling back to cached or simulated data without breaking the UI.
    - `complete`: Resets sync icons and restarts countdown intervals.
- **Interactive Polling Controller**:
  - Polling interval is customizable (3s, 5s, 8s, 15s, 30s) or can be paused/resumed at will.
  - Smooth countdown progress bar runs every 100ms for continuous visual feedback.
  - Manual Refresh button triggers an immediate asynchronous fetch with a rotating 360° spin effect.
- **Real-Time Micro-Tick Engine**:
  - Simulates high-frequency orderbook ticks between polling cycles.
  - Triggers green pulse glows (`.flash-green`) when prices rise and red pulse glows (`.flash-red`) when prices fall.
- **Live Whale Activity Stream**:
  - Continuously streams simulated high-volume institutional trades across major exchanges into the live feed tab.
- **Web Audio API Sound Synthesizer**:
  - Generates pleasant synthesized audio chimes for positive ticks, negative clicks, executed trades, and triggered price alerts without requiring external `.mp3` or `.wav` files.

---

## 📁 Project Directory Structure

```
lab 12/
├── index.html                   # Semantic HTML5 single-page application layout
├── css/
│   └── style.css                # Modern CSS with dark/light variables & animations
├── js/
│   ├── vendor/
│   │   └── jquery-fallback.js   # Local lightweight jQuery fallback runtime
│   ├── sound.js                 # Web Audio API audio synthesizer
│   ├── storage.js               # LocalStorage manager & multi-tab synchronization
│   ├── chart.js                 # HTML5 Canvas chart renderer (sparklines, area & donut)
│   ├── api.js                   # jQuery $.ajax integration, polling & real-time tick engine
│   ├── ui.js                    # Dynamic DOM renderers, animations, modals & toasts
│   ├── events.js                # Event bindings, debounced search, shortcuts & delegation
│   └── app.js                   # Main application entry point & bootstrap
└── README.md                    # Project documentation
```

---

## 🖥️ How to Run

### Option 1: Direct Browser Launch
Simply double-click `index.html` or open it directly in Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari:
```powershell
Start-Process "index.html"
```

### Option 2: Local HTTP Server (Optional)
Using Python:
```powershell
python -m http.server 8000
# Then visit: http://localhost:8000
```
Or using Node.js:
```powershell
npx serve .
```

---

## 🧪 Testing Checklist & Features to Explore

1. **Test AJAX & Real-Time Polling**:
   - Observe the top countdown bar draining from 100% to 0%. When it completes, notice the refresh icon spinning as fresh data is loaded via `$.ajax`.
   - Click the `↻` button or press `R` to test immediate manual AJAX refresh.
   - Click `Pause` or press `P` to test halting and resuming polling.
2. **Test DOM & Real-Time Micro-Ticks**:
   - Watch the price cells and marquee ticker: micro-ticks cause prices to pulse with emerald green or crimson red glows.
   - Switch between **⊞ Cards** and **☰ Table** view.
   - Click column headers (e.g. *Price*, *24h Change*, *Market Cap*) to test ascending/descending sorting.
3. **Test Debounced Search & Filters**:
   - Press `/` to focus the search bar. Type "bit" or "sol" and observe instant debounced filtering.
   - Click filter chips (*Top Gainers*, *High Volume*, *Large Cap*) to test dynamic DOM list updates.
4. **Test Web Storage & Multi-Tab Sync**:
   - Click the star icon (☆) on any coin to add it to your Watchlist. Switch to the **⭐ Watchlist** tab to view it.
   - Open `index.html` in **two separate browser tabs side by side**.
   - In Tab 1, execute a Trade (Buy 1 Bitcoin). Notice that Tab 2 immediately updates its cash balance and transaction ledger via the `storage` event!
5. **Test Trading Simulator & Canvas Charts**:
   - Click **Trade** on any coin. Try the percentage buttons (25%, 50%, MAX) to see real-time bidirectional USD/coin calculations.
   - Confirm execution: hear the synthesized cash register chime, view the toast notification, and see the asset appear in your Portfolio and Donut chart.
6. **Test Price Alerts**:
   - Click **🔔 Alert** on any asset and set a target price close to the current price. When a tick hits that price, hear the 3-tone notification chime and see the banner notification.
7. **Test Backup & Export**:
   - In the Portfolio tab, click **💾 Export JSON** to download your saved portfolio.
