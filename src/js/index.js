import $ from '@fr0st/query';
import { initComponent } from '@fr0st/ui';
import Autocomplete from './autocomplete.js';

/**
 * Normalizes a value for case- and accent-insensitive matching.
 * @param {string} value The value to normalize.
 * @returns {string} The normalized value.
 */
const normalizeValue = (value) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

// Autocomplete default options
Autocomplete.defaults = {
    lang: {
        error: 'Error loading data.',
        loading: 'Loading..',
    },
    data: [],
    getResults: null,
    renderResult: (value) => value,
    sanitize: (input) => $.sanitize(input),
    isMatch(value, term) {
        return normalizeValue(value).includes(normalizeValue(term));
    },
    sortResults(a, b, term) {
        const aNormalized = normalizeValue(a);
        const bNormalized = normalizeValue(b);
        const termNormalized = normalizeValue(term);

        if (termNormalized) {
            const diff = aNormalized.indexOf(termNormalized) - bNormalized.indexOf(termNormalized);

            if (diff) {
                return diff;
            }
        }

        return aNormalized.localeCompare(bNormalized);
    },
    minSearch: 1,
    debounce: 250,
    duration: 100,
    maxHeight: '250px',
    appendTo: null,
    fullWidth: false,
    placement: 'bottom',
    position: 'start',
    fixed: false,
    spacing: 0,
    minContact: false,
};

// Default classes
Autocomplete.classes = {
    active: 'active',
    focus: 'focus',
    info: 'autocomplete-item text-body-secondary',
    item: 'autocomplete-item',
    menu: 'autocomplete-menu list-unstyled fade',
    menuSmall: 'autocomplete-menu-sm',
    menuLarge: 'autocomplete-menu-lg',
    show: 'show',
};

// Autocomplete init
initComponent('autocomplete', Autocomplete);

export default Autocomplete;
