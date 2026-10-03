/**
 * Normalizes a value for case- and accent-insensitive matching.
 * @param {string} value The value to normalize.
 * @returns {string} The normalized value.
 */
export function normalizeText(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export { normalizeText as normalizeValue };
