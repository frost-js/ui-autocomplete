import { expect, test } from '#test';

test.describe('Autocomplete layout', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((markup) => {
            document.body.innerHTML = markup;
        }, '<input id="autocomplete">');
    });

    test.describe('#update', () => {
        for (const { name, update } of [
            { name: 'class', update: () => window.autocomplete.update() },
            { name: 'QuerySet', update: () => $('#autocomplete').autocomplete('update') },
        ]) {
            test(`updates full-width sizing after the input changes (${name})`, async ({ page }) => {
                await page.evaluate((_) => {
                    const input = $.findOne('#autocomplete');
                    $.setStyle(input, { boxSizing: 'border-box', inlineSize: '120px' });
                    window.autocomplete = UI.Autocomplete.init(input, {
                        data: ['One'],
                        fullWidth: true,
                        minSearch: 0,
                    });
                    window.autocomplete.show();
                    $.setStyle(input, { inlineSize: '210px' });
                });
                await page.evaluate(update);

                const widths = await page.locator('#autocomplete, .autocomplete-menu').evaluateAll((nodes) =>
                    nodes.map((node) => node.getBoundingClientRect().width),
                );
                expect(widths[1]).toBe(widths[0]);
            });
        }

        test('updates through fQuery and safely no-ops while hidden', async ({ page }) => {
            await page.evaluate((_) => {
                $('#autocomplete').autocomplete({ data: ['One'] });
                $('#autocomplete').autocomplete('update');
                $('#autocomplete').autocomplete('show');
                $('#autocomplete').autocomplete('update');
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });
    });

    test.describe('sizing, appendTo, and Popper options', () => {
        test('matches the exact input border-box with fullWidth', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                $.setStyle(input, { boxSizing: 'border-box', inlineSize: '96px' });
                UI.Autocomplete.init(input, {
                    data: ['A result wider than the input'],
                    fullWidth: true,
                    minSearch: 0,
                }).show();
            });

            const widths = await page.locator('#autocomplete, .autocomplete-menu').evaluateAll((nodes) =>
                nodes.map((node) => node.getBoundingClientRect().width),
            );
            expect(widths[1]).toBe(widths[0]);
        });

        test('uses intrinsic sizing when fullWidth is disabled', async ({ page }) => {
            const widths = await page.evaluate((_) => {
                $.setStyle(document.body, { inlineSize: '600px' });
                const input = $.findOne('#autocomplete');
                $.setStyle(input, { boxSizing: 'border-box', inlineSize: '240px' });
                UI.Autocomplete.init(input, {
                    data: ['Short'],
                    minSearch: 0,
                }).show();
                return {
                    body: document.body.getBoundingClientRect().width,
                    input: input.getBoundingClientRect().width,
                    menu: $.findOne('.autocomplete-menu').getBoundingClientRect().width,
                };
            });

            expect(widths.menu).toBeLessThan(widths.input);
            expect(widths.menu).toBeLessThan(widths.body);
        });

        test('appends to a configured container', async ({ page }) => {
            await page.evaluate((_) => {
                $.append(document.body, $.create('div', { attributes: { id: 'portal' } }));
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    appendTo: '#portal',
                    data: ['One'],
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('#portal > .autocomplete-menu')).toHaveCount(1);
        });

        test('falls back after the input for an invalid append selector', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    appendTo: '[',
                    data: ['One'],
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('#autocomplete + .autocomplete-menu')).toHaveCount(1);
        });

        test('applies placement, position, spacing, fixed, and minContact options', async ({ page }) => {
            await page.evaluate((_) => {
                $.setStyle(document.body, { padding: '200px' });
                const input = $.findOne('#autocomplete');
                UI.Autocomplete.init(input, {
                    data: ['One'],
                    fixed: true,
                    minContact: 12,
                    minSearch: 0,
                    placement: 'top',
                    position: 'end',
                    spacing: 7,
                }).show();
            });

            const input = page.locator('#autocomplete');
            const menu = page.locator('.autocomplete-menu');
            await expect(input).toHaveAttribute('data-ui-placement', 'top');
            await expect(menu).toHaveAttribute('data-ui-placement', 'top');
            const gap = await page.evaluate((_) => {
                const inputBox = $.findOne('#autocomplete').getBoundingClientRect();
                const menuBox = $.findOne('.autocomplete-menu').getBoundingClientRect();
                return Math.round(inputBox.top - menuBox.bottom);
            });
            expect(gap).toBe(7);
        });
    });

    test.describe('styles, direction, and layout', () => {
        test('uses dropdown-aligned visual styles and show state', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                }).show();
            });

            const menu = page.locator('.autocomplete-menu');
            const item = page.locator('.autocomplete-item');
            await expect(menu).toHaveClass(/show/);
            await expect(menu).toHaveCSS('display', 'block');
            await expect(menu).toHaveCSS('text-align', 'start');
            await expect(menu).toHaveCSS('border-radius', '16px');
            await expect(menu).toHaveCSS('overflow-y', 'auto');
            await expect(item).toHaveCSS('box-shadow', /.+/);
        });

        for (const { size, pixels } of [
            { size: 'sm', pixels: '14px' },
            { size: 'lg', pixels: '20px' },
        ]) {
            test(`supports ${size} inputs`, async ({ page }) => {
                await page.evaluate((size) => {
                    const input = document.querySelector('#autocomplete');
                    input.classList.add(`input-${size}`);
                    UI.Autocomplete.init(input, { data: ['One'], minSearch: 0 }).show();
                }, size);

                await expect(page.locator(`.autocomplete-menu-${size}`)).toHaveCSS('font-size', pixels);
            });
        }

        test('constrains long results and vertical overflow', async ({ page }) => {
            await page.evaluate((_) => {
                const results = Array.from({ length: 30 }, (_, index) =>
                    `${index}: ${'Long autocomplete result '.repeat(20)}`,
                );
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: results,
                    maxHeight: '100px',
                    minSearch: 0,
                }).show();
            });

            const menu = page.locator('.autocomplete-menu');
            const item = page.locator('.autocomplete-item').first();
            await expect(menu).toHaveCSS('max-height', '100px');
            await expect(item).toHaveCSS('text-overflow', 'ellipsis');
            expect(await menu.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
            expect(await item.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
        });

        test('aligns logical start in RTL', async ({ page }) => {
            await page.evaluate((_) => {
                $.setAttribute(document.documentElement, { dir: 'rtl' });
                const input = $.findOne('#autocomplete');
                $.setStyle(input, { inlineSize: '240px' });
                UI.Autocomplete.init(input, {
                    data: ['نتيجة'],
                    minSearch: 0,
                }).show();
            });

            const menu = page.locator('.autocomplete-menu');
            await expect(menu).toHaveCSS('direction', 'rtl');
            await expect(menu).toHaveCSS('text-align', 'start');
            const edgeDifference = await page.evaluate((_) => {
                const inputBox = $.findOne('#autocomplete').getBoundingClientRect();
                const menuBox = $.findOne('.autocomplete-menu').getBoundingClientRect();
                return Math.abs(inputBox.right - menuBox.right);
            });
            expect(edgeDifference).toBeLessThanOrEqual(1);
        });

        for (const { reducedMotion, duration } of [
            { reducedMotion: 'reduce', duration: '0s' },
            { reducedMotion: 'no-preference', duration: '0.125s' },
        ]) {
            test(`respects ${reducedMotion} motion preferences`, async ({ page }) => {
                await page.emulateMedia({ reducedMotion });
                await page.evaluate((_) => {
                    UI.Autocomplete.init($.findOne('#autocomplete'), {
                        data: ['One'],
                        duration: 125,
                        minSearch: 0,
                    }).show();
                });

                await expect(page.locator('.autocomplete-menu')).toHaveCSS('transition-duration', duration);
            });
        }

        test('uses system colors in forced-colors mode', async ({ browserName, page }) => {
            test.skip(browserName !== 'chromium', 'Forced colors emulation is Chromium-only.');
            await page.emulateMedia({ forcedColors: 'active' });
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                }).show();
            });

            const menu = page.locator('.autocomplete-menu');
            await expect(menu).toHaveCSS('forced-color-adjust', 'none');
            await expect(menu).toHaveCSS('box-shadow', 'none');
            await expect(menu).toHaveCSS('backdrop-filter', 'none');
        });
    });
});
