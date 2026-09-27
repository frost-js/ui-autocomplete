import { expect, test } from '#test';

test.describe('Autocomplete', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((markup) => {
            document.body.innerHTML = markup;
        }, '<input id="autocomplete"><input id="autocomplete2"><button id="outside">Outside</button>');
    });

    test.describe('#init', () => {
        for (const { name, init } of [
            { name: 'class', init: () => UI.Autocomplete.init(document.querySelector('#autocomplete')) },
            { name: 'QuerySet', init: () => $('#autocomplete').autocomplete() },
        ]) {
            test(`creates an Autocomplete (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(init);
                expect(await instance.evaluate((value) => value instanceof UI.Autocomplete)).toBe(true);
                expect(await instance.evaluate((value) => $.getData('#autocomplete', 'autocomplete') === value)).toBe(true);
            });
        }

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
        for (const { name, dispose } of [
            { name: 'class', dispose: () => window.disposedAutocomplete.dispose() },
            { name: 'QuerySet', dispose: () => $('#autocomplete').autocomplete('dispose') },
        ]) {
            test(`removes the menu and restores pre-existing input attributes (${name})`, async ({ page }) => {
                await page.evaluate((_) => {
                    $.setHtml(
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
                    window.disposedAutocomplete = autocomplete;
                });
                await page.evaluate(dispose);

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
        }

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
        for (const { name, hide } of [
            { name: 'class', hide: () => $.getData('#autocomplete', 'autocomplete').hide() },
            { name: 'QuerySet', hide: () => $('#autocomplete').autocomplete('hide') },
        ]) {
            test(`hides and detaches the menu (${name})`, async ({ page }) => {
                await page.evaluate((_) => {
                    const autocomplete = UI.Autocomplete.init($.findOne('#autocomplete'), {
                        data: ['One'],
                        minSearch: 0,
                    });
                    autocomplete.show();
                });
                await page.evaluate(hide);

                await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'false');
                await expect(page.locator('#autocomplete')).not.toHaveAttribute('aria-activedescendant');
                await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            });
        }

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
        for (const { name, show } of [
            { name: 'class', show: () => $.getData('#autocomplete', 'autocomplete').show() },
            { name: 'QuerySet', show: () => $('#autocomplete').autocomplete('show') },
        ]) {
            test(`shows local results (${name})`, async ({ page }) => {
                await page.evaluate((_) => {
                    UI.Autocomplete.init($.findOne('#autocomplete'), {
                        data: ['One', 'Two'],
                        minSearch: 0,
                    });
                });
                await page.evaluate(show);

                await expect(page.locator('.autocomplete-menu')).toBeVisible();
                await expect(page.locator('.autocomplete-item')).toHaveCount(2);
                await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'true');
            });
        }

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

        for (const attribute of ['disabled', 'readonly']) {
            test(`does not show for a ${attribute} input`, async ({ page }) => {
                await page.evaluate((attribute) => {
                    const input = document.querySelector('#autocomplete');
                    input.setAttribute(attribute, '');
                    UI.Autocomplete.init(input, { data: ['One'], minSearch: 0 }).show();
                }, attribute);

                await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
                await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'false');
            });
        }

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
        for (const { name, toggle } of [
            { name: 'class', toggle: () => window.autocomplete.toggle() },
            { name: 'QuerySet', toggle: () => $('#autocomplete').autocomplete('toggle') },
        ]) {
            test(`toggles the menu (${name})`, async ({ page }) => {
                await page.evaluate((_) => {
                    window.autocomplete = UI.Autocomplete.init($.findOne('#autocomplete'), {
                        data: ['One'],
                        minSearch: 0,
                    });
                });
                await page.evaluate(toggle);
                await expect(page.locator('.autocomplete-menu')).toBeVisible();

                await page.evaluate(toggle);
                await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            });
        }
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
            await page.evaluate(async (_) => {
                await Promise.allSettled(document.querySelector('.autocomplete-menu').getAnimations()
                    .map((animation) => animation.finished));
            });

            await expect.poll(() => page.evaluate((_) => window.events)).toEqual(['shown']);
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

        test.describe('mouse', () => {
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

        test.describe('keyboard', () => {
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
                    $.setHtml(
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

            test('ignores unrelated keys without changing the open menu', async ({ page }) => {
                const input = page.locator('#autocomplete');
                await input.focus();
                await input.press('ArrowDown');
                await input.press('Shift');

                await expect(page.locator('.autocomplete-menu')).toBeVisible();
                await expect(page.locator('.autocomplete-item').first()).toHaveClass(/focus/);
            });
        });

        test.describe('focus and input', () => {
            test('closes on blur', async ({ page }) => {
                const input = page.locator('#autocomplete');
                await input.focus();
                await input.press('ArrowDown');
                await page.locator('#outside').focus();

                await expect(page.locator('#outside')).toBeFocused();
                await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            });

            test.describe('queued input', () => {
                test.use({ mockClock: true });

                test('ignores queued input work after focus moves away', async ({ page }) => {
                    await page.evaluate((_) => {
                        const input = $.findOne('#autocomplete');
                        input.focus();
                        $.setValue(input, 'o');
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        $.focus('#outside');
                    });
                    await page.clock.runFor(1);

                    await expect(page.locator('#outside')).toBeFocused();
                    await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
                });
            });
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

        for (const value of ['true', 'null', '001']) {
            test(`preserves the string value "${value}" when selected`, async ({ page }) => {
                await page.evaluate((value) => {
                    UI.Autocomplete.init(document.querySelector('#autocomplete'), {
                        data: [value],
                        minSearch: 0,
                    }).show();
                }, value);
                await page.getByRole('option').click();

                await expect(page.locator('#autocomplete')).toHaveValue(value);
            });
        }

        test('ignores non-string data values', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One', null, 2, {}, 'Two'],
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-item')).toHaveText(['One', 'Two']);
        });

        for (const { name, options } of [
            { name: 'omitted', options: {} },
            { name: 'null', options: { data: null } },
            { name: 'empty', options: { data: [] } },
        ]) {
            test(`handles ${name} data without opening`, async ({ page }) => {
                await page.evaluate((options) => {
                    UI.Autocomplete.init(document.querySelector('#autocomplete'), {
                        ...options,
                        minSearch: 0,
                    }).show();
                }, options);

                await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            });
        }

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

        test('excludes results when isMatch throws', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
                    data: ['One'],
                    isMatch() {
                        throw new Error('Match failed');
                    },
                    minSearch: 0,
                }).show();
            });

            await expect(page.locator('.autocomplete-menu')).toHaveCount(0);
            await expect(page.locator('#autocomplete')).toHaveAttribute('aria-expanded', 'false');
        });

        test('uses default sorting when sortResults throws', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init($.findOne('#autocomplete'), {
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

    test.describe('minSearch', () => {
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

        test('normalizes negative minSearch for local results', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Autocomplete.init(document.querySelector('#autocomplete'), {
                    data: ['One'],
                    minSearch: -1,
                }).show();
            });

            await expect(page.locator('.autocomplete-item')).toHaveText('One');
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

        for (const { name, callbacks } of [
            { name: 'renderResult', callbacks: ['renderResult'] },
            { name: 'sanitize', callbacks: ['sanitize'] },
            { name: 'both rendering callbacks', callbacks: ['renderResult', 'sanitize'] },
        ]) {
            test(`falls back safely when ${name} throws`, async ({ page }) => {
                await page.evaluate((callbacks) => {
                    const options = {
                        data: ['One'],
                        minSearch: 0,
                        renderResult: (_) => '<strong>One</strong><script data-unsafe>Unsafe</script>',
                    };
                    for (const callback of callbacks) {
                        options[callback] = () => {
                            throw new Error(`${callback} failed`);
                        };
                    }
                    UI.Autocomplete.init($.findOne('#autocomplete'), options).show();
                }, callbacks);

                await expect(page.locator('.autocomplete-item')).toHaveText('One');
                await expect(page.locator('[data-unsafe]')).toHaveCount(0);
            });
        }

        for (const returnsItem of [false, true]) {
            test(`keeps an accessible empty item when renderResult returns ${returnsItem ? 'the item itself' : 'null'}`, async ({ page }) => {
                await page.evaluate((returnsItem) => {
                    UI.Autocomplete.init($.findOne('#autocomplete'), {
                        data: ['One'],
                        minSearch: 0,
                        renderResult: (_, item) => returnsItem ? item : null,
                    }).show();
                }, returnsItem);

                const item = page.locator('.autocomplete-item');
                await expect(item).toHaveCount(1);
                await expect(item).toBeEmpty();
                await expect(item).toHaveAttribute('aria-label', 'One');
            });
        }
    });

    test.describe('customization', () => {
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
