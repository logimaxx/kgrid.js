import { vi } from "vitest";

/** Empty mount point; KGrid.init builds the table shell. */
export function mountTableHost() {
    document.body.innerHTML = '<div id="kgrid-host"></div>';
    return {
        $host: $("#kgrid-host"),
        host: document.getElementById("kgrid-host"),
    };
}

/** Host + generated table (for setup* unit tests without full init). */
export function mountTableShell(options = {}) {
    const mounted = mountTableHost();
    const $table = KGrid.mountTableShell(
        mounted.$host,
        { ...KGrid.protoOptions, ...options }
    );
    return { ...mounted, $table };
}

export function column(name, overrides = {}) {
    const base = {
        name,
        label: overrides.label ?? name,
        display: {
            template: `{{${name}}}`,
            events: [],
        },
        insert: { type: "text", events: [] },
        update: { type: "text", events: [] },
    };
    return { ...base, ...overrides };
}

export function tableOptions(overrides = {}) {
    const cols = overrides.columns ?? [
        column("id"),
        column("name", { label: "Name" }),
    ];
    return {
        data: [{ id: "1", name: "Alpha" }],
        columns: cols,
        ...overrides,
    };
}

/** @param {JQuery|Element} host */
export function initKGrid(host, opts) {
    return KGrid.init(host, opts);
}

export function mockKViews() {
    const instance = {
        setUrl: vi.fn(),
        loadFromRemote: vi.fn().mockResolvedValue(undefined),
        loadFromData: vi.fn(),
        newItem: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue(undefined),
    };
    globalThis.KViews = {
        createCollectionInstance: vi.fn().mockResolvedValue(instance),
    };
    return { instance };
}
