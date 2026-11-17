/**
 * Notifications Module (ES6 Module)
 * Handles toast alert popups and audio chimes using setTimeout() and clearTimeout().
 */

let audioContext = null;

/**
 * Initializes and returns the shared Web Audio API context
 */
function getAudioContext() {
    if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            audioContext = new AudioCtx();
        }
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

/**
 * Play a gentle alert chime using Web Audio API synthesis
 * (No external audio file dependencies)
 */
export function playChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // 2-tone melodic chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.6);
    } catch (e) {
        console.warn('Audio playback not permitted or not supported yet.', e);
    }
}

/**
 * Displays a toast notification that automatically dismisses after `durationMs`
 * Demonstrates:
 * 1. setTimeout() for auto-removal
 * 2. clearTimeout() for manual dismissal
 * 
 * @param {string} title 
 * @param {string} message 
 * @param {'info' | 'success' | 'warning' | 'alert'} type 
 * @param {number} durationMs - Default 4000ms
 */
export function showToast(title, message, type = 'info', durationMs = 4500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        alert: '🔔'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || '🔔'}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close notification">&times;</button>
        <div class="toast-progress">
            <div class="toast-progress-bar" style="animation-duration: ${durationMs}ms;"></div>
        </div>
    `;

    container.appendChild(toast);

    // setTimeout to auto-remove toast after specified duration
    const timeoutId = setTimeout(() => {
        dismissToast(toast);
    }, durationMs);

    // If user clicks the close button, cancel timeout with clearTimeout()
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeoutId);
        dismissToast(toast);
    });

    if (type === 'alert' || type === 'warning') {
        playChime();
    }
}

/**
 * Animate and remove toast element
 * @param {HTMLElement} toast 
 */
function dismissToast(toast) {
    toast.classList.add('toast-fade-out');
    // Using setTimeout to allow CSS exit transition to finish before DOM removal
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}
