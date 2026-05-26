/**
 * Build the KGrid table DOM skeleton (self-contained; no external HTML file).
 *
 * Edit TABLE_SHELL_TEMPLATE below to change markup. Dynamic slots:
 *   {{EMPTY_ROW_MESSAGE}}  — text in .no-data-tbody
 *   {{PAGES_DATA_PAGESIZE}} — value for .pages data-pagesize
 *   {{PAGE_SIZE_OPTIONS}}  — <option> elements for .pagesize
 *   {{PAGING_FOOTER_LABEL}} — text after page-size select
 */
(function (CT) {
    CT.DEFAULT_EMPTY_ROW_MESSAGE = "No records match your search.";

    /**
     * Static table skeleton (one sortable header cell template; labels.js clones it per column).
     * @type {string}
     */
    CT.TABLE_SHELL_TEMPLATE = `
<table class="custom-table" style="table-layout: fixed;">
  <thead class="thead-labels">
    <tr>
      <th class="align-top">
        <a class="sort" data-sortfld="" style="cursor: pointer;">
          <span class="column-label"></span>
          <i class="fas fa-sort-up sort-up" style="display: none"></i>
          <i class="fas fa-sort-down sort-down" style="display: none"></i>
          <i class="fas fa-sort sort-default"></i>
        </a>
      </th>
    </tr>
  </thead>
  <thead class="thead-filters"></thead>
  <tbody class="before-main-tbody"></tbody>
  <tbody class="main-tbody"></tbody>
  <tbody class="after-main-tbody"></tbody>
  <tbody class="no-data-tbody">
    <tr><td>{{EMPTY_ROW_MESSAGE}}</td></tr>
  </tbody>
  <tfoot class="paging-footer">
    <tr>
      <td>
        <div class="btn-group pages" data-pagesize="{{PAGES_DATA_PAGESIZE}}">
          <button type="button" name="first" class="btn btn-sm btn-outline-secondary">&lt;&lt;</button>
          <button type="button" name="prev" class="btn btn-sm btn-outline-secondary">&lt;</button>
          <button type="button" name="page" class="btn btn-sm btn-outline-secondary">1</button>
          <button type="button" name="next" class="btn btn-sm btn-outline-secondary">&gt;</button>
          <button type="button" name="last" class="btn btn-sm btn-outline-secondary">&gt;&gt;</button>
        </div>
        <select class="pagesize">
{{PAGE_SIZE_OPTIONS}}
        </select>
        {{PAGING_FOOTER_LABEL}} <span class="totalrecscount"></span>
      </td>
    </tr>
  </tfoot>
</table>`.trim();

    CT._escapeTableShellText = function (text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    };

    CT._renderPageSizeOptions = function (pageSizes, defaultSize) {
        return pageSizes
            .map((size) => {
                const value = String(size);
                const selected = value === String(defaultSize) ? " selected" : "";
                return `          <option value="${value}"${selected}>${value}</option>`;
            })
            .join("\n");
    };

    /**
     * Fill template placeholders from table options.
     * @param {Object} options
     * @param {string} [template]
     * @returns {string}
     */
    CT.renderTableShellHtml = function (options, template) {
        const pageSizes = Array.isArray(options.pagingPageSizes)
            ? options.pagingPageSizes
            : [10, 25, 50, 75];
        const defaultSize =
            options.pagingDefaultSize != null ? options.pagingDefaultSize : pageSizes[0];
        const emptyMsg = CT._escapeTableShellText(
            options.emptyRowMessage || CT.DEFAULT_EMPTY_ROW_MESSAGE
        );
        const pagingLabel = CT._escapeTableShellText(
            options.pagingFooterLabel || "records per page. Total"
        );

        return (template || CT.TABLE_SHELL_TEMPLATE)
            .replace(/\{\{EMPTY_ROW_MESSAGE\}\}/g, emptyMsg)
            .replace(/\{\{PAGES_DATA_PAGESIZE\}\}/g, String(defaultSize))
            .replace(
                /\{\{PAGE_SIZE_OPTIONS\}\}/g,
                CT._renderPageSizeOptions(pageSizes, defaultSize)
            )
            .replace(/\{\{PAGING_FOOTER_LABEL\}\}/g, pagingLabel);
    };

    /**
     * Create the table element (not yet attached to document).
     * @param {Object} options merged table options
     * @returns {JQuery} table.custom-table
     */
    CT.createTableShell = function (options) {
        const html = CT.renderTableShellHtml(options);
        const nodes = $.parseHTML(html, document, true);
        const $table = $(nodes).filter("table").first();
        if (!$table.length) {
            throw new Error("KGrid TABLE_SHELL_TEMPLATE must contain a root <table> element");
        }

        if (options.tableAttrs && options.tableAttrs.constructor === Object) {
            Object.keys(options.tableAttrs).forEach((att) => {
                if (att !== "class") {
                    $table.attr(att, options.tableAttrs[att]);
                }
            });
            if (typeof options.tableAttrs.class === "string" && options.tableAttrs.class) {
                $table.addClass(options.tableAttrs.class);
            }
        }

        return $table;
    };

    /**
     * Ensure host contains a KGrid table; build one if missing.
     * @param {JQuery} $host
     * @param {Object} options
     * @returns {JQuery} table element
     */
    CT.mountTableShell = function ($host, options) {
        const $existing = $host.find("table.custom-table, table").first();
        if ($existing.length) {
            return $existing;
        }

        const $shell = CT.getTableInteractionHost($host);
        if (!$shell.hasClass("custom-table-shell")) {
            $shell.addClass("custom-table-shell");
        }

        const $table = CT.createTableShell(options);
        $shell.append($table);
        return $table;
    };
})(window.KGrid);
