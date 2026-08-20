/* A small searchable view over one native, single-choice select. */
let listId = 0;

  const optionText = option => option.label || option.text;
  const searchText = text => text.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase();

  function labelText(label, select) {
    return [...label.childNodes]
      .filter(node => node !== select)
      .map(node => node.textContent || "")
      .join(" ").replace(/\s+/g, " ").trim();
  }

  function selectName(select) {
    const ids = select.getAttribute("aria-labelledby");
    if (ids) {
      const name = ids.split(/\s+/).map(id => select.ownerDocument
        .getElementById(id)?.textContent?.trim()).filter(Boolean).join(" ");
      if (name) return name;
    }

    const ariaLabel = select.getAttribute("aria-label")?.trim();
    if (ariaLabel) return ariaLabel;

    return [...select.labels || []].map(label => labelText(label, select))
      .filter(Boolean).join(" ");
  }

export class AccessibleSelect extends HTMLElement {
    static get observedAttributes() {
      return ["search-label", "search-placeholder", "result-message",
        "results-message", "no-results-message"];
    }

    connectedCallback() {
      if (this.ready) {
        this.bindForm();
        this.bindLabels();
        this.select.ownerDocument.addEventListener("pointerdown", this.dismiss);
        return;
      }

      const select = this.firstElementChild;
      const supported = this.children.length === 1
        && select instanceof HTMLSelectElement
        && !select.multiple
        && select.size <= 1
        && select.options.length
        && [...select.children].every(child => child instanceof HTMLOptionElement);
      const name = supported && selectName(select);
      if (!name) return;

      this.ready = true;
      this.select = select;
      this.name = name;
      this.labels = [...select.labels || []];
      this.select.hidden = true;
      this.root = this.attachShadow({ mode: "open" });
      this.root.innerHTML = `
        <style>
          :host { --accessible-select-surface: Canvas; --accessible-select-text: CanvasText; --accessible-select-border: GrayText; --accessible-select-focus: Highlight; --accessible-select-radius: .75rem; --accessible-select-panel-gap: .375rem; --accessible-select-shadow: 0 12px 24px transparent; --accessible-select-shadow: 0 12px 24px color-mix(in srgb, CanvasText 18%, transparent); --accessible-select-border: color-mix(in srgb, CanvasText 22%, Canvas); --accessible-select-hover: Canvas; --accessible-select-hover: color-mix(in srgb, CanvasText 6%, Canvas); color: var(--accessible-select-text); display: block; font: inherit; position: relative; }
          details { position: relative; }
          summary, input, select { box-sizing: border-box; font: inherit; width: 100%; }
          summary { align-items: center; background: var(--accessible-select-surface); border: 1px solid var(--accessible-select-border); border-radius: var(--accessible-select-radius); color: var(--accessible-select-text); cursor: pointer; display: flex; gap: .75rem; justify-content: space-between; list-style: none; min-block-size: 3rem; padding: .625rem .875rem; text-align: start; }
          summary::-webkit-details-marker { display: none; }
          summary:hover { background: var(--accessible-select-hover); }
          summary[aria-disabled="true"] { color: GrayText; cursor: not-allowed; }
          [part=value] { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          [part=panel] { background: var(--accessible-select-surface); border: 1px solid var(--accessible-select-border); border-radius: var(--accessible-select-radius); box-shadow: var(--accessible-select-shadow); color: var(--accessible-select-text); inset-block-start: calc(100% + var(--accessible-select-panel-gap)); inset-inline: 0; overflow: hidden; position: absolute; z-index: 1; }
          [part=search] { background: var(--accessible-select-surface); border: 0; border-block-end: 1px solid var(--accessible-select-border); color: var(--accessible-select-text); min-block-size: 3rem; padding: .625rem .875rem; }
          [part=listbox] { background: var(--accessible-select-surface); border: 0; color: var(--accessible-select-text); display: block; padding-block: .25rem; }
          option:checked { background: Highlight; color: HighlightText; }
          [part=status] { block-size: 1px; clip-path: inset(50%); inline-size: 1px; overflow: hidden; position: absolute; white-space: nowrap; }
          [part=error] { border-block-start: 1px solid var(--accessible-select-border); margin: 0; padding: .625rem .875rem; }
          :focus-visible { outline: 3px solid var(--accessible-select-focus); outline-offset: 3px; }
          @media (prefers-reduced-motion: no-preference) { summary, [part=panel] { transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease; } }
          @media (forced-colors: active) { [part=panel] { box-shadow: none; } }
          [hidden] { display: none !important; }
        </style>
        <details><summary part="button" role="button" aria-expanded="false" aria-haspopup="listbox"><span part="value"></span><span aria-hidden="true">⌄</span></summary>
        <div part="panel" hidden>
          <input part="search" type="search" autocomplete="off">
          <output part="status" role="status" aria-live="polite" aria-atomic="true"></output>
          <select part="listbox" size="2"></select>
          <p part="error" role="alert" aria-atomic="true" hidden></p>
        </div></details>`;

      this.disclosure = this.root.querySelector("details");
      this.button = this.root.querySelector("summary");
      this.value = this.root.querySelector("[part=value]");
      this.panel = this.root.querySelector("[part=panel]");
      this.search = this.root.querySelector("[part=search]");
      this.status = this.root.querySelector("[part=status]");
      this.list = this.root.querySelector("[part=listbox]");
      this.error = this.root.querySelector("[part=error]");
      this.list.id = `accessible-select-list-${++listId}`;
      this.search.setAttribute("aria-controls", this.list.id);

      this.select.addEventListener("input", () => this.refresh());
      this.select.addEventListener("change", () => this.refresh());
      this.select.addEventListener("invalid", event => this.showInvalid(event));
      this.button.addEventListener("click", event => {
        event.preventDefault();
        this.disclosure.open ? this.close() : this.open();
      });
      this.button.addEventListener("keydown", event => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          this.disclosure.open ? this.close() : this.open();
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          this.open();
        }
      });
      this.search.addEventListener("input", () => this.draw());
      this.search.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          event.preventDefault();
          this.close(true);
        } else if (event.key === "ArrowDown" && this.list.options.length) {
          event.preventDefault();
          this.list.focus();
        }
      });
      this.list.addEventListener("input", () => this.choose());
      this.list.addEventListener("change", () => this.choose());
      this.list.addEventListener("pointerdown", () => this.listClicked = true);
      this.root.addEventListener("mousedown", event => {
        this.listClicked = event.composedPath().includes(this.list);
      }, true);
      this.list.addEventListener("click", () => {
        if (this.listClicked && this.pick()) this.close(true);
        this.listClicked = false;
      });
      this.list.addEventListener("keydown", event => {
        this.listClicked = false;
        if (event.key === "Escape") {
          event.preventDefault();
          this.close(true);
          return;
        }
        if (/^(ArrowDown|ArrowUp|Home|End)$/.test(event.key) || event.key.length === 1) {
          setTimeout(() => this.pick());
        }
      });
      this.root.addEventListener("focusout", () => queueMicrotask(() => {
        if (!this.matches(":focus-within")) this.close();
      }));

      this.reset = () => setTimeout(() => this.refresh());
      this.labelClick = event => {
        event.preventDefault();
        this.open();
      };
      this.dismiss = event => {
        if (!this.contains(event.target)) this.close();
      };
      this.bindForm();
      this.bindLabels();
      this.select.ownerDocument.addEventListener("pointerdown", this.dismiss);
      this.refresh();
    }

    disconnectedCallback() {
      this.form?.removeEventListener("reset", this.reset);
      this.labels?.forEach(label => label.removeEventListener("click", this.labelClick));
      this.select?.ownerDocument.removeEventListener("pointerdown", this.dismiss);
      this.form = null;
    }

    attributeChangedCallback() {
      if (!this.ready) return;
      this.search.setAttribute("aria-label", this.message("search-label", "Search options"));
      this.search.placeholder = this.message("search-placeholder", "Search in list");
      this.draw();
    }

    bindForm() {
      const form = this.select.form;
      if (form === this.form) return;
      this.form?.removeEventListener("reset", this.reset);
      this.form = form;
      this.form?.addEventListener("reset", this.reset);
    }

    bindLabels() {
      this.labels?.forEach(label => label.removeEventListener("click", this.labelClick));
      this.labels = [...this.select.labels || []];
      this.labels.forEach(label => label.addEventListener("click", this.labelClick));
    }

    message(name, fallback) {
      return this.getAttribute(name) ?? fallback;
    }

    refresh() {
      if (!this.ready) return;
      const option = this.select.options[this.select.selectedIndex];
      const value = option ? optionText(option) : "";
      this.button.tabIndex = this.select.disabled ? -1 : 0;
      this.button.setAttribute("aria-disabled", String(this.select.disabled));
      this.button.setAttribute("aria-label", `${this.name}: ${value}`);
      this.value.textContent = value;
      this.search.setAttribute("aria-label", this.message("search-label", "Search options"));
      this.search.placeholder = this.message("search-placeholder", "Search in list");
      if (this.select.disabled) this.close();
      this.draw();
      if (this.select.validity.valid) this.error.hidden = true;
    }

    open(focus = true) {
      if (this.select.disabled) return;
      this.disclosure.open = true;
      this.panel.hidden = false;
      this.button.setAttribute("aria-expanded", "true");
      this.draw();
      if (focus) this.search.focus();
    }

    close(focus = false) {
      if (!this.ready) return;
      this.search.value = "";
      this.draw();
      this.disclosure.open = false;
      this.panel.hidden = true;
      this.button.setAttribute("aria-expanded", "false");
      if (focus && !this.select.disabled) this.button.focus();
    }

    draw() {
      const query = searchText(this.search.value);
      const shown = [...this.select.options].flatMap((option, index) =>
        !query || searchText(optionText(option)).includes(query) ? [[option, index]] : []);
      const fragment = document.createDocumentFragment();

      for (const [option, index] of shown) {
        const item = document.createElement("option");
        item.value = index;
        item.disabled = option.disabled;
        item.textContent = optionText(option);
        fragment.append(item);
      }
      this.list.replaceChildren(fragment);
      this.list.size = Math.max(2, Math.min(6, shown.length));
      this.list.selectedIndex = shown.findIndex(([, index]) => index === this.select.selectedIndex);
      const count = shown.length;
      this.status.textContent = count === 0
        ? this.message("no-results-message", "No results")
        : this.message(count === 1 ? "result-message" : "results-message",
          count === 1 ? "{count} result" : "{count} results").replaceAll("{count}", count);
    }

    pick() {
      const item = this.list.options[this.list.selectedIndex];
      const index = item && Number(item.value);
      const option = this.select.options[index];
      if (!option || option.disabled || index === this.select.selectedIndex) {
        this.draw();
        return Boolean(option && !option.disabled);
      }
      this.select.selectedIndex = index;
      this.select.dispatchEvent(new Event("input", { bubbles: true }));
      this.select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    choose() {
      const close = this.listClicked;
      this.listClicked = false;
      if (this.pick() && close) this.close(true);
    }

    showInvalid(event) {
      event.preventDefault();
      this.error.textContent = this.select.validationMessage;
      this.error.hidden = false;
      this.open();
    }
  }

if (!customElements.get("accessible-select")) {
  customElements.define("accessible-select", AccessibleSelect);
}
