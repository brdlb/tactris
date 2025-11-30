// Constants for HSV color generation
const SATURATION = 70; // 70%
const VALUE = 85;      // 85%
const STORAGE_KEY = 'tactris_user_hue';

/**
 * Generate a random hue value (0-360)
 */
export function generateHue() {
    return Math.floor(Math.random() * 360);
}

/**
 * Set user's hue in localStorage
 * @param {number} hue - Hue value (0-360)
 */
export function setUserHue(hue) {
    localStorage.setItem(STORAGE_KEY, hue.toString());
}

/**
 * Convert HSV to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} v - Value/Brightness (0-100)
 * @returns {string} RGB color string in format "rgb(r, g, b)"
 */
export function hsvToRgb(h, s, v) {
    // Normalize values
    s = s / 100;
    v = v / 100;

    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r, g, b;

    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }

    // Convert to 0-255 range
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get user's hue from localStorage or generate a new one
 * @returns {number} Hue value (0-360)
 */
export function getUserHue() {
    let hue = localStorage.getItem(STORAGE_KEY);

    if (hue === null) {
        hue = generateHue();
        localStorage.setItem(STORAGE_KEY, hue.toString());
    } else {
        hue = parseInt(hue, 10);
    }

    return hue;
}

/**
 * Get user's personal color in RGB format
 * @returns {string} RGB color string
 */
export function getUserColor() {
    const hue = getUserHue();
    return hsvToRgb(hue, SATURATION, VALUE);
}
