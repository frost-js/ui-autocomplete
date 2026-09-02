/** @import { Page } from '@playwright/test'; */

/**
 * Reset the browser page and Autocomplete defaults.
 * @param {Page} page The Playwright page.
 * @returns {Promise<void>} The promise.
 */
export async function resetPage(page) {
    await page.goto('/', {
        waitUntil: 'domcontentloaded',
    });

    const stateReset = await page.evaluate((_) => {
        if (!window.fQuery || !window.UI?.Autocomplete) {
            return false;
        }

        window.$ = window.fQuery;

        $.empty(document.body);

        return window.$ === window.fQuery &&
            typeof $.QuerySet.prototype.autocomplete === 'function';
    });

    if (!stateReset) {
        throw new Error('Failed to restore Autocomplete on the test page.');
    }

    await page.waitForFunction((_) => {
        const test = $.create('div', { class: 'text-center' });
        $.append(document.body, test);
        const ready = $.css(test, 'text-align') === 'center';
        $.remove(test);
        return ready;
    });
}
