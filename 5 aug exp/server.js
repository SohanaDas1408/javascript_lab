// ============================================
//  Mobile OTP Verification Server
//  Real backend with OTP generation, expiry,
//  rate-limiting, and attempt tracking.
//  OTP is returned to the frontend for demo
//  (in production, this would go via SMS).
// ============================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = 3000;

// OTP Configuration
const OTP_LENGTH     = 6;
const OTP_EXPIRY_SEC = 120;   // 2 minutes
const MAX_ATTEMPTS   = 5;     // max wrong attempts before lockout

// In-memory OTP store  { phone: { otp, expiresAt, attempts } }
const otpStore = {};

// ──────────────────────────────────────────────
//  Middleware
// ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // serve index.html, style.css, script.js

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

/** Generate a random numeric OTP */
function generateOTP() {
    let otp = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
}

// ──────────────────────────────────────────────
//  API Routes
// ──────────────────────────────────────────────

/**
 *  POST /api/send-otp
 *  Body: { phone: "9876543210" }
 *
 *  Generates OTP, stores it server-side with a
 *  2-minute expiry, and returns it in the response
 *  for demo purposes. In production, this OTP
 *  would be sent via an SMS gateway (e.g. Fast2SMS,
 *  Twilio) and NOT included in the response.
 */
app.post('/api/send-otp', (req, res) => {
    const { phone } = req.body;

    // ── Server-side validation ──
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid 10-digit Indian mobile number.',
        });
    }

    // ── Rate-limiting: block if OTP was sent < 10s ago ──
    const existing = otpStore[phone];
    if (existing && existing.expiresAt > Date.now()) {
        const remainingSec = Math.ceil((existing.expiresAt - Date.now()) / 1000);
        if (remainingSec > OTP_EXPIRY_SEC - 10) {
            return res.status(429).json({
                success: false,
                message: 'OTP already sent. Please wait before requesting again.',
                remainingSec,
            });
        }
    }

    // ── Generate & store OTP with expiry ──
    const otp = generateOTP();

    otpStore[phone] = {
        otp,
        expiresAt: Date.now() + (OTP_EXPIRY_SEC * 1000),
        attempts: 0,
    };

    console.log(`[OTP GENERATED] ${phone} → ${otp}  (expires in ${OTP_EXPIRY_SEC}s)`);

    // ── In production, call SMS API here ──
    // await sendSMS(phone, otp);

    // ── Return OTP in response for demo ──
    return res.json({
        success: true,
        message: 'OTP sent successfully.',
        expirySeconds: OTP_EXPIRY_SEC,
        demo_otp: otp,   // ⚠️ DEMO ONLY — remove in production
    });
});

/**
 *  POST /api/verify-otp
 *  Body: { phone: "9876543210", otp: "123456" }
 *
 *  Validates the OTP against the server-side store.
 *  Rejects if: expired, too many attempts, or wrong code.
 */
app.post('/api/verify-otp', (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({
            success: false,
            message: 'Phone number and OTP are required.',
        });
    }

    const record = otpStore[phone];

    // No OTP was generated for this number
    if (!record) {
        return res.status(400).json({
            success: false,
            message: 'No OTP was sent to this number. Please request a new one.',
        });
    }

    // ── Check expiry (2 minutes) ──
    if (record.expiresAt < Date.now()) {
        delete otpStore[phone];
        console.log(`[EXPIRED] ${phone}`);
        return res.status(400).json({
            success: false,
            message: 'OTP has expired. Please request a new one.',
            expired: true,
        });
    }

    // ── Check attempt limit ──
    if (record.attempts >= MAX_ATTEMPTS) {
        delete otpStore[phone];
        console.log(`[LOCKED OUT] ${phone} — too many wrong attempts`);
        return res.status(429).json({
            success: false,
            message: 'Too many failed attempts. Please request a new OTP.',
            expired: true,
        });
    }

    // ── Verify OTP ──
    if (record.otp === otp) {
        delete otpStore[phone];   // one-time use — delete after success
        console.log(`[VERIFIED ✓] ${phone}`);
        return res.json({
            success: true,
            message: 'Phone number verified successfully!',
        });
    } else {
        record.attempts++;
        const remaining = MAX_ATTEMPTS - record.attempts;
        console.log(`[WRONG OTP] ${phone} — ${remaining} attempts left`);
        return res.status(400).json({
            success: false,
            message: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        });
    }
});

// ──────────────────────────────────────────────
//  Start Server
// ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀  OTP Verification Server running at  http://localhost:${PORT}`);
    console.log(`📋  OTP expires after ${OTP_EXPIRY_SEC} seconds`);
    console.log(`🔒  Max ${MAX_ATTEMPTS} wrong attempts before lockout`);
    console.log(`💡  Demo mode: OTP is shown in a toast on the webpage\n`);
});
