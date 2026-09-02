const $ = globalThis.$;
const { Autocomplete } = globalThis.UI;

const cityData = [
    'Adelaide',
    'Alice Springs',
    'Brisbane',
    'Cairns',
    'Canberra',
    'Darwin',
    'Geelong',
    'Gold Coast',
    'Hobart',
    'Melbourne',
    'Newcastle',
    'Perth',
    'Sydney',
    'Townsville',
    'Wollongong',
];

const languageData = [
    'C',
    'C#',
    'C++',
    'Go',
    'Java',
    'JavaScript',
    'Kotlin',
    'PHP',
    'Python',
    'Ruby',
    'Rust',
    'Swift',
    'TypeScript',
];

const peopleData = [
    'Aisha Rahman',
    'Amelia Hart',
    'Carlos Mendoza',
    'Chloé Martin',
    'Dev Patel',
    'Elena Rossi',
    'Hana Suzuki',
    'Ibrahim Haddad',
    'Léa Dubois',
    'Lucas Silva',
    'Maya Thompson',
    'Noah Williams',
    'Priya Kapoor',
    'Sofia García',
];

const frameworkData = [
    { name: 'Frost UI', type: 'UI library' },
    { name: 'Frost Query', type: 'DOM utilities' },
    { name: 'React', type: 'UI library' },
    { name: 'Svelte', type: 'Compiler' },
    { name: 'Vue', type: 'UI framework' },
];

const sizeData = [
    'A short result',
    'A medium-length result',
    'A deliberately long result that demonstrates predictable wrapping and overflow inside the available viewport',
];

const colorData = [
    'Amber',
    'Blue',
    'Crimson',
    'Emerald',
    'Indigo',
    'Orange',
    'Rose',
    'Violet',
];

const teammateData = [
    'Aisha Rahman',
    'Carlos Mendoza',
    'Chloé Martin',
    'Dev Patel',
    'Elena Rossi',
    'Hana Suzuki',
    'Ibrahim Haddad',
];

const rtlData = [
    'أبو ظبي',
    'الإسكندرية',
    'الدوحة',
    'دبي',
    'عمّان',
    'مسقط',
];

const destinationData = Array.from(
    { length: 48 },
    (_, index) => `Destination ${String(index + 1).padStart(2, '0')}`,
);

const normalize = (value) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const filterResults = (values, term = '') => {
    const normalizedTerm = normalize(term);

    return values.filter((value) => normalize(value).includes(normalizedTerm));
};

const waitForNetwork = (duration, signal) => new Promise((resolve, reject) => {
    const onAbort = () => {
        globalThis.clearTimeout(timeout);
        reject(signal.reason || new DOMException('The request was aborted.', 'AbortError'));
    };
    const timeout = globalThis.setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
    }, duration);

    if (signal.aborted) {
        onAbort();
    } else {
        signal.addEventListener('abort', onAbort, { once: true });
    }
});

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const storedTheme = localStorage.getItem('frostui-autocomplete-demo-theme');
setTheme(['light', 'dark'].includes(storedTheme) ? storedTheme : 'system');

$.ready(() => {
    Autocomplete.init($.findOne('#hero-autocomplete'), {
        data: cityData,
        fullWidth: true,
        minSearch: 0,
    });

    Autocomplete.init($.findOne('#static-autocomplete'), {
        data: languageData,
        fullWidth: true,
    });

    Autocomplete.init($.findOne('#remote-autocomplete'), {
        debounce: 180,
        fullWidth: true,
        getResults: async ({ signal, term }) => {
            await waitForNetwork(650, signal);

            return {
                results: filterResults(peopleData, term),
            };
        },
    });

    Autocomplete.init($.findOne('#pagination-autocomplete'), {
        debounce: 100,
        fullWidth: true,
        maxHeight: '11rem',
        minSearch: 0,
        getResults: async ({ offset, signal, term }) => {
            const pageSize = 8;
            await waitForNetwork(450, signal);

            const matches = filterResults(destinationData, term);
            const results = matches.slice(offset, offset + pageSize);

            return {
                results,
                showMore: offset + results.length < matches.length,
            };
        },
    });

    Autocomplete.init($.findOne('#failure-autocomplete'), {
        debounce: 100,
        fullWidth: true,
        lang: {
            error: 'The example service is unavailable.',
            loading: 'Contacting the service…',
        },
        getResults: async ({ signal }) => {
            await waitForNetwork(600, signal);
            throw new Error('Simulated service failure.');
        },
    });

    Autocomplete.init($.findOne('#render-autocomplete'), {
        data: frameworkData.map(({ name }) => name),
        fullWidth: true,
        minSearch: 0,
        renderResult(value) {
            const framework = frameworkData.find(({ name }) => name === value);
            const row = $.create('span', { class: 'demo-result' });
            const name = $.create('span', {
                class: 'demo-result-name',
                text: value,
            });
            const type = $.create('span', {
                class: 'demo-result-meta',
                text: framework?.type || 'Framework',
            });

            $.append(row, [name, type]);

            return row;
        },
    });

    for (const selector of [
        '#small-autocomplete',
        '#default-autocomplete',
        '#large-autocomplete',
    ]) {
        Autocomplete.init($.findOne(selector), {
            data: sizeData,
            fullWidth: true,
            minSearch: 0,
        });
    }

    Autocomplete.init($.findOne('#disabled-autocomplete'), {
        data: cityData,
        minSearch: 0,
    });
    Autocomplete.init($.findOne('#readonly-autocomplete'), {
        data: cityData,
        minSearch: 0,
    });
    Autocomplete.init($.findOne('#rtl-autocomplete'), {
        data: rtlData,
        fullWidth: true,
        minSearch: 0,
    });
    Autocomplete.init($.findOne('#modal-autocomplete'), {
        appendTo: '#autocomplete-modal .modal-body',
        data: teammateData,
        fullWidth: true,
        maxHeight: '9rem',
        minSearch: 0,
        spacing: 4,
    });

    const methodNode = $.findOne('#methods-autocomplete');
    const initMethodDemo = () => Autocomplete.init(methodNode, {
        data: colorData,
        fullWidth: true,
        minSearch: 0,
        spacing: 4,
    });

    initMethodDemo();

    $.addEvent(
        methodNode,
        'change.ui.autocomplete show.ui.autocomplete shown.ui.autocomplete hide.ui.autocomplete hidden.ui.autocomplete',
        (event) => {
            const entry = $.create('p', {
                class: 'small font-monospace py-2 border-bottom',
                text: event.type === 'change.ui.autocomplete' ?
                    `${event.type} — value: ${$.getValue(methodNode)}` :
                    event.type,
            });

            $.append('#event-log', entry);
            $.setScrollY('#event-log', $.height('#event-log', { boxSize: $.SCROLL_BOX }));
        },
    );

    $('[data-demo-method]').addEvent('click', (event) => {
        const method = $.getDataset(event.currentTarget, 'demoMethod');
        const current = $.getData(methodNode, 'autocomplete');

        switch (method) {
            case 'init':
                initMethodDemo();
                $.setText('#method-output', current ? 'Already initialized.' : 'Initialized with the original options.');
                break;
            case 'dispose':
                if (current) {
                    current.dispose();
                    $.setText('#method-output', 'Disposed. Original input attributes were restored.');
                } else {
                    $.setText('#method-output', 'Already disposed.');
                }
                break;
            case 'show':
                initMethodDemo().show();
                $.setText('#method-output', 'Showing results for the current value.');
                break;
            case 'hide':
                if (current) {
                    current.hide();
                    $.setText('#method-output', 'Hiding results and cancelling pending work.');
                } else {
                    $.setText('#method-output', 'Initialize the component before hiding it.');
                }
                break;
            case 'toggle':
                initMethodDemo().toggle();
                $.setText('#method-output', 'Toggling the result menu.');
                break;
            case 'update':
                if (current) {
                    current.update();
                    $.setText('#method-output', 'Updated the menu position and dimensions.');
                } else {
                    $.setText('#method-output', 'Initialize the component before updating it.');
                }
                break;
        }
    });

    $.addEvent('#clear-events', 'click', (_) => {
        $.empty('#event-log');
    });

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = $.getValue(event.currentTarget);

        if (theme === 'system') {
            localStorage.removeItem('frostui-autocomplete-demo-theme');
        } else {
            localStorage.setItem('frostui-autocomplete-demo-theme', theme);
        }

        setTheme(theme);
    });

    setTheme(document.documentElement.dataset.uiTheme || 'system');
});
