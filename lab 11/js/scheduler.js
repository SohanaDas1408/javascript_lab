/**
 * Scheduler Module (ES6 Module)
 * Manages class data, schedules, active/next class status resolution,
 * and time calculations.
 */

import { loadClasses, saveClasses } from './storage.js';

export const DAYS_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

class SchedulerService {
    constructor() {
        this.classes = loadClasses();
    }

    /**
     * Get all classes
     * @returns {Array}
     */
    getAllClasses() {
        return [...this.classes];
    }

    /**
     * Add a new class
     * @param {Object} classData 
     * @returns {Object} Created class
     */
    addClass(classData) {
        const newClass = {
            id: 'cls-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            title: classData.title.trim(),
            code: classData.code ? classData.code.trim().toUpperCase() : 'GEN-100',
            instructor: classData.instructor.trim() || 'TBA',
            room: classData.room.trim() || 'Online',
            day: parseInt(classData.day, 10),
            startTime: classData.startTime, // 'HH:MM'
            endTime: classData.endTime,     // 'HH:MM'
            color: classData.color || '#6366f1'
        };

        this.classes.push(newClass);
        saveClasses(this.classes);
        return newClass;
    }

    /**
     * Delete a class by ID
     * @param {string} id 
     * @returns {boolean}
     */
    deleteClass(id) {
        const index = this.classes.findIndex(c => c.id === id);
        if (index !== -1) {
            this.classes.splice(index, 1);
            saveClasses(this.classes);
            return true;
        }
        return false;
    }

    /**
     * Update an existing class
     * @param {string} id 
     * @param {Object} updatedFields 
     */
    updateClass(id, updatedFields) {
        const item = this.classes.find(c => c.id === id);
        if (item) {
            Object.assign(item, updatedFields);
            saveClasses(this.classes);
            return item;
        }
        return null;
    }

    /**
     * Get classes filtered by day of week (0-6) or all
     * @param {number | 'all'} day 
     * @returns {Array}
     */
    getClassesByDay(day) {
        if (day === 'all' || day === undefined) {
            return this.getAllClasses().sort((a, b) => {
                if (a.day !== b.day) return a.day - b.day;
                return a.startTime.localeCompare(b.startTime);
            });
        }
        const numericDay = parseInt(day, 10);
        return this.classes
            .filter(c => c.day === numericDay)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    /**
     * Constructs a full JavaScript Date object for a class on a specified reference Date
     * @param {Object} classItem 
     * @param {Date} refDate 
     * @param {'start' | 'end'} type 
     * @returns {Date}
     */
    getClassDateTime(classItem, refDate, type = 'start') {
        const [hours, minutes] = (type === 'start' ? classItem.startTime : classItem.endTime)
            .split(':')
            .map(Number);

        const target = new Date(refDate.getTime());
        // Calculate day difference
        const currentDay = refDate.getDay();
        let dayDiff = classItem.day - currentDay;

        // If class day is earlier in the week or already finished today, calculate for next occurrence
        target.setDate(target.getDate() + dayDiff);
        target.setHours(hours, minutes, 0, 0);
        return target;
    }

    /**
     * Evaluates current active class and next upcoming class relative to now
     * @param {Date} [now=new Date()] 
     * @returns {Object} { activeClass, nextClass, nextClassOccurrence, activeClassTimeRemainingMs }
     */
    resolveScheduleState(now = new Date()) {
        const todayDay = now.getDay();
        const currentTimeStr = `${padNumber(now.getHours())}:${padNumber(now.getMinutes())}`;
        const currentSeconds = now.getSeconds();

        let activeClass = null;
        let activeClassRemainingMs = 0;
        let activeClassElapsedMs = 0;
        let activeClassTotalMs = 0;

        // Find currently ongoing class today
        const todayClasses = this.getClassesByDay(todayDay);
        for (const item of todayClasses) {
            if (currentTimeStr >= item.startTime && currentTimeStr < item.endTime) {
                activeClass = item;
                const startDate = new Date(now);
                const [sH, sM] = item.startTime.split(':').map(Number);
                startDate.setHours(sH, sM, 0, 0);

                const endDate = new Date(now);
                const [eH, eM] = item.endTime.split(':').map(Number);
                endDate.setHours(eH, eM, 0, 0);

                activeClassTotalMs = endDate.getTime() - startDate.getTime();
                activeClassElapsedMs = now.getTime() - startDate.getTime();
                activeClassRemainingMs = Math.max(0, endDate.getTime() - now.getTime());
                break;
            }
        }

        // Find the next upcoming class
        let nextClass = null;
        let nextOccurrenceDate = null;
        let minDiffMs = Infinity;

        // Check remaining classes today first
        for (const item of todayClasses) {
            if (item.startTime > currentTimeStr) {
                const startDate = new Date(now);
                const [sH, sM] = item.startTime.split(':').map(Number);
                startDate.setHours(sH, sM, 0, 0);
                const diff = startDate.getTime() - now.getTime();
                if (diff > 0 && diff < minDiffMs) {
                    minDiffMs = diff;
                    nextClass = item;
                    nextOccurrenceDate = startDate;
                }
            }
        }

        // If no more classes today, search through subsequent days (1..7 days ahead)
        if (!nextClass && this.classes.length > 0) {
            for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
                const targetDay = (todayDay + dayOffset) % 7;
                const candidateClasses = this.getClassesByDay(targetDay);

                if (candidateClasses.length > 0) {
                    // Pick the earliest class of that day
                    const earliest = candidateClasses[0];
                    const [sH, sM] = earliest.startTime.split(':').map(Number);
                    const targetDate = new Date(now);
                    targetDate.setDate(now.getDate() + dayOffset);
                    targetDate.setHours(sH, sM, 0, 0);

                    const diff = targetDate.getTime() - now.getTime();
                    if (diff > 0 && diff < minDiffMs) {
                        minDiffMs = diff;
                        nextClass = earliest;
                        nextOccurrenceDate = targetDate;
                        break; // Found the earliest next day class
                    }
                }
            }
        }

        return {
            activeClass,
            activeClassRemainingMs,
            activeClassElapsedMs,
            activeClassTotalMs,
            nextClass,
            nextOccurrenceDate,
            msUntilNextClass: nextOccurrenceDate ? Math.max(0, nextOccurrenceDate.getTime() - now.getTime()) : null
        };
    }
}

function padNumber(n) {
    return n.toString().padStart(2, '0');
}

export const scheduler = new SchedulerService();
