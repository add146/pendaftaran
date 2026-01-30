/**
 * Timezone utility for converting UTC to WIB (Asia/Jakarta, UTC+7)
 */

/**
 * Convert UTC date string to WIB and format for display
 * @param utcDateString - ISO date string in UTC
 * @param options - Formatting options
 * @returns Formatted date string in WIB
 */
export function formatDateWIB(
    utcDateString: string | null | undefined,
    options: {
        includeTime?: boolean;
        includeSeconds?: boolean;
        dateFormat?: 'DD/MM/YYYY' | 'DD MMM YYYY';
    } = {}
): string {
    if (!utcDateString) return '-';

    const {
        includeTime = true,
        includeSeconds = false,
        dateFormat = 'DD/MM/YYYY',
    } = options;

    try {
        const utcDate = new Date(utcDateString);
        // Add 7 hours for WIB (UTC+7)
        const wibDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);

        const day = wibDate.getUTCDate().toString().padStart(2, '0');
        const month = wibDate.getUTCMonth() + 1;
        const monthStr = month.toString().padStart(2, '0');
        const year = wibDate.getUTCFullYear();

        let dateStr = '';
        if (dateFormat === 'DD/MM/YYYY') {
            dateStr = `${day}/${monthStr}/${year}`;
        } else {
            const monthNames = [
                'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
            ];
            dateStr = `${day} ${monthNames[wibDate.getUTCMonth()]} ${year}`;
        }

        if (includeTime) {
            const hours = wibDate.getUTCHours().toString().padStart(2, '0');
            const minutes = wibDate.getUTCMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;

            if (includeSeconds) {
                const seconds = wibDate.getUTCSeconds().toString().padStart(2, '0');
                return `${dateStr}, ${timeStr}:${seconds}`;
            }

            return `${dateStr}, ${timeStr}`;
        }

        return dateStr;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '-';
    }
}

/**
 * Get current time in WIB
 * @returns ISO string in WIB timezone
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
