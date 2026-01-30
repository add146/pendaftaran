/**
 * Timezone utility for converting to WIB (Asia/Jakarta, UTC+7)
 * 
 * IMPORTANT: Uses Intl.DateTimeFormat for correct timezone handling.
 * This works consistently regardless of whether the input is:
 * - True UTC (e.g., created_at from SQLite CURRENT_TIMESTAMP)
 * - Already WIB with 'Z' suffix (legacy getNowWIB format)
 */

/**
 * Format date string to WIB (Asia/Jakarta) timezone for display
 * Uses JavaScript's built-in Intl.DateTimeFormat which handles DST and timezone correctly
 * 
 * @param dateString - ISO date string (can be UTC or any timezone)
 * @param options - Formatting options
 * @returns Formatted date string in WIB
 */
export function formatDateWIB(
    dateString: string | null | undefined,
    options: {
        includeTime?: boolean;
        includeSeconds?: boolean;
        dateFormat?: 'DD/MM/YYYY' | 'DD MMM YYYY';
    } = {}
): string {
    if (!dateString) return '-';

    const {
        includeTime = true,
        includeSeconds = false,
        dateFormat = 'DD/MM/YYYY',
    } = options;

    try {
        // Normalize date string: SQLite stores timestamps without timezone info
        // (e.g., "2026-01-30 10:21:00"), so JavaScript interprets them as local time.
        // We need to append 'Z' to indicate UTC if no timezone info is present.
        let normalizedDateString = dateString;

        // Check if the string already has timezone info (Z, +, or -)
        if (!dateString.endsWith('Z') &&
            !dateString.includes('+') &&
            !dateString.match(/\d{2}:\d{2}:\d{2}-\d{2}/)) {
            // Replace space with 'T' for ISO format and append 'Z' for UTC
            normalizedDateString = dateString.replace(' ', 'T');
            if (!normalizedDateString.endsWith('Z')) {
                normalizedDateString += 'Z';
            }
        }

        const date = new Date(normalizedDateString);

        if (isNaN(date.getTime())) {
            return '-';
        }

        // Use Intl.DateTimeFormat with Asia/Jakarta timezone
        const formatter = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: dateFormat === 'DD MMM YYYY' ? 'short' : '2-digit',
            year: 'numeric',
            ...(includeTime && {
                hour: '2-digit',
                minute: '2-digit',
                ...(includeSeconds && { second: '2-digit' }),
                hour12: false
            })
        });

        const parts = formatter.formatToParts(date);
        const getValue = (type: string) => parts.find(p => p.type === type)?.value || '';

        const day = getValue('day');
        const month = getValue('month');
        const year = getValue('year');

        let dateStr = '';
        if (dateFormat === 'DD/MM/YYYY') {
            dateStr = `${day}/${month}/${year}`;
        } else {
            dateStr = `${day} ${month} ${year}`;
        }

        if (includeTime) {
            const hour = getValue('hour');
            const minute = getValue('minute');
            const timeStr = includeSeconds
                ? `${hour}:${minute}:${getValue('second')}`
                : `${hour}:${minute}`;
            return `${dateStr}, ${timeStr}`;
        }

        return dateStr;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '-';
    }
}

/**
 * Get current time in WIB as ISO string
 * @returns ISO string representing current WIB time
 */
export function getNowWIB(): string {
    const now = new Date();
    const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return wibTime.toISOString();
}

/**
 * Convert UTC to WIB Date object
 * @param utcDateString - ISO date string in UTC
 * @returns Date object adjusted to WIB
 */
export function convertToWIB(utcDateString: string): Date {
    const utcDate = new Date(utcDateString);
    return new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
}
