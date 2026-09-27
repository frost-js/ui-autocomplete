import { expect, test } from '#test';

test.describe('Autocomplete remote results', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((markup) => {
            document.body.innerHTML = markup;
        }, '<input id="autocomplete">');
    });

    test.describe('responses', () => {
        test('loads asynchronous results with request options', async ({ page }) => {
            await page.evaluate((_) => {
                window.payloads = [];
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    debounce: 0,
                    getResults(options) {
                        window.payloads.push({
                            aborted: options.signal.aborted,
                            offset: options.offset,
                            term: options.term,
                        });
                        return Promise.resolve({ results: ['Async'] });
                    },
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-item')).toHaveText('Async');
            expect(await page.evaluate((_) => window.payloads)).toEqual([
                { aborted: false, offset: 0, term: undefined },
            ]);
            await expect(page.locator('.autocomplete-menu')).toHaveAttribute('aria-busy', 'false');
        });

        test('closes after an empty response', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    debounce: 0,
                    getResults: (_) => Promise.resolve({ results: [] }),
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'false');
        });

        for (const { name, response } of [
            { name: 'missing', response: undefined },
            { name: 'null', response: null },
            { name: 'missing results', response: {} },
            { name: 'non-array results', response: { results: 'One' } },
            { name: 'non-string result', response: { results: [1] } },
        ]) {
            test(`treats a ${name} response as an error`, async ({ page }) => {
                await page.evaluate((response) => {
                    UI.Autocomplete.init(document.querySelector('#autocomplete'), {
                        debounce: 0,
                        getResults: () => Promise.resolve(response),
                        minSearch: 0,
                    }).show();
                }, response);

                await expect(page.locator('.autocomplete-menu [aria-disabled="true"]')).toHaveText('Error loading data.');
                await expect(page.locator('.autocomplete-menu')).toHaveAttribute('aria-busy', 'false');
            });
        }
    });

    test.describe('loading, errors, and retry', () => {
        test('uses accessible loading and error options', async ({ page }) => {
            await page.evaluate((_) => {
                window.rejectRequest = null;
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    debounce: 0,
                    getResults() {
                        return new Promise((_, reject) => {
                            window.rejectRequest = reject;
                        });
                    },
                    minSearch: 0,
                }).show();
            });

            const status = page.locator('.autocomplete-menu [aria-disabled="true"]');
            await expect(status).toHaveAttribute('role', 'option');
            await expect(status).toHaveAttribute('aria-live', 'polite');
            await expect(status).toHaveText('Loading..');
            await expect(page.locator('.autocomplete-menu')).toHaveAttribute('aria-busy', 'true');
            await page.waitForFunction((_) => typeof window.rejectRequest === 'function');
            await page.evaluate((_) => window.rejectRequest(new Error('Failed')));
            await expect(status).toHaveText('Error loading data.');
            await expect(page.locator('.autocomplete-menu')).toHaveAttribute('aria-busy', 'false');
        });

        test('uses custom loading and error messages', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    debounce: 0,
                    getResults: () => new Promise((_, reject) => {
                        window.rejectRequest = reject;
                    }),
                    lang: { error: 'Custom error', loading: 'Custom loading' },
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('[aria-disabled="true"]')).toHaveText('Custom loading');
            await page.waitForFunction((_) => typeof window.rejectRequest === 'function');
            await page.evaluate((_) => window.rejectRequest(new Error('Failed')));
            await expect(page.locator('[aria-disabled="true"]')).toHaveText('Custom error');
        });

        for (const { name, setup } of [
            {
                name: 'rejected',
                setup: () => UI.Autocomplete.init(document.querySelector('#autocomplete'), {
                    debounce: 0,
                    getResults: () => Promise.reject(new Error('Rejected')),
                    minSearch: 0,
                }).show(),
            },
            {
                name: 'thrown',
                setup: () => UI.Autocomplete.init(document.querySelector('#autocomplete'), {
                    debounce: 0,
                    getResults() {
                        throw new Error('Thrown');
                    },
                    minSearch: 0,
                }).show(),
            },
        ]) {
            test(`renders ${name} provider errors`, async ({ page }) => {
                await page.evaluate(setup);
                await expect(page.locator('.autocomplete-menu [aria-disabled="true"]')).toHaveText('Error loading data.');
                await expect(page.locator('.autocomplete-menu')).toHaveAttribute('aria-busy', 'false');
            });
        }

        test('retries from an error option with the keyboard', async ({ page }) => {
            await page.evaluate((_) => {
                window.calls = 0;
                const input = $.findOne('#autocomplete');
                input.focus();
                UI.Autocomplete.init(input, {
                    debounce: 0,
                    getResults() {
                        window.calls++;
                        return window.calls === 1 ?
                            Promise.reject(new Error('Failed')) :
                            Promise.resolve({ results: ['Recovered'] });
                    },
                    minSearch: 0,
                }).show();
            });
            const input = page.locator('#autocomplete');
            await expect(page.locator('[aria-live="polite"]')).toHaveText('Error loading data.');
            await input.press('ArrowDown');

            await expect(page.locator('.autocomplete-item')).toHaveText('Recovered');
            expect(await page.evaluate((_) => window.calls)).toBe(2);
        });
    });

    test.describe('cancellation', () => {
        test('aborts stale requests and ignores stale responses', async ({ page }) => {
            await page.evaluate((_) => {
                window.requests = [];
                const input = $.findOne('#autocomplete');
                input.focus();
                UI.Autocomplete.init(input, {
                    debounce: 0,
                    getResults(options) {
                        return new Promise((resolve) => {
                            window.requests.push({ options, resolve });
                        });
                    },
                    minSearch: 0,
                }).show();
            });
            await page.waitForFunction((_) => window.requests.length === 1);
            await page.locator('#autocomplete').fill('new');
            await page.waitForFunction((_) => window.requests.length === 2);
            expect(await page.evaluate((_) => window.requests[0].options.signal.aborted)).toBe(true);

            await page.evaluate((_) => {
                window.requests[0].resolve({ results: ['Stale'] });
                window.requests[1].resolve({ results: ['Fresh'] });
            });
            await expect(page.locator('.autocomplete-item')).toHaveText('Fresh');
        });

        test('aborts requests when hidden without rendering an error', async ({ page }) => {
            await page.evaluate((_) => {
                window.requests = [];
                window.autocomplete = UI.Autocomplete.init($.findOne('#autocomplete'), {
                    debounce: 0,
                    getResults(options) {
                        return new Promise((_, reject) => {
                            window.requests.push({ options, reject });
                        });
                    },
                    minSearch: 0,
                });
                window.autocomplete.show();
            });
            await page.waitForFunction((_) => window.requests.length === 1);
            await page.evaluate((_) => {
                window.autocomplete.hide();
                window.requests[0].reject(new Error('Aborted'));
            });

            expect(await page.evaluate((_) => window.requests[0].options.signal.aborted)).toBe(true);
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });

        test('aborts a request when deletion drops below minSearch', async ({ page }) => {
            await page.evaluate((_) => {
                window.requests = [];
                const input = $.findOne('#autocomplete');
                $.setValue(input, 'ab');
                input.focus();
                UI.Autocomplete.init(input, {
                    debounce: 0,
                    getResults(options) {
                        return new Promise((resolve) => window.requests.push({ options, resolve }));
                    },
                    minSearch: 2,
                }).show();
            });
            await page.waitForFunction((_) => window.requests.length === 1);
            await page.locator('#autocomplete').fill('a');

            expect(await page.evaluate((_) => window.requests[0].options.signal.aborted)).toBe(true);
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });

        test('aborts a pending request and ignores post-disposal completion', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                window.requests = [];
                window.autocomplete = UI.Autocomplete.init(input, {
                    debounce: 0,
                    getResults(options) {
                        return new Promise((resolve) => {
                            window.requests.push({ options, resolve });
                        });
                    },
                    minSearch: 0,
                });
                window.autocomplete.show();
            });
            await page.waitForFunction((_) => window.requests.length === 1);
            await page.evaluate((_) => {
                window.autocomplete.dispose();
                window.requests[0].resolve({ results: ['Late'] });
            });

            expect(await page.evaluate((_) => window.requests[0].options.signal.aborted)).toBe(true);
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });
    });

    test.describe('pagination', () => {
        test('loads paginated results when scrolling', async ({ page }) => {
            await page.evaluate((_) => {
                window.payloads = [];
                const firstPage = Array.from({ length: 20 }, (_, index) => `First ${index}`);
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    debounce: 0,
                    getResults(options) {
                        window.payloads.push({ offset: options.offset, term: options.term });
                        return Promise.resolve(options.offset ?
                            { results: ['Second page'], showMore: false } :
                            { results: firstPage, showMore: true });
                    },
                    maxHeight: '80px',
                    minSearch: 0,
                }).show();
            });
            await expect(page.locator('.autocomplete-item')).toHaveCount(20);
            await page.evaluate((_) => {
                const focused = $.findOne('[data-ui-focus]');
                $.removeDataset(focused, 'uiFocus');
                $.removeClass(focused, UI.Autocomplete.classes.focus);
            });
            await page.locator('.autocomplete-menu').evaluate((menu) => {
                menu.scrollTop = menu.scrollHeight;
                menu.dispatchEvent(new Event('scroll'));
            });
            await expect(page.locator('.autocomplete-item')).toHaveCount(21);
            await expect(page.locator('.autocomplete-item').last()).toHaveText('Second page');
            await expect(page.locator('#autocomplete')).not.toHaveAttribute('aria-activedescendant');
            expect(await page.evaluate((_) => window.payloads)).toEqual([
                { offset: 0, term: undefined },
                { offset: 20, term: undefined },
            ]);
        });

        test('aborts pagination when the term changes', async ({ page }) => {
            await page.evaluate((_) => {
                window.requests = [];
                const input = $.findOne('#autocomplete');
                $.setValue(input, 'a');
                input.focus();
                UI.Autocomplete.init(input, {
                    debounce: 0,
                    getResults(options) {
                        return new Promise((resolve) => {
                            window.requests.push({ options, resolve });
                        });
                    },
                    maxHeight: '80px',
                }).show();
            });
            await page.waitForFunction((_) => window.requests.length === 1);
            await page.evaluate((_) => {
                const results = Array.from({ length: 20 }, (_, index) => `A ${index}`);
                window.requests[0].resolve({ results, showMore: true });
            });
            await expect(page.locator('.autocomplete-item')).toHaveCount(20);
            await page.locator('.autocomplete-menu').evaluate((menu) => {
                menu.scrollTop = menu.scrollHeight;
                menu.dispatchEvent(new Event('scroll'));
            });
            await page.waitForFunction((_) => window.requests.length === 2);
            await page.locator('#autocomplete').fill('b');
            await page.waitForFunction((_) => window.requests.length === 3);

            expect(await page.evaluate((_) => window.requests[1].options.signal.aborted)).toBe(true);
            await page.evaluate((_) => {
                window.requests[1].resolve({ results: ['Stale page'] });
                window.requests[2].resolve({ results: ['B result'] });
            });
            await expect(page.locator('.autocomplete-item')).toHaveText('B result');
        });

        test.describe('scroll timing', () => {
            test.use({ mockClock: true });

            test('does not paginate while scrolling away from the end', async ({ page }) => {
                await page.evaluate((_) => {
                    window.calls = 0;
                    const firstPage = Array.from({ length: 20 }, (_, index) => `Result ${index}`);
                    UI.Autocomplete.init($.findOne('#autocomplete'), {
                        debounce: 0,
                        getResults(options) {
                            window.calls++;
                            return Promise.resolve(options.offset ?
                                { results: ['Unexpected'] } :
                                { results: firstPage, showMore: true });
                        },
                        maxHeight: '80px',
                        minSearch: 0,
                    }).show();
                });
                await page.clock.runFor(1);
                await expect(page.locator('.autocomplete-item')).toHaveCount(20);
                await page.locator('.autocomplete-menu').evaluate((menu) => {
                    menu.scrollTop = 0;
                    menu.dispatchEvent(new Event('scroll'));
                });
                await page.clock.runFor(350);

                expect(await page.evaluate((_) => window.calls)).toBe(1);
                await expect(page.locator('.autocomplete-item')).toHaveCount(20);
            });

            test('stops pagination after an empty page', async ({ page }) => {
                await page.evaluate((_) => {
                    window.calls = 0;
                    const firstPage = Array.from({ length: 20 }, (_, index) => `Result ${index}`);
                    UI.Autocomplete.init($.findOne('#autocomplete'), {
                        debounce: 0,
                        getResults(options) {
                            window.calls++;
                            return Promise.resolve(options.offset ?
                                { results: [], showMore: true } :
                                { results: firstPage, showMore: true });
                        },
                        maxHeight: '80px',
                        minSearch: 0,
                    }).show();
                });
                await page.clock.runFor(1);
                await expect(page.locator('.autocomplete-item')).toHaveCount(20);
                const menu = page.locator('.autocomplete-menu');
                await menu.evaluate((node) => {
                    node.scrollTop = node.scrollHeight;
                    node.dispatchEvent(new Event('scroll'));
                });
                await page.clock.runFor(350);
                await menu.evaluate((node) => node.dispatchEvent(new Event('scroll')));
                await page.clock.runFor(350);

                expect(await page.evaluate((_) => window.calls)).toBe(2);
                await expect(page.locator('.autocomplete-item')).toHaveCount(20);
            });
        });
    });

    test.describe('debounce', () => {
        test.use({ mockClock: true });

        test('debounces rapid typing and requests only the latest term', async ({ page }) => {
            await page.evaluate((_) => {
                window.terms = [];
                const input = $.findOne('#autocomplete');
                input.focus();
                UI.Autocomplete.init(input, {
                    debounce: 120,
                    getResults(options) {
                        window.terms.push(options.term);
                        return Promise.resolve({ results: [options.term] });
                    },
                    minSearch: 1,
                });
            });
            const input = page.locator('#autocomplete');
            await input.fill('a');
            await page.clock.runFor(60);
            await input.fill('ab');
            await page.clock.runFor(60);
            await input.fill('abc');
            await page.clock.runFor(119);
            expect(await page.evaluate((_) => window.terms.length)).toBe(0);
            await page.clock.runFor(2);
            await expect(page.locator('.autocomplete-item')).toHaveText('abc');
            expect(await page.evaluate((_) => window.terms)).toEqual(['abc']);
        });

        test('normalizes negative debounce for provider requests', async ({ page }) => {
            const calls = await page.evaluate((_) => {
                window.calls = 0;
                UI.Autocomplete.init(document.querySelector('#autocomplete'), {
                    debounce: -1,
                    getResults() {
                        window.calls++;
                        return { results: ['One'] };
                    },
                    minSearch: 0,
                }).show();
                return window.calls;
            });
            expect(calls).toBe(0);
            await page.clock.runFor(1);

            expect(await page.evaluate((_) => window.calls)).toBe(1);
            await expect(page.locator('.autocomplete-item')).toHaveText('One');
        });
    });
});
