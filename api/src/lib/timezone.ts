/**
 * Timezone utility functions for Asia/Jakarta (WIB, UTC+7)
 */

/**
 * Get current date/time in Asia/Jakarta timezone
 * @returns ISO string in WIB timezone
 */
export function getNowWIB(): string {
    const now = new Date();
    // Convert to WIB (UTC+7)
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return wibTime.toISOString();
}

/**
 * Convert UTC date to WIB timezone
 * @param utcDate - UTC date string or Date object
 * @returns ISO string in WIB timezone
 */
export function convertToWIB(utcDate: string | Date): string {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    // Add 7 hours for WIB
    const wibTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return wibTime.toISOString();
}

/**
 * Format date to WIB timezone for display
 * @param utcDate - UTC date string or Date object
 * @param includeTime - Whether to include time in output (default: true)
 * @returns Formatted date string in WIB
 */
export function formatDateWIB(utcDate: string | Date, includeTime: boolean = true): string {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    // Add 7 hours for WIB
    const wibTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));

    const day = wibTime.getUTCDate().toString().padStart(2, '0');
    const month = (wibTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = wibTime.getUTCFullYear();

    if (!includeTime) {
        return `${day}/${month}/${year}`;
    }

    const hours = wibTime.getUTCHours().toString().padStart(2, '0');
    const minutes = wibTime.getUTCMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}
