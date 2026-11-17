// ─────────────────────────────────────────────────────────
//  server.js  –  Login/Logout tracker with in-memory logs
//                + automatic PC activity monitoring
//                emailed to the user on logout via Gmail SMTP
// ─────────────────────────────────────────────────────────
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const dns = require("dns");
const { startTracking, stopTracking, getLiveActivities } = require("./tracker");

// ── Load .env manually (no extra dependency) ────────────
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .forEach((line) => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      const idx = line.indexOf("=");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    });
}
loadEnv(path.join(__dirname, ".env"));

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "session-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 hours
  })
);

// ── In-memory user store  { email: { passwordHash } } ───
const users = {};

// ── In-memory session logs  { sessionId: [ ...entries ] }
const sessionLogs = {};

// ── SMTP health flag (set at startup) ───────────────────
let smtpReady = false;
let smtpError = "";

// ── Helpers ─────────────────────────────────────────────
function timestamp() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function addLog(sessionId, message) {
  if (!sessionLogs[sessionId]) sessionLogs[sessionId] = [];
  sessionLogs[sessionId].push(`[${timestamp()}]  ${message}`);
}

function buildLogText(sessionId, activities) {
  const entries = sessionLogs[sessionId] || [];

  let text =
    "═══════════════════════════════════════════════════════════════\n" +
    "                    SESSION ACTIVITY LOG\n" +
    "═══════════════════════════════════════════════════════════════\n\n";

  // Login / logout header
  text += entries.join("\n") + "\n";

  // Activity table
  if (activities.length > 0) {
    text +=
      "\n───────────────────────────────────────────────────────────────\n" +
      "  PC ACTIVITY DURING SESSION\n" +
      "───────────────────────────────────────────────────────────────\n\n";

    // Column widths
    const appW = Math.max(12, ...activities.map((a) => a.app.length)) + 2;

    text += "  " +
      "Application".padEnd(appW) +
      "From".padEnd(16) +
      "To".padEnd(16) +
      "Duration\n";
    text += "  " + "─".repeat(appW + 16 + 16 + 10) + "\n";

    for (const a of activities) {
      text += "  " +
        a.app.padEnd(appW) +
        a.from.padEnd(16) +
        a.to.padEnd(16) +
        a.duration + "\n";
    }

    // Summary
    const totalMs = activities.reduce((sum, a) => sum + a.durationMs, 0);
    const totalMins = Math.round(totalMs / 60000);
    text += `\n  Total tracked time: ${totalMins} minutes across ${activities.length} activities\n`;
  } else {
    text += "\n  (No PC activities were recorded during this session)\n";
  }

  text +=
    "\n═══════════════════════════════════════════════════════════════\n" +
    "                      END OF LOG\n" +
    "═══════════════════════════════════════════════════════════════\n";

  return text;
}

// ── Email existence check via DNS MX records ────────────
const TRUSTED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com",
  "yahoo.com", "icloud.com", "protonmail.com", "proton.me",
]);

function verifyEmailDomain(email) {
  return new Promise((resolve) => {
    const domain = (email.split("@")[1] || "").toLowerCase();
    if (!domain) return resolve({ valid: false, reason: "Invalid email format." });
    if (TRUSTED_DOMAINS.has(domain)) return resolve({ valid: true });

    dns.resolveMx(domain, (err, addresses) => {
      if (err) {
        console.warn(`DNS MX lookup failed for ${domain}: ${err.code} – allowing anyway`);
        return resolve({ valid: true });
      }
      if (!addresses || addresses.length === 0) {
        return resolve({
          valid: false,
          reason: `The domain "${domain}" has no mail servers. This email cannot receive mail.`,
        });
      }
      resolve({ valid: true });
    });
  });
}

function isValidGmailFormat(email) {
  const lower = email.toLowerCase();
  if (!lower.endsWith("@gmail.com")) return { valid: false, reason: "Only @gmail.com addresses are allowed." };
  const local = lower.split("@")[0];
  if (local.length < 6 || local.length > 30)
    return { valid: false, reason: "Gmail usernames are between 6 and 30 characters." };
  if (/[^a-z0-9.]/.test(local))
    return { valid: false, reason: "Gmail usernames can only contain letters, numbers, and dots." };
  if (local.startsWith(".") || local.endsWith("."))
    return { valid: false, reason: "Gmail usernames cannot start or end with a dot." };
  if (/\.{2,}/.test(local))
    return { valid: false, reason: "Gmail usernames cannot have consecutive dots." };
  return { valid: true };
}

// ── Gmail SMTP transporter ──────────────────────────────
let transporter = null;

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || user === "your-sender-email@gmail.com" || pass === "xxxx xxxx xxxx xxxx") {
    return null;
  }
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

async function verifySmtp() {
  transporter = createTransporter();
  if (!transporter) {
    smtpReady = false;
    smtpError = "GMAIL_USER / GMAIL_APP_PASSWORD not configured. Edit the .env file.";
    console.error(`\n❌  ${smtpError}\n`);
    return;
  }
  try {
    await transporter.verify();
    smtpReady = true;
    smtpError = "";
    console.log(`✅  SMTP verified – sending as ${process.env.GMAIL_USER}\n`);
  } catch (err) {
    smtpReady = false;
    transporter = null;
    smtpError = err.message.includes("Username and Password not accepted")
      ? "Gmail rejected credentials. Use an App Password from https://myaccount.google.com/apppasswords"
      : `SMTP verification failed: ${err.message}`;
    console.error(`\n❌  ${smtpError}\n`);
  }
}

async function sendLogEmail(recipientEmail, logText) {
  if (!smtpReady || !transporter) {
    return { sent: false, reason: smtpError || "Mail transporter not configured." };
  }

  const mailOptions = {
    from: `"Session Logger" <${process.env.GMAIL_USER}>`,
    to: recipientEmail,
    subject: `Your Session Log – ${timestamp()}`,
    text: `Hi,\n\nPlease find your session activity log attached.\n\nRegards,\nSession Logger`,
    attachments: [
      {
        filename: `session-log-${Date.now()}.txt`,
        content: Buffer.from(logText, "utf-8"), // entirely in memory
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉  Log emailed to ${recipientEmail}`);
    return { sent: true };
  } catch (err) {
    let reason = err.message;
    if (reason.includes("Invalid rcpt") || reason.includes("550"))
      reason = `The email "${recipientEmail}" does not exist or cannot receive mail.`;
    console.error("Email send error:", reason);
    return { sent: false, reason };
  }
}

// ── Auth middleware ──────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

// ══════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════

app.get("/api/smtp-status", (_req, res) => {
  res.json({ ready: smtpReady, error: smtpError });
});

// ── Register ────────────────────────────────────────────
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  const fmtCheck = isValidGmailFormat(email);
  if (!fmtCheck.valid)
    return res.status(400).json({ error: fmtCheck.reason });

  const mxCheck = await verifyEmailDomain(email);
  if (!mxCheck.valid)
    return res.status(400).json({ error: mxCheck.reason });

  if (users[email.toLowerCase()])
    return res.status(409).json({ error: "User already registered." });

  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });

  const hash = await bcrypt.hash(password, 10);
  users[email.toLowerCase()] = { passwordHash: hash };
  return res.json({ message: "Registration successful. You can now log in." });
});

// ── Login ───────────────────────────────────────────────
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  const user = users[email.toLowerCase()];
  if (!user) return res.status(401).json({ error: "Invalid email or password." });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: "Invalid email or password." });

  const sid = req.sessionID;
  req.session.user = email.toLowerCase();
  req.session.loginTime = timestamp();

  // Start session log
  sessionLogs[sid] = [];
  addLog(sid, `LOGIN  – User: ${email}`);
  addLog(sid, `Login Time: ${timestamp()}`);

  // Start automatic PC activity tracking
  startTracking(sid);

  return res.json({
    message: "Login successful.",
    loginTime: req.session.loginTime,
    smtpReady,
    smtpError,
  });
});

// ── Dashboard data ──────────────────────────────────────
app.get("/api/status", requireAuth, (req, res) => {
  res.json({
    email: req.session.user,
    loginTime: req.session.loginTime,
    smtpReady,
    smtpError,
  });
});

// ── Get live activities (auto-tracked) ──────────────────
app.get("/api/activities", requireAuth, (req, res) => {
  const activities = getLiveActivities(req.sessionID);
  res.json({ activities });
});

// ── Get session log entries ─────────────────────────────
app.get("/api/log", requireAuth, (req, res) => {
  const entries = sessionLogs[req.sessionID] || [];
  res.json({ entries });
});

// ── Logout  →  stop tracker  →  email log  →  purge ────
app.post("/api/logout", requireAuth, async (req, res) => {
  const sid = req.sessionID;
  const email = req.session.user;
  const logoutTime = timestamp();

  // Stop activity tracker and get final activities
  const activities = stopTracking(sid);

  addLog(sid, `LOGOUT – User: ${email}`);
  addLog(sid, `Logout Time: ${logoutTime}`);

  const logText = buildLogText(sid, activities);

  // Send email with the log as an in-memory attachment
  const result = await sendLogEmail(email, logText);

  // Purge everything from memory
  delete sessionLogs[sid];

  req.session.destroy(() => {});

  return res.json({
    message: result.sent
      ? "Logged out. Session log has been emailed to you."
      : `Logged out. Email failed: ${result.reason}`,
    logoutTime,
    emailSent: result.sent,
    emailError: result.reason || null,
    activitiesCount: activities.length,
  });
});

// ── Fallback: serve index.html ──────────────────────────
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀  Server running at  http://localhost:${PORT}\n`);
  await verifySmtp();
});
