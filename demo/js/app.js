/* global KGrid, KViews, $ */
(function () {
    const apiUrl = new URL("/api/products", window.location.origin).href;

    KGrid.configure({
        log: function () {
            if (window.KGRID_DEMO_DEBUG) {
                console.log.apply(console, ["[KGrid]"].concat([].slice.call(arguments)));
            }
        },
        onError: function (err) {
            console.error("[KGrid demo]", err);
            setStatus("Error: " + (err && err.message ? err.message : String(err)), true);
        },
        confirm: function (message, onConfirm, onCancel) {
            if (window.confirm(message)) {
                onConfirm();
            } else if (onCancel) {
                onCancel();
            }
        },
        customInputTypes: {
            demo_select: KGrid.demoSelect(),
        },
    });

    const tableOptions = {
        url: apiUrl,
        updateUrl: apiUrl,
        deleteUrl: apiUrl,
        insertUrl: apiUrl,
        type: "products",
        defaultInteraction: "view",
        features: {
            filtering: true,
            sorting: true,
            paging: true,
            create: true,
            update: true,
            delete: true,
        },
        noDataTemplate:
            "<td colspan='99'>No products match your filters.</td>",
        columns: [
            {
                name: "id",
                label: "ID",
                hidden: true,
                features: { sort: true },
                display: { template: "{{id}}", events: [] },
                insert: { type: "hidden", events: [] },
                update: { type: "hidden", events: [] },
            },
            {
                name: "sku",
                label: "SKU",
                features: { sort: true, filter: true, create: true, update: true },
                display: { template: "<code>{{sku}}</code>", events: [] },
                filter: { type: "text", operator: "~=~" },
                insert: { type: "text", required: true, events: [] },
                update: { type: "text", events: [] },
            },
            {
                name: "name",
                label: "Name",
                features: { sort: true, filter: true, create: true, update: true },
                display: { template: "{{name}}", events: [] },
                filter: { type: "text", operator: "~=~" },
                insert: { type: "text", required: true, events: [] },
                update: { type: "text", events: [] },
            },
            {
                name: "category",
                label: "Category",
                features: { sort: true, filter: true, create: true, update: true },
                display: { template: "{{category}}", events: [] },
                filter: {
                    type: "demo_select",
                    operator: "=",
                    options: [
                        { label: "All", value: "" },
                        { label: "Hardware", value: "hardware" },
                        { label: "Software", value: "software" },
                        { label: "Accessories", value: "accessories" },
                    ],
                },
                insert: {
                    type: "demo_select",
                    options: [
                        { label: "Hardware", value: "hardware" },
                        { label: "Software", value: "software" },
                        { label: "Accessories", value: "accessories" },
                    ],
                    events: [],
                },
                update: {
                    type: "demo_select",
                    options: [
                        { label: "Hardware", value: "hardware" },
                        { label: "Software", value: "software" },
                        { label: "Accessories", value: "accessories" },
                    ],
                    events: [],
                },
            },
            {
                name: "price",
                label: "Price",
                features: { sort: true, create: true, update: true },
                display: { template: "{{price}}", events: [] },
                filter: { type: "number", operator: "=" },
                insert: { type: "number", events: [] },
                update: { type: "number", events: [] },
            },
            {
                name: "active",
                label: "Active",
                features: { filter: true, create: true, update: true },
                display: { template: "{{active}}", events: [] },
                filter: {
                    type: "select",
                    operator: "=",
                    options: [
                        { label: "Any", value: "" },
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                    ],
                },
                insert: {
                    type: "select",
                    options: [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                    ],
                    events: [],
                },
                update: {
                    type: "select",
                    options: [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                    ],
                    events: [],
                },
            },
        ],
    };

    let grid;

    function setStatus(text, isError) {
        const el = document.getElementById("demo-status");
        if (!el) return;
        el.textContent = text;
        el.classList.toggle("text-danger", !!isError);
        el.classList.toggle("text-success", !isError);
    }

    async function initTable() {
        if (typeof KViews === "undefined") {
            throw new Error("KViews is not loaded");
        }
        if (typeof KGrid === "undefined") {
            throw new Error("KGrid is not loaded");
        }

        const host = document.getElementById("kgrid-host");
        setStatus("Loading products from JSON:API…");

        grid = await KGrid.init(host, tableOptions);

        const count = grid.instance.items.length;
        setStatus(
            "Loaded " +
                count +
                " product(s) from " +
                apiUrl +
                " (in-memory API; restart server to reset seed data)",
            false
        );

        document.getElementById("btn-reload").addEventListener("click", function () {
            grid.instance.loadFromRemote().then(function () {
                setStatus("Reloaded " + grid.instance.items.length + " product(s).", false);
            }).catch(KGrid.onError);
        });

        function refreshModeStatus() {
            const mode = grid.getInteraction();
            document.getElementById("btn-toggle-edit").textContent =
                mode === "edit" ? "Switch to view mode" : "Switch to edit mode";
        }

        document.getElementById("btn-toggle-edit").addEventListener("click", function () {
            grid.toggleEditMode();
            refreshModeStatus();
        });

        refreshModeStatus();
        window.kgridDemo = grid;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            initTable().catch(function (err) {
                KGrid.onError(err);
            });
        });
    } else {
        initTable().catch(function (err) {
            KGrid.onError(err);
        });
    }
})();
