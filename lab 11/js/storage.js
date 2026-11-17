/**
 * Storage Module (ES6 Module)
 * Handles localStorage persistence and provides seed schedule data.
 */

const STORAGE_KEY = 'class_scheduler_data_v1';

export const DEFAULT_CLASSES = [
    {
        id: 'cls-1',
        title: 'Data Structures & Algorithms',
        code: 'CS-301',
        instructor: 'Dr. Sarah Mitchell',
        room: 'Hall B-204',
        day: 1, // Monday (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
        startTime: '09:00',
        endTime: '10:30',
        color: '#6366f1' // Indigo
    },
    {
        id: 'cls-2',
        title: 'Web Technologies & ES6',
        code: 'CS-305',
        instructor: 'Prof. Alan Vance',
        room: 'Lab 4 (Virtual/Onsite)',
        day: 1, // Monday
        startTime: '11:00',
        endTime: '12:30',
        color: '#06b6d4' // Cyan
    },
    {
        id: 'cls-3',
        title: 'Database Management Systems',
        code: 'CS-308',
        instructor: 'Dr. Elena Ramos',
        room: 'Hall C-101',
        day: 2, // Tuesday
        startTime: '10:00',
        endTime: '11:30',
        color: '#10b981' // Emerald
    },
    {
        id: 'cls-4',
        title: 'Operating Systems & Concurrency',
        code: 'CS-312',
        instructor: 'Prof. David Lee',
        room: 'Hall A-105',
        day: 3, // Wednesday
        startTime: '13:00',
        endTime: '14:30',
        color: '#f59e0b' // Amber
    },
    {
        id: 'cls-5',
        title: 'Computer Networks',
        code: 'CS-316',
        instructor: 'Dr. Marcus Vance',
        room: 'Hall B-102',
        day: 4, // Thursday
        startTime: '10:00',
        endTime: '11:30',
        color: '#ec4899' // Pink
    },
    {
        id: 'cls-6',
        title: 'Software Engineering Project Lab',
        code: 'CS-320',
        instructor: 'Prof. Chloe Zhao',
        room: 'Innovation Lab 2',
        day: 5, // Friday
        startTime: '14:00',
        endTime: '16:00',
        color: '#8b5cf6' // Violet
    }
];

/**
 * Load classes from localStorage or fallback to defaults
 * @returns {Array} Array of class objects
 */
export function loadClasses() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (err) {
        console.warn('Failed to parse localStorage schedule data. Using defaults.', err);
    }

    saveClasses(DEFAULT_CLASSES);
    return [...DEFAULT_CLASSES];
}

/**
 * Save classes to localStorage
 * @param {Array} classes 
 */
export function saveClasses(classes) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
    } catch (err) {
        console.error('Error saving schedule to localStorage:', err);
    }
}

/**
 * Reset stored classes back to initial default seed
 * @returns {Array} Default classes
 */
export function resetToDefaults() {
    saveClasses(DEFAULT_CLASSES);
    return [...DEFAULT_CLASSES];
}
