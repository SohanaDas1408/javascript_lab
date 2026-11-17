/**
 * Timer Module (ES6 Module)
 * Handles high-precision countdowns, master clock tickers, and scheduled triggers
 * using setInterval(), setTimeout(), clearInterval(), and clearTimeout().
 */

/**
 * Pads a single-digit number with a leading zero
 * @param {number} num 
 * @returns {string}
 */
export function padZero(num) {
    return num.toString().padStart(2, '0');
}

/**
 * Formats a duration in milliseconds into { days, hours, minutes, seconds }
 * @param {number} totalMs 
 * @returns {Object}
 */
export function calculateTimeRemaining(totalMs) {
    if (totalMs <= 0) {
        return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true };
    }

    const totalSeconds = Math.floor(totalMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        totalMs,
        days,
        hours,
        minutes,
        seconds,
        isFinished: false
    };
}

/**
 * Format milliseconds into a human-readable string HH:MM:SS
 * @param {number} totalMs 
 * @returns {string}
 */
export function formatDurationHHMMSS(totalMs) {
    const { hours, minutes, seconds } = calculateTimeRemaining(totalMs);
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

/**
 * Promise-based delay utility leveraging setTimeout()
 * @param {number} ms 
 * @returns {Promise<void>}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * CountdownTimer Class
 * Encapsulates an active countdown powered by setInterval()
 * with pause, resume, reset, and expiration callback capabilities.
 */
export class CountdownTimer {
    /**
     * @param {Object} options
     * @param {number} options.durationMs - Total countdown duration in ms
     * @param {Function} options.onTick - Callback executed on each interval tick: (remainingMs, progressPercent) => void
     * @param {Function} options.onComplete - Callback executed when timer reaches 0
     * @param {number} [options.intervalMs=1000] - Tick interval frequency
     */
    constructor({ durationMs = 0, onTick = () => {}, onComplete = () => {}, intervalMs = 1000 }) {
        this.totalDurationMs = durationMs;
        this.remainingMs = durationMs;
        this.intervalMs = intervalMs;
        this.onTick = onTick;
        this.onComplete = onComplete;

        this.intervalId = null;
        this.targetTimestamp = null;
        this.isRunning = false;
        this.isPaused = false;
    }

    /**
     * Start the countdown timer
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.targetTimestamp = Date.now() + this.remainingMs;

        // Perform immediate tick
        this._tick();

        // setInterval() drives the ticking cycle
        this.intervalId = setInterval(() => {
            this._tick();
        }, this.intervalMs);
    }

    /**
     * Internal tick processor
     */
    _tick() {
        const now = Date.now();
        this.remainingMs = Math.max(0, this.targetTimestamp - now);

        const progressPercent = this.totalDurationMs > 0
            ? Math.min(100, Math.max(0, ((this.totalDurationMs - this.remainingMs) / this.totalDurationMs) * 100))
            : 100;

        this.onTick(this.remainingMs, progressPercent);

        if (this.remainingMs <= 0) {
            this.stop();
            this.onComplete();
        }
    }

    /**
     * Pause the timer
     */
    pause() {
        if (!this.isRunning || this.isPaused) return;

        // Stop the setInterval ticker
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isPaused = true;
        this.isRunning = false;
    }

    /**
     * Resume a paused timer
     */
    resume() {
        if (!this.isPaused) return;
        this.start();
    }

    /**
     * Stop and cancel interval using clearInterval()
     */
    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        this.isPaused = false;
    }

    /**
     * Reset the timer to original duration or new duration
     * @param {number} [newDurationMs]
     */
    reset(newDurationMs) {
        this.stop();
        if (typeof newDurationMs === 'number') {
            this.totalDurationMs = newDurationMs;
        }
        this.remainingMs = this.totalDurationMs;
        this.onTick(this.remainingMs, 0);
    }
}

/**
 * ScheduledTaskManager
 * Manages one-shot alerts using setTimeout() with safe cancellation via clearTimeout()
 */
export class ScheduledTaskManager {
    constructor() {
        this.scheduledTasks = new Map();
    }

    /**
     * Schedule a one-shot task to execute at a specific target Date/Timestamp
     * @param {string} id Unique identifier
     * @param {Date | number} targetTime Date object or epoch ms
     * @param {Function} task Callback
     * @returns {boolean} Whether task was successfully scheduled
     */
    scheduleAt(id, targetTime, task) {
        this.cancel(id); // Cancel any previous task with same id

        const targetMs = targetTime instanceof Date ? targetTime.getTime() : targetTime;
        const delayMs = targetMs - Date.now();

        if (delayMs <= 0) {
            // Target is already in past
            return false;
        }

        // setTimeout() executes the delayed notification/task
        const timeoutId = setTimeout(() => {
            this.scheduledTasks.delete(id);
            task();
        }, delayMs);

        this.scheduledTasks.set(id, {
            timeoutId,
            targetMs,
            task
        });

        return true;
    }

    /**
     * Cancel a scheduled task using clearTimeout()
     * @param {string} id 
     */
    cancel(id) {
        if (this.scheduledTasks.has(id)) {
            const { timeoutId } = this.scheduledTasks.get(id);
            clearTimeout(timeoutId);
            this.scheduledTasks.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Clear all scheduled tasks
     */
    clearAll() {
        for (const [id, item] of this.scheduledTasks.entries()) {
            clearTimeout(item.timeoutId);
        }
        this.scheduledTasks.clear();
    }
}
