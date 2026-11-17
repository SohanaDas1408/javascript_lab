# CampusPulse: Dynamic Class Scheduler & Real-Time Countdown

A modern, responsive web application demonstrating the power of **ES6 Modules (`import`/`export`)** and **JavaScript Timers (`setInterval()`, `setTimeout()`, `clearInterval()`, `clearTimeout()`)** to build a dynamic college/school class scheduler and live countdown dashboard.

---

## 🌟 Key Features

1. **Live Digital Master Clock**:
   - Updates every second via `setInterval()`.
   - Displays real-time 12-hour formatted time with AM/PM, day of the week, and localized date.

2. **Dynamic Class Countdown & Active Session Hero Banner**:
   - **Active Class Detection:** Automatically detects when a class is currently in session, showing a pulsing live badge (`LIVE NOW`), elapsed time percentage bar, and countdown to class dismissal.
   - **Upcoming Class Countdown:** Dynamically calculates remaining **Days, Hours, Minutes, and Seconds** until the next class starts.
   - Calculates recurring occurrences across weekdays (Monday through Friday/Sunday).

3. **Interactive Weekly Class Timetable**:
   - Filter schedule by day of week (`All Days`, `Today`, `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`).
   - Visual status badges: `LIVE NOW`, `NEXT UP`, `TODAY`, `FINISHED TODAY`.
   - Add new classes via interactive modal with custom color themes.
   - Delete classes with immediate real-time timer recalibration.
   - Persistent storage via `localStorage` with sample seed data.

4. **Focus & Study Session Countdown (Pomodoro / Exam Timer)**:
   - Built with an encapsulated `CountdownTimer` ES6 class.
   - SVG animated circular progress dial.
   - Presets for 15m, 25m (Pomodoro), 45m, 60m, plus custom minute input.
   - Controls: **Start**, **Pause**, and **Reset**.
   - Sound chime and completion alert upon reaching `00:00`.

5. **Scheduled Notifications & Audible Alerts**:
   - 5-minute advance warning toast before upcoming classes.
   - Auto-dismissing toast notifications using `setTimeout()` with manual dismiss fallback using `clearTimeout()`.
   - Web Audio API synthesized audio chime (no external audio files required).

6. **"Time Machine" Testing Simulator**:
   - Dropdown menu in the header that lets evaluators and users simulate different times of the week (e.g., *Monday 09:15 AM* during Data Structures, *Wednesday 12:55 PM* 5 minutes before OS) to instantly witness live timer transitions without waiting.

---

## 🏗️ Architecture & ES6 Modules Breakdown

The project follows a clean separation of concerns using native ES6 modules (`type="module"`):

```
lab 11/
├── index.html               # Semantic, accessible HTML5 dashboard structure
├── css/
│   └── style.css            # Responsive dark/glassmorphic stylesheet (CSS Grid & Flexbox)
├── js/
│   ├── app.js               # Application entry point; orchestrates intervals & event listeners
│   ├── timer.js             # Timer engine (setInterval/setTimeout wrappers, CountdownTimer class)
│   ├── scheduler.js         # Schedule calculations, active/next class resolution logic
│   ├── ui.js                # DOM rendering, clock display, timetable cards, progress bars
│   ├── notifications.js     # Toast notifications (setTimeout auto-dismiss) & Web Audio chime
│   └── storage.js           # localStorage persistence & default seed data
└── README.md                # Project documentation
```

### Module Responsibilities:

| Module | Primary Exports | Purpose |
| :--- | :--- | :--- |
| `timer.js` | `CountdownTimer`, `ScheduledTaskManager`, `calculateTimeRemaining`, `padZero`, `delay` | Encapsulates all JavaScript timer operations, interval tickers, tick callbacks, and timeout schedules. |
| `scheduler.js` | `scheduler` (singleton instance), `DAYS_OF_WEEK`, `DAY_SHORT` | Manages weekly schedule, evaluates `activeClass`, `nextClass`, and computes target start/end timestamps. |
| `ui.js` | `updateClockUI`, `updateHeroBannerUI`, `renderScheduleList`, `format12Hour` | Performs DOM manipulation, updates progress bars, status tags, and timetable cards. |
| `notifications.js` | `showToast`, `playChime` | Renders auto-dismissing toast popups using `setTimeout()` and plays melodic chimes using Web Audio API. |
| `storage.js` | `loadClasses`, `saveClasses`, `resetToDefaults`, `DEFAULT_CLASSES` | Manages persistence using `localStorage`. |
| `app.js` | Application bootstrap | Root module imported via `<script type="module" src="./js/app.js">`. |

---

## ⏱️ JavaScript Timers Implementation Details

### 1. `setInterval()`
- **Live Clock & Countdown Loop:** A 1,000ms recurring interval in `app.js` triggers `updateClockUI()` and `scheduler.resolveScheduleState()`, keeping the clock, progress bar, and countdown flip cards in real-time sync with time progression.
- **Custom Countdown Engine:** The `CountdownTimer` class uses `setInterval()` to tick down remaining milliseconds and notify listeners with `(remainingMs, progressPercent)`.

### 2. `setTimeout()`
- **Scheduled Reminders:** `ScheduledTaskManager.scheduleAt()` schedules delayed notifications (e.g. 5 minutes before class start).
- **Auto-Dismissing Toasts:** Every notification toast initiates a `setTimeout(() => dismissToast(toast), durationMs)` to auto-remove itself after 4.5 seconds.
- **Micro-Delays & Transitions:** Used to orchestrate CSS exit animations before element DOM destruction.

### 3. `clearInterval()` & `clearTimeout()`
- **Preventing Leaks & Drift:** When a countdown timer is paused, reset, or reaches `00:00`, `clearInterval(this.intervalId)` is immediately invoked.
- **Manual Notification Dismissal:** If the user clicks `&times;` on a toast, `clearTimeout(timeoutId)` cancels the pending auto-removal timer.

---

## 🚀 How to Run

Because ES6 modules use `import`/`export`, modern browsers restrict `file:///` URLs due to CORS security policies. The project must be served via a local web server:

### Option 1: Using Python (Recommended)
Open a terminal in `lab 11` and run:
```bash
python -m http.server 8000
```
Then open your browser at:
```
http://localhost:8000
```

### Option 2: Using Node.js (npx serve)
```bash
npx serve .
```

### Option 3: Using VS Code Live Server
Right-click `index.html` inside VS Code and select **"Open with Live Server"**.

---

## 📱 Responsive Layout
- **Desktop (≥ 1024px):** 2-column layout (70% Class Timetable & Hero Countdown, 30% Study Timer & Specs sidebar).
- **Tablet (720px – 1024px):** Reflows timetable into a 2-column responsive card grid.
- **Mobile (< 720px):** Single-column stacked layout with horizontally scrollable day filter pills, compact countdown boxes, and touch-friendly controls.
