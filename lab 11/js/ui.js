/**
 * UI Module (ES6 Module)
 * Handles DOM rendering, responsive card updates, live clock display,
 * countdown badges, and interactive controls.
 */

import { DAYS_OF_WEEK, DAY_SHORT } from './scheduler.js';
import { calculateTimeRemaining, padZero } from './timer.js';

/**
 * Format a 24-hr time 'HH:MM' into 12-hr with AM/PM
 * @param {string} time24 
 * @returns {string}
 */
export function format12Hour(time24) {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let hours = parseInt(hStr, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${mStr} ${suffix}`;
}

/**
 * Update the header Live Digital Clock
 * @param {Date} now 
 */
export function updateClockUI(now) {
    const timeElem = document.getElementById('liveClockTime');
    const dateElem = document.getElementById('liveClockDate');
    const dayElem = document.getElementById('liveClockDay');

    if (!timeElem || !dateElem || !dayElem) return;

    let hours = now.getHours();
    const minutes = padZero(now.getMinutes());
    const seconds = padZero(now.getSeconds());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = padZero(hours % 12 || 12);

    timeElem.innerHTML = `${displayHours}:${minutes}:${seconds} <span class="ampm">${ampm}</span>`;
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    dateElem.textContent = now.toLocaleDateString(undefined, options);
    dayElem.textContent = DAYS_OF_WEEK[now.getDay()];
}

/**
 * Update Hero Banner displaying either Active Class Progress or Countdown to Next Class
 * @param {Object} state - State returned from scheduler.resolveScheduleState()
 */
export function updateHeroBannerUI(state) {
    const heroCard = document.getElementById('heroBannerCard');
    const statusTag = document.getElementById('heroStatusTag');
    const titleElem = document.getElementById('heroTitle');
    const metaElem = document.getElementById('heroMeta');
    const cdDays = document.getElementById('heroCdDays');
    const cdHours = document.getElementById('heroCdHours');
    const cdMins = document.getElementById('heroCdMins');
    const cdSecs = document.getElementById('heroCdSecs');
    const progressBar = document.getElementById('heroProgressBar');
    const progressLabel = document.getElementById('heroProgressLabel');

    if (!heroCard) return;

    if (state.activeClass) {
        // A class is actively ongoing right now!
        const cls = state.activeClass;
        statusTag.className = 'status-tag status-live';
        statusTag.innerHTML = '<span class="pulse-dot"></span> LIVE IN SESSION';

        titleElem.textContent = `${cls.code}: ${cls.title}`;
        metaElem.textContent = `${format12Hour(cls.startTime)} - ${format12Hour(cls.endTime)} | ${cls.room} | Instructor: ${cls.instructor}`;

        const remaining = calculateTimeRemaining(state.activeClassRemainingMs);
        if (cdDays) cdDays.textContent = padZero(remaining.days);
        if (cdHours) cdHours.textContent = padZero(remaining.hours);
        if (cdMins) cdMins.textContent = padZero(remaining.minutes);
        if (cdSecs) cdSecs.textContent = padZero(remaining.seconds);

        const pct = state.activeClassTotalMs > 0
            ? Math.min(100, Math.max(0, (state.activeClassElapsedMs / state.activeClassTotalMs) * 100))
            : 0;

        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressLabel) progressLabel.textContent = `Class Ends In: ${remaining.minutes}m ${remaining.seconds}s (${pct.toFixed(0)}% Completed)`;

        heroCard.style.borderColor = cls.color || '#6366f1';
    } else if (state.nextClass && state.msUntilNextClass !== null) {
        // Next class countdown
        const cls = state.nextClass;
        const nextDate = state.nextOccurrenceDate;
        const isToday = nextDate && nextDate.toDateString() === new Date().toDateString();

        statusTag.className = 'status-tag status-upcoming';
        statusTag.innerHTML = `⏱️ NEXT UPCOMING CLASS ${isToday ? '(Today)' : `(${DAYS_OF_WEEK[cls.day]})`}`;

        titleElem.textContent = `${cls.code}: ${cls.title}`;
        metaElem.textContent = `${format12Hour(cls.startTime)} - ${format12Hour(cls.endTime)} | ${cls.room} | Instructor: ${cls.instructor}`;

        const remaining = calculateTimeRemaining(state.msUntilNextClass);
        if (cdDays) cdDays.textContent = padZero(remaining.days);
        if (cdHours) cdHours.textContent = padZero(remaining.hours);
        if (cdMins) cdMins.textContent = padZero(remaining.minutes);
        if (cdSecs) cdSecs.textContent = padZero(remaining.seconds);

        if (progressBar) progressBar.style.width = '0%';
        if (progressLabel) {
            if (remaining.days > 0) {
                progressLabel.textContent = `Starts in ${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`;
            } else {
                progressLabel.textContent = `Starts in ${padZero(remaining.hours)}h ${padZero(remaining.minutes)}m ${padZero(remaining.seconds)}s`;
            }
        }

        heroCard.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    } else {
        // No classes scheduled
        statusTag.className = 'status-tag status-idle';
        statusTag.textContent = '🎉 NO CLASSES SCHEDULED';
        titleElem.textContent = 'All Caught Up!';
        metaElem.textContent = 'No upcoming classes found in schedule. Enjoy your free time or add a new course.';

        if (cdDays) cdDays.textContent = '00';
        if (cdHours) cdHours.textContent = '00';
        if (cdMins) cdMins.textContent = '00';
        if (cdSecs) cdSecs.textContent = '00';

        if (progressBar) progressBar.style.width = '0%';
        if (progressLabel) progressLabel.textContent = 'Free Time / No active timers';
        heroCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    }
}

/**
 * Render class list into timetable cards
 * @param {Array} classes 
 * @param {Object} scheduleState 
 * @param {Function} onDeleteCallback 
 */
export function renderScheduleList(classes, scheduleState, onDeleteCallback) {
    const listContainer = document.getElementById('scheduleList');
    const emptyState = document.getElementById('scheduleEmptyState');
    const countBadge = document.getElementById('scheduleCountBadge');

    if (!listContainer) return;

    if (countBadge) {
        countBadge.textContent = `${classes.length} class${classes.length !== 1 ? 'es' : ''}`;
    }

    if (classes.length === 0) {
        listContainer.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    const now = new Date();
    const todayDay = now.getDay();
    const currentTimeStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;

    listContainer.innerHTML = classes.map(item => {
        const isToday = item.day === todayDay;
        const isLive = scheduleState.activeClass && scheduleState.activeClass.id === item.id;
        const isNext = scheduleState.nextClass && scheduleState.nextClass.id === item.id;
        const isPastToday = isToday && currentTimeStr >= item.endTime;

        let statusBadgeHtml = '';
        let cardClass = 'class-card';

        if (isLive) {
            cardClass += ' is-live';
            statusBadgeHtml = `<span class="badge badge-live"><span class="pulse-dot"></span> LIVE NOW</span>`;
        } else if (isNext) {
            cardClass += ' is-next';
            statusBadgeHtml = `<span class="badge badge-next">⚡ NEXT UP</span>`;
        } else if (isPastToday) {
            cardClass += ' is-past';
            statusBadgeHtml = `<span class="badge badge-past">✓ FINISHED TODAY</span>`;
        } else if (isToday) {
            statusBadgeHtml = `<span class="badge badge-today">TODAY</span>`;
        } else {
            statusBadgeHtml = `<span class="badge badge-day">${DAY_SHORT[item.day]}</span>`;
        }

        return `
            <div class="${cardClass}" style="--card-accent: ${item.color || '#6366f1'};" data-id="${item.id}">
                <div class="card-color-stripe" style="background: ${item.color || '#6366f1'};"></div>
                <div class="card-content">
                    <div class="card-header">
                        <div class="card-meta-top">
                            <span class="card-day-pill">${DAYS_OF_WEEK[item.day]}</span>
                            ${statusBadgeHtml}
                        </div>
                        <button class="card-btn-delete" data-action="delete" data-id="${item.id}" title="Remove class">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="card-main">
                        <span class="card-code" style="color: ${item.color || '#6366f1'};">${item.code}</span>
                        <h3 class="card-title">${item.title}</h3>
                    </div>

                    <div class="card-details">
                        <div class="detail-row">
                            <span class="detail-icon">⏰</span>
                            <span class="detail-text">${format12Hour(item.startTime)} - ${format12Hour(item.endTime)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-icon">📍</span>
                            <span class="detail-text">${item.room}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-icon">👤</span>
                            <span class="detail-text">${item.instructor}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners for delete actions
    listContainer.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const classId = btn.getAttribute('data-id');
            onDeleteCallback(classId);
        });
    });
}
