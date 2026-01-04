export type TimeComponents = {
    hours: number;
    minutes: number;
    seconds: number;
};

export type PaceResult = {
    paceSecondsPerKm: number;
    speedKmh: number;
};

/**
 * Converts hours, minutes, seconds to total seconds.
 */
export function timeToSeconds({ hours, minutes, seconds }: TimeComponents): number {
    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Converts total seconds to hours, minutes, seconds.
 */
export function secondsToTime(totalSeconds: number): TimeComponents {
    const hours = Math.floor(totalSeconds / 3600);
    const remainingSeconds = totalSeconds % 3600;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.round(remainingSeconds % 60);
    return { hours, minutes, seconds };
}

/**
 * Formats time as HH:MM:SS or MM:SS if hours is 0
 */
export function formatTime(totalSeconds: number): string {
    const { hours, minutes, seconds } = secondsToTime(totalSeconds);
    const pad = (num: number) => num.toString().padStart(2, "0");

    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats pace as MM:SS /km
 */
export function formatPace(paceSecondsPerKm: number): string {
    return formatTime(paceSecondsPerKm);
}

/**
 * Calculate Pace (sec/km) and Speed (km/h) from Distance (km) and Time (sec)
 */
export function calculatePace(distanceKm: number, timeSeconds: number): PaceResult {
    if (distanceKm <= 0 || timeSeconds <= 0) {
        return { paceSecondsPerKm: 0, speedKmh: 0 };
    }

    const paceSecondsPerKm = timeSeconds / distanceKm;
    const speedKmh = distanceKm / (timeSeconds / 3600);

    return { paceSecondsPerKm, speedKmh };
}

/**
 * Calculate Time (sec) from Distance (km) and Pace (sec/km)
 */
export function calculateTime(distanceKm: number, paceSecondsPerKm: number): number {
    return distanceKm * paceSecondsPerKm;
}

/**
 * Calculate Distance (km) from Time (sec) and Pace (sec/km)
 */
export function calculateDistance(timeSeconds: number, paceSecondsPerKm: number): number {
    if (paceSecondsPerKm <= 0) return 0;
    return timeSeconds / paceSecondsPerKm;
}

/**
 * Convert Speed (km/h) to Pace (sec/km)
 */
export function speedToPace(speedKmh: number): number {
    if (speedKmh <= 0) return 0;
    return 3600 / speedKmh; // (60 * 60) / speed
}

/**
 * Convert Pace (sec/km) to Speed (km/h)
 */
export function paceToSpeed(paceSecondsPerKm: number): number {
    if (paceSecondsPerKm <= 0) return 0;
    return 3600 / paceSecondsPerKm;
}
