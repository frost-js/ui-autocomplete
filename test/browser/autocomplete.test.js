import { expect, test } from '#test';
import { resetPage } from '../setup/browser.js';

test.beforeEach(async ({ page }) => {
    await resetPage(page);
});

test.describe('Autocomplete', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            $.setHTML(
                document.body,
                '<input id="autocomplete"><input id="autocomplete2"><button id="outside">Outside</button>',
            );
        });
    });

    test.describe('#init', () => {
        test('creates an Autocomplete', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                return UI.Autocomplete.init(input) instanceof UI.Autocomplete;
            })).toBe(true);
        });

        test('creates an Autocomplete (query)', async ({ page }) => {
            expect(await page.evaluate((_) =>
                $('#autocomplete').autocomplete() instanceof UI.Autocomplete)).toBe(true);
        });

        test('creates multiple Autocompletes and returns the first (query)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const first = $('input').autocomplete();
                return first === $.getData('#autocomplete', 'autocomplete') &&
                    ['#autocomplete', '#autocomplete2'].every((selector) =>
                        $.getData(selector, 'autocomplete') instanceof UI.Autocomplete,
                    );
            })).toBe(true);
        });

        test('reuses an existing Autocomplete', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                const first = UI.Autocomplete.init(input, { data: ['First'] });
                const second = UI.Autocomplete.init(input, { data: ['Second'] });
                return first === second;
            })).toBe(true);
        });

        test('exposes frozen normalized options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const autocomplete = UI.Autocomplete.init(
                    $.findOne('#autocomplete'),
                    { data: ['One'], minSearch: 0 },
                );
                return {
                    data: autocomplete.options.data,
                    frozen: Object.isFrozen(autocomplete.options),
                    minSearch: autocomplete.options.minSearch,
                    placement: autocomplete.options.placement,
                    position: autocomplete.options.position,
                };
            })).toEqual({
                data: ['One'],
                frozen: true,
                minSearch: 0,
                placement: 'bottom',
                position: 'start',
            });
        });
    });

    test.describe('#dispose', () => {
        test('removes the menu and restores pre-existing input attributes', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    `
                        <input
                            id="autocomplete"
                            role="searchbox"
                            aria-controls="old-controls"
                            aria-autocomplete="both"
                            aria-expanded="mixed"
                            aria-haspopup="tree"
                            aria-activedescendant="old-active"
                        >
                    `,
                );
                const input = $.findOne('#autocomplete');
                const autocomplete = UI.Autocomplete.init(input, {
                    data: ['One'],
                    minSearch: 0,
                });
                autocomplete.show();
                autocomplete.dispose();
                window.disposedAutocomplete = autocomplete;
            });

            const input = page.locator('#autocomplete');
            await expect(input).toHaveAttribute('role', 'searchbox');
            await expect(input).toHaveAttribute('aria-controls', 'old-controls');
            await expect(input).toHaveAttribute('aria-autocomplete', 'both');
            await expect(input).toHaveAttribute('aria-expanded', 'mixed');
            await expect(input).toHaveAttribute('aria-haspopup', 'tree');
            await expect(input).toHaveAttribute('aria-activedescendant', 'old-active');
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            expect(await page.evaluate((_) => ({
                data: $.hasData('#autocomplete', 'autocomplete'),
                node: window.disposedAutocomplete.node,
                options: window.disposedAutocomplete.options,
            }))).toEqual({
                data: false,
                node: null,
                options: null,
            });
        });

        test('restores absent ARIA attributes and supports repeated disposal', async ({ page }) => {
            await page.evaluate((_) => {
                const autocomplete = UI.Autocomplete.init($.findOne('#autocomplete'));
                autocomplete.dispose();
                autocomplete.dispose();
            });

            const input = page.locator('#autocomplete');
            for (const attribute of [
                'role',
                'aria-controls',
                'aria-autocomplete',
                'aria-expanded',
                'aria-haspopup',
                'aria-activedescendant',
            ]) {
                await expect(input).not.toHaveAttribute(attribute);
            }
        });

        test('removes the Autocomplete (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $('#autocomplete').autocomplete();
                $('#autocomplete').autocomplete('dispose');
            });

            expect(await page.evaluate((_) => $.hasData('#autocomplete', 'autocomplete'))).toBe(false);
        });

        test('disposes when the original input is removed', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                const autocomplete = UI.Autocomplete.init(input, {
                    data: ['One'],
                    minSearch: 0,
                });
                autocomplete.show();
                $.remove(input);
                return autocomplete.node === null && autocomplete.options === null;
            })).toBe(true);

            await expect(page.locator('#autocomplete')).toHaveCount(0);
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

        test('can be reinitialized after disposal', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                UI.Autocomplete.init(input).dispose();
                window.autocomplete = UI.Autocomplete.init(input, {
                    data: ['Reinitialized'],
                    minSearch: 0,
                });
                window.autocomplete.show();
            });

            await expect(page.locator('.autocomplete-item')).toHaveText('Reinitialized');
        });
    });

    test.describe('#hide', () => {
        test('hides and detaches the menu', async ({ page }) => {
            await page.evaluate((_) => {
                const autocomplete = UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                });
                autocomplete.show();
                autocomplete.hide();
            });

            await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'false');
            await expect(page.locator('#autocomplete')).not.toHaveAttribute('aria-activedescendant');
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });

        test('hides the menu (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $('#autocomplete').autocomplete({ data: ['One'], minSearch: 0 });
                $('#autocomplete').autocomplete('show');
                $('#autocomplete').autocomplete('hide');
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });

        test('does nothing when the menu is already hidden', async ({ page }) => {
            await page.evaluate((_) => {
                const autocomplete = UI.Autocomplete.init($.findOne('#autocomplete'));
                autocomplete.hide();
            });

            await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'false');
        });

        test('can cancel hiding', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                const autocomplete = UI.Autocomplete.init(input, {
                    data: ['One'],
                    minSearch: 0,
                });
                autocomplete.show();
                $.addEvent(input, 'hide.ui.autocomplete', (_) => false);
                autocomplete.hide();
            });

            await expect(page.locator('.autocomplete-menu')).toBeVisible();
            await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'true');
        });
    });

    test.describe('#show', () => {
        test('shows local results', async ({ page }) => {
            await page.evaluate((_) => {
                const autocomplete = UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One', 'Two'],
                    minSearch: 0,
                });
                autocomplete.show();
            });

            await expect(page.locator('.autocomplete-menu')).toBeVisible();
            await expect(page.locator('.autocomplete-item')).toHaveCount(2);
            await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'true');
        });

        test('shows the menu (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $('#autocomplete').autocomplete({ data: ['One'], minSearch: 0 });
                $('#autocomplete').autocomplete('show');
            });

            await expect(page.locator('.autocomplete-item')).toHaveText('One');
        });

        test('does not duplicate an already visible menu', async ({ page }) => {
            await page.evaluate((_) => {
                const autocomplete = UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                });
                autocomplete.show();
                autocomplete.show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCount(1);
            await expect(page.locator('.autocomplete-item')).toHaveCount(1);
        });

        test('does not show for disabled or readonly inputs', async ({ page }) => {
            await page.evaluate((_) => {
                const first = $.findOne('#autocomplete');
                const second = $.findOne('#autocomplete2');
                $.setAttribute(first, { disabled: true });
                $.setAttribute(second, { readonly: true });
                UI.Autocomplete.init(first, { data: ['One'], minSearch: 0 }).show();
                UI.Autocomplete.init(second, { data: ['Two'], minSearch: 0 }).show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'false');
            await expect(page.locator('#autocomplete2')).toHaveAttribute('aria-expanded', 'false');
        });

        test('can cancel showing', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                const autocomplete = UI.Autocomplete.init(input, {
                    data: ['One'],
                    minSearch: 0,
                });
                $.addEvent(input, 'show.ui.autocomplete', (_) => false);
                autocomplete.show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'false');
        });
    });

    test.describe('#toggle', () => {
        test('toggles the menu', async ({ page }) => {
            await page.evaluate((_) => {
                window.autocomplete = UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                });
                window.autocomplete.toggle();
            });
            await expect(page.locator('.autocomplete-menu')).toBeVisible();

            await page.evaluate((_) => window.autocomplete.toggle());
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });

        test('toggles the menu (query)', async ({ page }) => {
            await page.evaluate((_) => {
                $('#autocomplete').autocomplete({ data: ['One'], minSearch: 0 });
                $('#autocomplete').autocomplete('toggle');
            });
            await expect(page.locator('.autocomplete-menu')).toBeVisible();

            await page.evaluate((_) => $('#autocomplete').autocomplete('toggle'));
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });
    });

    test.describe('#update', () => {
        test('updates full-width sizing after the input changes', async ({ page }) => {
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
                window.autocomplete.update();
            });

            const widths = await page.locator('#autocomplete, .autocomplete-menu').evaluateAll((nodes) =>
                nodes.map((node) => node.getBoundingClientRect().width),
            );
            expect(widths[1]).toBe(widths[0]);
        });

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

    test.describe('input attributes and accessibility', () => {
        test('renders combobox and listbox attributes', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                }).show();
            });

            const input = page.locator('#autocomplete');
            const menu = page.locator('.autocomplete-menu');
            await expect(input).toHaveAttribute('role', 'combobox');
            await expect(input).toHaveAttribute('aria-autocomplete', 'list');
            await expect(input).toHaveAttribute('aria-haspopup', 'listbox');
            await expect(input).toHaveAttribute('aria-expanded', 'true');
            await expect(input).toHaveAttribute('aria-controls', await menu.getAttribute('id'));
            await expect(menu).toHaveAttribute('role', 'listbox');
            await expect(menu).toHaveAttribute('aria-busy', 'false');
            await expect(menu.locator('[role="option"]')).toHaveCount(1);
        });

        test('maintains a valid active descendant while navigating', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One', 'Two'],
                    minSearch: 0,
                }).show();
            });

            const input = page.locator('#autocomplete');
            const items = page.locator('.autocomplete-item');
            await expect(input).toHaveAttribute('aria-activedescendant', await items.first().getAttribute('id'));
            await input.press('ArrowDown');
            await expect(input).toHaveAttribute('aria-activedescendant', await items.nth(1).getAttribute('id'));
            await input.press('Escape');
            await expect(input).not.toHaveAttribute('aria-activedescendant');
        });

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
            await page.evaluate((_) => window.rejectRequest(new Error('Failed')));
            await expect(status).toHaveText('Error loading data.');
            await expect(page.locator('.autocomplete-menu')).toHaveAttribute('aria-busy', 'false');
        });

        test('generates unique menu and option IDs for multiple inputs', async ({ page }) => {
            expect(await page.evaluate((_) => {
                for (const selector of ['#autocomplete', '#autocomplete2']) {
                    UI.Autocomplete.init($.findOne(selector), {
                        data: ['One'],
                        minSearch: 0,
                    }).show();
                }
                const ids = $.find('[id]').map((node) => node.id);
                return new Set(ids).size === ids.length;
            })).toBe(true);

            await expect(page.locator('.autocomplete-menu')).toHaveCount(2);
        });
    });

    test.describe('events', () => {
        test('triggers lifecycle events in order', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                window.events = [];
                for (const eventName of ['show', 'shown', 'hide', 'hidden']) {
                    $.addEvent(input, `${eventName}.ui.autocomplete`, (event) => {
                        window.events.push(`${event.type}.${event.namespace}`);
                    });
                }
                window.autocomplete = UI.Autocomplete.init(input, {
                    data: ['One'],
                    minSearch: 0,
                });
                window.autocomplete.show();
            });
            await page.waitForFunction((_) => window.events.includes('shown.ui.autocomplete'));
            await page.evaluate((_) => window.autocomplete.hide());
            await page.waitForFunction((_) => window.events.includes('hidden.ui.autocomplete'));

            expect(await page.evaluate((_) => window.events)).toEqual([
                'show.ui.autocomplete',
                'shown.ui.autocomplete',
                'hide.ui.autocomplete',
                'hidden.ui.autocomplete',
            ]);
        });

        test('suppresses stale transition completion events', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                window.events = [];
                $.addEvent(input, 'shown.ui.autocomplete hidden.ui.autocomplete', (event) => {
                    window.events.push(event.type);
                });
                window.autocomplete = UI.Autocomplete.init(input, {
                    data: ['One'],
                    duration: 80,
                    minSearch: 0,
                });
                window.autocomplete.show();
                window.autocomplete.hide();
                window.autocomplete.show();
            });
            await page.waitForTimeout(180);

            expect(await page.evaluate((_) => window.events)).toEqual(['shown']);
            await expect(page.locator('.autocomplete-menu')).toBeVisible();
        });

        test('triggers one change event when a different result is selected', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                window.changes = [];
                $.addEvent(input, 'change.ui.autocomplete', (event) => {
                    window.changes.push({
                        namespace: event.namespace,
                        type: event.type,
                        value: event.currentTarget.value,
                    });
                });
                UI.Autocomplete.init(input, {
                    data: ['One'],
                    minSearch: 0,
                }).show();
            });
            await page.locator('.autocomplete-item').click();

            expect(await page.evaluate((_) => window.changes)).toEqual([
                {
                    namespace: 'ui.autocomplete',
                    type: 'change',
                    value: 'One',
                },
            ]);
            await expect(page.locator('#autocomplete')).toHaveValue('One');
        });

        test('does not trigger change when selecting the current value', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                $.setValue(input, 'One');
                window.changes = 0;
                $.addEvent(input, 'change.ui.autocomplete', (_) => window.changes++);
                UI.Autocomplete.init(input, {
                    data: ['One'],
                    minSearch: 0,
                }).show();
            });
            await page.locator('.autocomplete-item').click();

            expect(await page.evaluate((_) => window.changes)).toBe(0);
        });
    });

    test.describe('user events', () => {
        test.beforeEach(async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One', 'Two', 'Three'],
                    minSearch: 0,
                });
            });
        });

        test('opens on input and selects with the mouse', async ({ page }) => {
            const input = page.locator('#autocomplete');
            await input.fill('o');
            const item = page.locator('.autocomplete-item').filter({ hasText: 'One' });
            await expect(item).toBeVisible();
            await item.click();

            await expect(input).toHaveValue('One');
            await expect(input).toBeFocused();
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });

        test('updates focus on mouseover', async ({ page }) => {
            const input = page.locator('#autocomplete');
            await input.focus();
            await page.evaluate((_) => $.getData('#autocomplete', 'autocomplete').show());
            const item = page.locator('.autocomplete-item').nth(1);
            await item.hover();

            await expect(item).toHaveClass(/focus/);
            await expect(input).toHaveAttribute('aria-activedescendant', await item.getAttribute('id'));
        });

        test('navigates with arrow keys and keeps boundary focus', async ({ page }) => {
            const input = page.locator('#autocomplete');
            await input.focus();
            await input.press('ArrowDown');
            const items = page.locator('.autocomplete-item');
            await expect(items.first()).toHaveClass(/focus/);
            await input.press('ArrowDown');
            await expect(items.nth(1)).toHaveClass(/focus/);
            await input.press('ArrowUp');
            await expect(items.first()).toHaveClass(/focus/);
            await input.press('ArrowUp');
            await expect(items.first()).toHaveClass(/focus/);
        });

        test('opens at the last result with ArrowUp', async ({ page }) => {
            const input = page.locator('#autocomplete');
            await input.focus();
            await input.press('ArrowUp');

            await expect(page.locator('.autocomplete-item').last()).toHaveClass(/focus/);
        });

        test('selects with Enter without submitting the form', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<form id="form"><input id="autocomplete"><button>Submit</button></form>',
                );
                window.submits = 0;
                $.addEvent('#form', 'submit', (event) => {
                    event.preventDefault();
                    window.submits++;
                });
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                });
            });
            const input = page.locator('#autocomplete');
            await input.focus();
            await input.press('ArrowDown');
            await input.press('Enter');

            await expect(input).toHaveValue('One');
            expect(await page.evaluate((_) => window.submits)).toBe(0);
        });

        test('closes with Escape without propagating to a parent handler', async ({ page }) => {
            await page.evaluate((_) => {
                window.escapes = 0;
                $.addEvent(document.body, 'keydown', (event) => {
                    if (event.key === 'Escape') {
                        window.escapes++;
                    }
                });
            });
            const input = page.locator('#autocomplete');
            await input.focus();
            await input.press('ArrowDown');
            await input.press('Escape');

            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            expect(await page.evaluate((_) => window.escapes)).toBe(0);
        });

        test('closes on blur', async ({ page }) => {
            const input = page.locator('#autocomplete');
            await input.focus();
            await input.press('ArrowDown');
            await page.locator('#outside').focus();

            await expect(page.locator('#outside')).toBeFocused();
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });

        test('ignores queued input work after focus moves away', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                input.focus();
                $.setValue(input, 'o');
                input.dispatchEvent(new Event('input', { bubbles: true }));
                $.focus('#outside');
            });

            await expect(page.locator('#outside')).toBeFocused();
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });

        test('ignores unrelated keys without changing the open menu', async ({ page }) => {
            const input = page.locator('#autocomplete');
            await input.focus();
            await input.press('ArrowDown');
            await input.press('Shift');

            await expect(page.locator('.autocomplete-menu')).toBeVisible();
            await expect(page.locator('.autocomplete-item').first()).toHaveClass(/focus/);
        });

        test('ignores non-primary result clicks', async ({ page }) => {
            const input = page.locator('#autocomplete');
            await input.focus();
            await input.press('ArrowDown');
            await page.locator('.autocomplete-item').first().dispatchEvent('click', { button: 2 });

            await expect(input).toHaveValue('');
            await expect(page.locator('.autocomplete-menu')).toBeVisible();
        });

        test('does not suppress the context menu', async ({ page }) => {
            const allowed = await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                input.focus();
                $.getData(input, 'autocomplete').show();
                return $.findOne('.autocomplete-item').dispatchEvent(
                    new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
                );
            });

            expect(allowed).toBe(true);
        });
    });

    test.describe('data option', () => {
        test('filters and sorts local data', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['Beta', 'alphabet', 'Alpha'],
                });
            });
            await page.locator('#autocomplete').fill('alp');

            await expect(page.locator('.autocomplete-item')).toHaveText(['Alpha', 'alphabet']);
        });

        test('keeps string-like dataset values unchanged when selected', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['true', '001', 'null'],
                    minSearch: 0,
                }).show();
            });
            await page.locator('.autocomplete-item').filter({ hasText: '001' }).click();

            await expect(page.locator('#autocomplete')).toHaveValue('001');
        });

        test('ignores non-string data values', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One', null, 2, {}, 'Two'],
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-item')).toHaveText(['One', 'Two']);
        });

        test('handles missing and empty data without opening', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: null,
                    minSearch: 0,
                }).show();
                UI.Autocomplete.init($.findOne('#autocomplete2'), {
                    data: [],
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
        });

        test('reads local data from a data attribute', async ({ page }) => {
            await page.evaluate((_) => {
                $.setDataset('#autocomplete', { uiData: ['One', 'Two'], uiMinSearch: 0 });
                UI.Autocomplete.init($.findOne('#autocomplete')).show();
            });

            await expect(page.locator('.autocomplete-item')).toHaveText(['One', 'Two']);
        });

        test('refreshes local results while the menu is open', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#autocomplete');
                input.focus();
                UI.Autocomplete.init(input, {
                    data: ['One', 'Two'],
                    minSearch: 0,
                }).show();
            });
            const input = page.locator('#autocomplete');
            await expect(page.locator('.autocomplete-item')).toHaveCount(2);
            await input.fill('tw');

            await expect(page.locator('.autocomplete-item')).toHaveText('Two');
        });
    });

    test.describe('getResults option', () => {
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

        test('renders rejected and synchronously thrown request errors', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    debounce: 0,
                    getResults: (_) => Promise.reject(new Error('Rejected')),
                    minSearch: 0,
                }).show();
                UI.Autocomplete.init($.findOne('#autocomplete2'), {
                    debounce: 0,
                    getResults() {
                        throw new Error('Thrown');
                    },
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-menu [aria-disabled="true"]'))
                .toHaveText(['Error loading data.', 'Error loading data.']);
        });

        test('treats malformed and missing responses as errors', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    debounce: 0,
                    getResults: (_) => Promise.resolve(),
                    minSearch: 0,
                }).show();
                UI.Autocomplete.init($.findOne('#autocomplete2'), {
                    debounce: 0,
                    getResults: (_) => Promise.resolve({ results: [1] }),
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-menu [aria-disabled="true"]'))
                .toHaveText(['Error loading data.', 'Error loading data.']);
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
            await expect(page.locator('.autocomplete-item')).toHaveCount(20);
            await page.locator('.autocomplete-menu').evaluate((menu) => {
                menu.scrollTop = 0;
                menu.dispatchEvent(new Event('scroll'));
            });
            await page.waitForTimeout(350);

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
            await expect(page.locator('.autocomplete-item')).toHaveCount(20);
            const menu = page.locator('.autocomplete-menu');
            await menu.evaluate((node) => {
                node.scrollTop = node.scrollHeight;
                node.dispatchEvent(new Event('scroll'));
            });
            await page.waitForTimeout(350);
            await menu.evaluate((node) => node.dispatchEvent(new Event('scroll')));
            await page.waitForTimeout(350);

            expect(await page.evaluate((_) => window.calls)).toBe(2);
            await expect(page.locator('.autocomplete-item')).toHaveCount(20);
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
    });

    test.describe('rendering and sanitization', () => {
        test('sanitizes string rendering', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                    renderResult: (_) => '<strong>Safe</strong><script data-unsafe>Unsafe</script>',
                }).show();
            });

            await expect(page.locator('.autocomplete-item strong')).toHaveText('Safe');
            await expect(page.locator('[data-unsafe]')).toHaveCount(0);
        });

        test('appends DOM nodes without cloning', async ({ page }) => {
            expect(await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                    renderResult(value) {
                        const node = $.create('em', { text: value });
                        window.renderedNode = node;
                        return node;
                    },
                }).show();
                return $.findOne('.autocomplete-item em') === window.renderedNode;
            })).toBe(true);

            await expect(page.locator('.autocomplete-item em')).toHaveText('One');
        });

        test('falls back safely when rendering or sanitizing throws', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                    renderResult() {
                        throw new Error('Render failed');
                    },
                    sanitize() {
                        throw new Error('Sanitize failed');
                    },
                }).show();
            });

            await expect(page.locator('.autocomplete-item')).toHaveText('One');
        });

        test('supports empty rendering and ignores returning the item itself', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['Empty'],
                    minSearch: 0,
                    renderResult: (_) => null,
                }).show();
                UI.Autocomplete.init($.findOne('#autocomplete2'), {
                    data: ['Self'],
                    minSearch: 0,
                    renderResult: (_, item) => item,
                }).show();
            });

            const items = page.locator('.autocomplete-item');
            await expect(items).toHaveCount(2);
            await expect(items.first()).toBeEmpty();
            await expect(items.nth(1)).toBeEmpty();
            await expect(items.first()).toHaveAttribute('aria-label', 'Empty');
            await expect(items.nth(1)).toHaveAttribute('aria-label', 'Self');
        });
    });

    test.describe('matching and sorting', () => {
        test('matches case and accents and sorts by match position', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['xCAFÉ', 'Cafe', 'cafeteria'],
                });
            });
            await page.locator('#autocomplete').fill('cafe');

            await expect(page.locator('.autocomplete-item')).toHaveText(['Cafe', 'cafeteria', 'xCAFÉ']);
        });

        test('uses custom matching and sorting callbacks with component context', async ({ page }) => {
            const callbackData = await page.evaluate((_) => {
                window.callbackData = [];
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One', 'Two'],
                    isMatch(value, term) {
                        window.callbackData.push(['match', this instanceof UI.Autocomplete, value, term]);
                        return true;
                    },
                    minSearch: 0,
                    sortResults(a, b, term) {
                        window.callbackData.push(['sort', this instanceof UI.Autocomplete, a, b, term]);
                        return b.localeCompare(a);
                    },
                }).show();
                return window.callbackData;
            });
            expect(callbackData.slice(0, 2)).toEqual([
                ['match', true, 'One', ''],
                ['match', true, 'Two', ''],
            ]);
            expect(callbackData[2][0]).toBe('sort');
            expect(callbackData[2][1]).toBe(true);
            expect(callbackData[2].slice(2, 4).sort()).toEqual(['One', 'Two']);
            expect(callbackData[2][4]).toBe('');

            await expect(page.locator('.autocomplete-item')).toHaveText(['Two', 'One']);
        });

        test('handles matching and sorting exceptions', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    isMatch() {
                        throw new Error('Match failed');
                    },
                    minSearch: 0,
                }).show();
                UI.Autocomplete.init($.findOne('#autocomplete2'), {
                    data: ['Two', 'One'],
                    isMatch: (_) => true,
                    minSearch: 0,
                    sortResults() {
                        throw new Error('Sort failed');
                    },
                }).show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCount(1);
            await expect(page.locator('.autocomplete-item')).toHaveText(['One', 'Two']);
        });
    });

    test.describe('minSearch and debounce', () => {
        test('waits for minSearch and closes after deletion below it', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['Alpha'],
                    minSearch: 2,
                });
            });
            const input = page.locator('#autocomplete');
            await input.fill('a');
            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            await input.fill('al');
            await expect(page.locator('.autocomplete-menu')).toBeVisible();
            await input.fill('a');
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
            await input.fill('ab');
            await input.fill('abc');
            await page.waitForTimeout(50);
            expect(await page.evaluate((_) => window.terms.length)).toBe(0);
            await expect(page.locator('.autocomplete-item')).toHaveText('abc');
            expect(await page.evaluate((_) => window.terms)).toEqual(['abc']);
        });

        test('normalizes negative debounce and minSearch values', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    debounce: -1,
                    minSearch: -1,
                }).show();
            });

            await expect(page.locator('.autocomplete-item')).toHaveText('One');
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

        test('supports small and large inputs', async ({ page }) => {
            await page.evaluate((_) => {
                $.addClass('#autocomplete', 'input-sm');
                $.addClass('#autocomplete2', 'input-lg');
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['Small'],
                    minSearch: 0,
                }).show();
                UI.Autocomplete.init($.findOne('#autocomplete2'), {
                    data: ['Large'],
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-menu-sm')).toHaveCSS('font-size', '14px');
            await expect(page.locator('.autocomplete-menu-lg')).toHaveCSS('font-size', '20px');
        });

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

        test('disables transitions for reduced motion', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    duration: 125,
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCSS('transition-duration', '0s');
        });

        test('uses the configured transition without reduced motion', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    duration: 125,
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCSS('transition-duration', '0.125s');
        });

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

    test.describe('customization', () => {
        test('uses custom loading and error messages', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    debounce: 0,
                    getResults: (_) => Promise.reject(new Error('Failed')),
                    lang: { error: 'Custom error', loading: 'Custom loading' },
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('[aria-disabled="true"]')).toHaveText('Custom error');
        });

        test('uses customized component classes', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.classes.menu = 'autocomplete-menu custom-menu';
                UI.Autocomplete.classes.item = 'autocomplete-item custom-item';
                UI.Autocomplete.classes.focus = 'custom-focus';
                UI.Autocomplete.classes.show = 'show';
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveClass('autocomplete-menu custom-menu show');
            await expect(page.locator('.autocomplete-item')).toHaveClass('autocomplete-item custom-item custom-focus');
        });

        test('reads option overrides from data attributes', async ({ page }) => {
            await page.evaluate((_) => {
                $.setDataset('#autocomplete', {
                    uiData: ['One'],
                    uiDuration: 0,
                    uiFullWidth: true,
                    uiMaxHeight: '90px',
                    uiMinSearch: 0,
                });
                $.setStyle('#autocomplete', { boxSizing: 'border-box', inlineSize: '180px' });
                UI.Autocomplete.init($.findOne('#autocomplete')).show();
            });

            const menu = page.locator('.autocomplete-menu');
            const widths = await page.locator('#autocomplete, .autocomplete-menu').evaluateAll((nodes) =>
                nodes.map((node) => node.getBoundingClientRect().width),
            );
            expect(widths[1]).toBe(widths[0]);
            await expect(menu).toHaveCSS('max-height', '90px');
            await expect(menu.locator('.autocomplete-item')).toHaveText('One');
        });

        test('allows default option customization', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.defaults.data = ['Default result'];
                UI.Autocomplete.defaults.minSearch = 0;
                UI.Autocomplete.init($.findOne('#autocomplete')).show();
            });

            await expect(page.locator('.autocomplete-item')).toHaveText('Default result');
        });
    });
});
