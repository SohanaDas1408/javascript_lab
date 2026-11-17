// ─────────────────────────────────────────────────────────
//  tracker.js  –  Automatic PC activity tracker
//
//  Spawns a SINGLE persistent PowerShell process that
//  streams the active window info every 2 seconds.
//  No repeated spawning = no focus stealing.
// ─────────────────────────────────────────────────────────
const { spawn } = require("child_process");
const path = require("path");
const readline = require("readline");

const PS_SCRIPT = path.join(__dirname, "get-active-window.ps1");

// ── Per-session state ───────────────────────────────────
// sessions = Map<sessionId, {
//   psProcess, currentActivity, activities[], loginTime
// }>
const sessions = new Map();

// ── Classify a window into a friendly app/site name ─────
function classify(title, processName) {
  const t = (title || "").toLowerCase();
  const p = (processName || "").toLowerCase();

  // Ignore blanks / system / idle
  if (!title || p === "idle" || p === "unknown" || p === "lockapp") {
    return { app: "Idle / Locked", detail: "" };
  }

  // Browser detection
  const browserMap = {
    chrome: "Google Chrome",
    msedge: "Microsoft Edge",
    firefox: "Mozilla Firefox",
    opera: "Opera",
    brave: "Brave",
    vivaldi: "Vivaldi",
    arc: "Arc",
  };

  let browserName = null;
  for (const [key, name] of Object.entries(browserMap)) {
    if (p.includes(key)) {
      browserName = name;
      break;
    }
  }

  if (browserName) {
    // Strip browser name suffix from title
    const cleaned = title
      .replace(/\s*[-–—]\s*(Google Chrome|Microsoft\s*Edge|Mozilla Firefox|Opera|Brave|Vivaldi|Arc).*$/i, "")
      .trim();

    // Identify popular sites from the tab title
    const sites = [
      { match: "youtube",   app: "YouTube" },
      { match: "facebook",  app: "Facebook" },
      { match: "instagram", app: "Instagram" },
      { match: "twitter",   app: "X (Twitter)" },
      { match: "/ x",       app: "X (Twitter)" },
      { match: "reddit",    app: "Reddit" },
      { match: "whatsapp",  app: "WhatsApp Web" },
      { match: "linkedin",  app: "LinkedIn" },
      { match: "github",    app: "GitHub" },
      { match: "gmail",     app: "Gmail" },
      { match: "google",    app: "Google" },
      { match: "chatgpt",   app: "ChatGPT" },
      { match: "netflix",   app: "Netflix" },
      { match: "amazon",    app: "Amazon" },
      { match: "spotify",   app: "Spotify Web" },
      { match: "stack overflow", app: "Stack Overflow" },
      { match: "stackoverflow", app: "Stack Overflow" },
      { match: "wikipedia", app: "Wikipedia" },
      { match: "telegram",  app: "Telegram Web" },
    ];

    for (const s of sites) {
      if (t.includes(s.match)) return { app: s.app, detail: cleaned };
    }

    return { app: browserName, detail: cleaned || "New Tab" };
  }

  // Desktop apps
  const apps = [
    { match: "code",              app: "VS Code" },
    { match: "devenv",            app: "Visual Studio" },
    { match: "explorer",          app: "File Explorer" },
    { match: "notepad",           app: "Notepad" },
    { match: "discord",           app: "Discord" },
    { match: "spotify",           app: "Spotify" },
    { match: "slack",             app: "Slack" },
    { match: "teams",             app: "Microsoft Teams" },
    { match: "winword",           app: "Microsoft Word" },
    { match: "excel",             app: "Microsoft Excel" },
    { match: "powerpnt",          app: "PowerPoint" },
    { match: "onenote",           app: "OneNote" },
    { match: "outlook",           app: "Outlook" },
    { match: "vlc",               app: "VLC Player" },
    { match: "wmplayer",          app: "Windows Media Player" },
    { match: "windowsterminal",   app: "Terminal" },
    { match: "cmd",               app: "Command Prompt" },
    { match: "mintty",            app: "Git Bash" },
    { match: "gimp",              app: "GIMP" },
    { match: "photoshop",         app: "Photoshop" },
    { match: "figma",             app: "Figma" },
    { match: "obs",               app: "OBS Studio" },
    { match: "telegram",          app: "Telegram" },
    { match: "signal",            app: "Signal" },
    { match: "zoom",              app: "Zoom" },
    { match: "calc",              app: "Calculator" },
    { match: "mspaint",           app: "Paint" },
    { match: "snippingtool",      app: "Snipping Tool" },
    { match: "searchhost",        app: "Windows Search" },
    { match: "applicationframehost", app: "Windows App" },
  ];

  for (const a of apps) {
    if (p.includes(a.match)) return { app: a.app, detail: title };
  }

  // Fallback: capitalize process name
  const fallbackApp = processName.charAt(0).toUpperCase() + processName.slice(1);
  return { app: fallbackApp, detail: title };
}

// ── Format helpers ──────────────────────────────────────
function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// ── Handle incoming window data ─────────────────────────
function handleWindowData(sessionId, title, processName) {
  const state = sessions.get(sessionId);
  if (!state) return;

  const classified = classify(title, processName);
  const now = new Date();

  // Skip idle
  if (classified.app === "Idle / Locked") return;

  const current = state.currentActivity;

  if (!current || current.app !== classified.app) {
    // App changed → close previous, start new
    if (current) {
      current.endTime = now;
      current.duration = now - current.startTime;
      state.activities.push({ ...current });
    }
    state.currentActivity = {
      app: classified.app,
      detail: classified.detail,
      startTime: now,
    };
  } else {
    // Same app — update detail (tab title may change)
    current.detail = classified.detail;
  }
}

// ── Start tracking for a session ────────────────────────
function startTracking(sessionId) {
  if (sessions.has(sessionId)) return;

  const state = {
    psProcess: null,
    currentActivity: null,
    activities: [],
    loginTime: new Date(),
  };

  // Spawn a single persistent PowerShell process
  const ps = spawn("powershell.exe", [
    "-WindowStyle", "Hidden",
    "-ExecutionPolicy", "Bypass",
    "-File", PS_SCRIPT,
  ], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,         // critical: don't create a visible window
  });

  state.psProcess = ps;

  // Read JSON lines from stdout
  const rl = readline.createInterface({ input: ps.stdout });
  rl.on("line", (line) => {
    try {
      const data = JSON.parse(line.trim());
      handleWindowData(sessionId, data.title, data.process);
    } catch {
      // skip malformed lines
    }
  });

  ps.stderr.on("data", (data) => {
    // Silently ignore PS stderr noise
  });

  ps.on("error", (err) => {
    console.error(`Tracker process error for ${sessionId.slice(0, 8)}: ${err.message}`);
  });

  ps.on("exit", (code) => {
    console.log(`📡  Tracker process exited for ${sessionId.slice(0, 8)} (code ${code})`);
  });

  sessions.set(sessionId, state);
  console.log(`📡  Activity tracking started for session ${sessionId.slice(0, 8)}…`);
}

// ── Stop tracking and return the final activity list ────
function stopTracking(sessionId) {
  const state = sessions.get(sessionId);
  if (!state) return [];

  // Kill the PowerShell process
  if (state.psProcess && !state.psProcess.killed) {
    state.psProcess.kill("SIGTERM");
  }

  // Close the current activity
  const now = new Date();
  if (state.currentActivity) {
    state.currentActivity.endTime = now;
    state.currentActivity.duration = now - state.currentActivity.startTime;
    state.activities.push({ ...state.currentActivity });
  }

  // Build formatted result
  const result = state.activities
    .filter((a) => a.duration >= 3000) // ignore < 3s blips
    .map((a) => ({
      app: a.app,
      detail: a.detail,
      from: formatTime(a.startTime),
      to: formatTime(a.endTime),
      duration: formatDuration(a.duration),
      durationMs: a.duration,
    }));

  sessions.delete(sessionId);
  console.log(`📡  Activity tracking stopped for session ${sessionId.slice(0, 8)}… (${result.length} activities)`);

  return result;
}

// ── Get live activities for the dashboard ────────────────
function getLiveActivities(sessionId) {
  const state = sessions.get(sessionId);
  if (!state) return [];

  const now = new Date();
  const all = [...state.activities];

  if (state.currentActivity) {
    all.push({
      ...state.currentActivity,
      endTime: now,
      duration: now - state.currentActivity.startTime,
      inProgress: true,
    });
  }

  return all
    .filter((a) => a.duration >= 3000)
    .map((a) => ({
      app: a.app,
      detail: a.detail,
      from: formatTime(a.startTime),
      to: a.inProgress ? "now" : formatTime(a.endTime),
      duration: formatDuration(a.duration),
      inProgress: !!a.inProgress,
    }));
}

module.exports = { startTracking, stopTracking, getLiveActivities };
