/**
 * Application Entry Point (ES6 Module)
 * Orchestrates timers, schedule state, UI updates, and user interactions.
 */

import { scheduler, DAYS_OF_WEEK } from './scheduler.js';
import { CountdownTimer, ScheduledTaskManager, padZero, calculateTimeRemaining } from './timer.js';
import { updateClockUI, updateHeroBannerUI, renderScheduleList } from './ui.js';
import { showToast, playChime } from './notifications.js';
import { resetToDefaults } from './storage.js';

// Application State
let activeDayFilter = 'all';
let simulatedOffsetMs = 0; // Allows simulating different times for testing timers!
let lastKnownActiveClassId = null;
let lastKnownNextClassId = null;

// Initialize Scheduled Tasks Manager (uses setTimeout & clearTimeout)
const alertTaskManager = new ScheduledTaskManager();

/**
 * Get current application time (either real or time-shifted for simulation)
 * @returns {Date}
 */
function getCurrentAppTime() {
    return new Date(Date.now() + simulatedOffsetMs);
}

/**
 * Master Clock and Schedule Ticker
 * Powered by setInterval() - ticks every 1,000 milliseconds
 */
let masterIntervalId = null;

function startMasterTicker() {
    if (masterIntervalId !== null) {
        clearInterval(masterIntervalId);
    }

    const tick = () => {
        const now = getCurrentAppTime();

        // 1. Update live clock display
        updateClockUI(now);

        // 2. Resolve schedule status
        const scheduleState = scheduler.resolveScheduleState(now);

        // 3. Update Hero Countdown / Live Session Banner
        updateHeroBannerUI(scheduleState);

        // 4. Check for state transitions (e.g., class just started or ended)
        handleScheduleTransitions(scheduleState);
    };

    // Immediate tick
    tick();

    // setInterval() for real-time 1-second cadence
    masterIntervalId = setInterval(tick, 1000);
}

/**
 * Detects when a class begins or ends and triggers real-time alerts
 */
function handleScheduleTransitions(state) {
    const activeId = state.activeClass ? state.activeClass.id : null;
    const nextId = state.nextClass ? state.nextClass.id : null;

    if (activeId !== lastKnownActiveClassId) {
        if (state.activeClass) {
            showToast(
                'Class Started!',
                `"${state.activeClass.code}: ${state.activeClass.title}" is now in session in ${state.activeClass.room}.`,
                'alert',
                6000
            );
        } else if (lastKnownActiveClassId !== null) {
            showToast(
                'Class Ended',
                'The previous class session has concluded.',
                'info',
                4000
            );
        }
        lastKnownActiveClassId = activeId;
        refreshScheduleDisplay();
    }

    if (nextId !== lastKnownNextClassId) {
        lastKnownNextClassId = nextId;
        scheduleUpcomingClassAlerts(state);
    }
}

/**
 * Sets up delayed alerts for upcoming classes using setTimeout()
 */
function scheduleUpcomingClassAlerts(state) {
    alertTaskManager.clearAll();

    if (!state.nextClass || !state.nextOccurrenceDate) return;

    const nextClass = state.nextClass;
    const startTimeMs = state.nextOccurrenceDate.getTime();
    const reminder5MinMs = startTimeMs - (5 * 60 * 1000);

    // Schedule 5-minute advance reminder via setTimeout
    alertTaskManager.scheduleAt('reminder-5m-' + nextClass.id, reminder5MinMs, () => {
        showToast(
            'Upcoming Class Reminder',
            `"${nextClass.code}: ${nextClass.title}" starts in 5 minutes in ${nextClass.room}!`,
            'warning',
            7000
        );
    });
}

/**
 * Refresh the timetable cards based on the selected day filter
 */
function refreshScheduleDisplay() {
    const now = getCurrentAppTime();
    let displayDay = activeDayFilter;
    if (activeDayFilter === 'today') {
        displayDay = now.getDay();
    }

    const classesToRender = scheduler.getClassesByDay(displayDay);
    const scheduleState = scheduler.resolveScheduleState(now);

    renderScheduleList(classesToRender, scheduleState, (classIdToDelete) => {
        const deleted = scheduler.deleteClass(classIdToDelete);
        if (deleted) {
            showToast('Class Removed', 'The class was removed from your schedule.', 'info');
            refreshScheduleDisplay();
            scheduleUpcomingClassAlerts(scheduler.resolveScheduleState(getCurrentAppTime()));
        }
    });
}

/**
 * Setup Day Filter buttons
 */
function setupDayFilters() {
    const filterContainer = document.getElementById('dayFilters');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-filter]');
        if (!btn) return;

        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        activeDayFilter = btn.getAttribute('data-filter');
        refreshScheduleDisplay();
    });
}

/**
 * Setup Modal and Add Class Form
 */
function setupAddClassForm() {
    const openBtn = document.getElementById('btnOpenAddModal');
    const closeBtn = document.getElementById('btnCloseAddModal');
    const cancelBtn = document.getElementById('btnCancelAddModal');
    const modal = document.getElementById('addClassModal');
    const form = document.getElementById('addClassForm');
    const daySelect = document.getElementById('classDay');

    if (!modal || !form) return;

    const openModal = () => {
        modal.classList.add('active');
        // Pre-select today's day in the dropdown
        if (daySelect) {
            daySelect.value = getCurrentAppTime().getDay();
        }
    };

    const closeModal = () => {
        modal.classList.remove('active');
        form.reset();
    };

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('classTitle').value;
        const code = document.getElementById('classCode').value;
        const instructor = document.getElementById('classInstructor').value;
        const room = document.getElementById('classRoom').value;
        const day = document.getElementById('classDay').value;
        const startTime = document.getElementById('classStartTime').value;
        const endTime = document.getElementById('classEndTime').value;
        const color = document.querySelector('input[name="classColor"]:checked')?.value || '#6366f1';

        if (startTime >= endTime) {
            showToast('Invalid Times', 'End time must be after the start time.', 'warning');
            return;
        }

        scheduler.addClass({
            title,
            code,
            instructor,
            room,
            day,
            startTime,
            endTime,
            color
        });

        closeModal();
        showToast('Class Added!', `"${code}: ${title}" was added to the schedule.`, 'success');
        refreshScheduleDisplay();
        scheduleUpcomingClassAlerts(scheduler.resolveScheduleState(getCurrentAppTime()));
    });
}

/**
 * Custom Study Session / Exam Countdown Timer
 * Demonstrates CountdownTimer class with setInterval(), clearInterval(), and setTimeout()
 */
let customTimer = null;

function setupCustomCountdownTimer() {
    const displayMinutes = document.getElementById('timerMinutes');
    const displaySeconds = document.getElementById('timerSeconds');
    const btnStart = document.getElementById('btnTimerStart');
    const btnPause = document.getElementById('btnTimerPause');
    const btnReset = document.getElementById('btnTimerReset');
    const customMinutesInput = document.getElementById('timerCustomMinutes');
    const timerProgressRing = document.getElementById('timerProgressRing');
    const timerPresetBtns = document.querySelectorAll('.timer-preset-btn');
    const timerStatusText = document.getElementById('timerStatusText');

    let currentInitialMs = 25 * 60 * 1000; // Default 25 min (Pomodoro)

    const updateTimerDisplay = (remainingMs, progressPercent) => {
        const { minutes, seconds } = calculateTimeRemaining(remainingMs);
        if (displayMinutes) displayMinutes.textContent = padZero(minutes);
        if (displaySeconds) displaySeconds.textContent = padZero(seconds);

        if (timerProgressRing) {
            // Stroke dashoffset for SVG ring (circumference is approx 283 for r=45)
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (progressPercent / 100) * circumference;
            timerProgressRing.style.strokeDashoffset = offset;
        }
    };

    customTimer = new CountdownTimer({
        durationMs: currentInitialMs,
        onTick: (remainingMs, progressPercent) => {
            updateTimerDisplay(remainingMs, progressPercent);
        },
        onComplete: () => {
            if (timerStatusText) timerStatusText.textContent = '🎉 Completed!';
            if (btnStart) {
                btnStart.textContent = 'Start';
                btnStart.classList.remove('hidden');
            }
            if (btnPause) btnPause.classList.add('hidden');

            playChime();
            showToast('Timer Finished!', 'Your study/countdown session has completed. Great work!', 'alert', 8000);

            // Flash effect using setTimeout
            const card = document.getElementById('customTimerCard');
            if (card) {
                card.classList.add('timer-finished-glow');
                setTimeout(() => card.classList.remove('timer-finished-glow'), 3000);
            }
        }
    });

    updateTimerDisplay(currentInitialMs, 0);

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            if (customTimer.isPaused) {
                customTimer.resume();
            } else {
                customTimer.start();
            }
            btnStart.classList.add('hidden');
            if (btnPause) btnPause.classList.remove('hidden');
            if (timerStatusText) timerStatusText.textContent = 'Focus Session Active';
        });
    }

    if (btnPause) {
        btnPause.addEventListener('click', () => {
            customTimer.pause();
            btnPause.classList.add('hidden');
            if (btnStart) {
                btnStart.textContent = 'Resume';
                btnStart.classList.remove('hidden');
            }
            if (timerStatusText) timerStatusText.textContent = 'Paused';
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            customTimer.reset(currentInitialMs);
            if (btnStart) {
                btnStart.textContent = 'Start';
                btnStart.classList.remove('hidden');
            }
            if (btnPause) btnPause.classList.add('hidden');
            if (timerStatusText) timerStatusText.textContent = 'Ready to Start';
        });
    }

    // Preset buttons (15m, 25m, 45m, 60m)
    timerPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timerPresetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mins = parseInt(btn.getAttribute('data-mins'), 10);
            currentInitialMs = mins * 60 * 1000;
            customTimer.reset(currentInitialMs);

            if (btnStart) {
                btnStart.textContent = 'Start';
                btnStart.classList.remove('hidden');
            }
            if (btnPause) btnPause.classList.add('hidden');
            if (timerStatusText) timerStatusText.textContent = `${mins}m Session Ready`;
        });
    });

    // Custom minutes input
    if (customMinutesInput) {
        customMinutesInput.addEventListener('change', () => {
            let val = parseInt(customMinutesInput.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 360) val = 360;
            customMinutesInput.value = val;

            timerPresetBtns.forEach(b => b.classList.remove('active'));
            currentInitialMs = val * 60 * 1000;
            customTimer.reset(currentInitialMs);

            if (btnStart) {
                btnStart.textContent = 'Start';
                btnStart.classList.remove('hidden');
            }
            if (btnPause) btnPause.classList.add('hidden');
            if (timerStatusText) timerStatusText.textContent = `${val}m Custom Session Ready`;
        });
    }
}

/**
 * Setup Time Simulation Controls ("Time Machine")
 * Allows evaluator/user to simulate different days & times to see
 * timers, countdowns, and active classes in action.
 */
function setupSimulationControls() {
    const simSelect = document.getElementById('simulationSelect');
    const btnResetTime = document.getElementById('btnResetTime');
    const simIndicator = document.getElementById('simIndicator');

    if (!simSelect) return;

    simSelect.addEventListener('change', () => {
        const value = simSelect.value;
        if (value === 'real') {
            simulatedOffsetMs = 0;
            if (simIndicator) simIndicator.classList.add('hidden');
            showToast('Real Time Restored', 'The app is now synced with your system clock.', 'info');
        } else {
            // Calculate offset to jump to target day and hour
            const [targetDayStr, targetHourStr, targetMinStr] = value.split(':');
            const targetDay = parseInt(targetDayStr, 10);
            const targetHour = parseInt(targetHourStr, 10);
            const targetMin = parseInt(targetMinStr, 10);

            const now = new Date();
            const currentDay = now.getDay();
            let dayDiff = targetDay - currentDay;

            const targetDate = new Date(now.getTime());
            targetDate.setDate(now.getDate() + dayDiff);
            targetDate.setHours(targetHour, targetMin, 0, 0);

            simulatedOffsetMs = targetDate.getTime() - Date.now();
            if (simIndicator) {
                simIndicator.classList.remove('hidden');
                simIndicator.textContent = `⏱️ Simulating: ${DAYS_OF_WEEK[targetDay]} ${padZero(targetHour)}:${padZero(targetMin)}`;
            }

            showToast(
                'Time Machine Activated',
                `Simulating ${DAYS_OF_WEEK[targetDay]} at ${padZero(targetHour)}:${padZero(targetMin)}. Observe live countdown updates!`,
                'info'
            );
        }

        refreshScheduleDisplay();
    });

    if (btnResetTime) {
        btnResetTime.addEventListener('click', () => {
            simulatedOffsetMs = 0;
            if (simSelect) simSelect.value = 'real';
            if (simIndicator) simIndicator.classList.add('hidden');
            showToast('Real Time Restored', 'Clock reset to actual current time.', 'info');
            refreshScheduleDisplay();
        });
    }

    // Reset default classes button
    const btnResetData = document.getElementById('btnResetScheduleData');
    if (btnResetData) {
        btnResetData.addEventListener('click', () => {
            if (confirm('Reset schedule to the default sample courses?')) {
                resetToDefaults();
                location.reload();
            }
        });
    }
}

/**
 * Initialize application once DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize custom study timer
    setupCustomCountdownTimer();

    // 2. Setup schedule navigation & filtering
    setupDayFilters();

    // 3. Setup Add Class modal & form
    setupAddClassForm();

    // 4. Setup Time Machine simulation helper
    setupSimulationControls();

    // 5. Initial schedule render
    refreshScheduleDisplay();

    // 6. Start 1-second master interval timer
    startMasterTicker();

    // Welcome toast notification using setTimeout
    setTimeout(() => {
        showToast(
            'Scheduler & Countdown Ready',
            'Real-time class timers active with ES6 modules & JavaScript intervals.',
            'info',
            5000
        );
    }, 600);
});
