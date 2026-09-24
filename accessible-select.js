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
        "results-message", "no-results-message", "more-results-message", "clear-label"];
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
      this.render();
      this.bindElements();
      this.bindEvents();
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

    render() {
      this.root = this.attachShadow({ mode: "open" });
      this.root.innerHTML = `
        <style>
          :host { --accessible-select-surface: Canvas; --accessible-select-text: CanvasText; --accessible-select-muted: GrayText; --accessible-select-border: GrayText; --accessible-select-focus: Highlight; --accessible-select-radius: .625rem; --accessible-select-control-height: 2.75rem; --accessible-select-padding: .625rem .75rem; --accessible-select-panel-gap: .25rem; --accessible-select-shadow: 0 10px 15px -3px transparent; --accessible-select-shadow: 0 10px 15px -3px color-mix(in srgb, CanvasText 18%, transparent), 0 4px 6px -4px color-mix(in srgb, CanvasText 18%, transparent); --accessible-select-border: color-mix(in srgb, CanvasText 50%, Canvas); --accessible-select-hover: Canvas; --accessible-select-hover: color-mix(in srgb, CanvasText 5%, Canvas); --accessible-select-selected-surface: Highlight; --accessible-select-selected-text: HighlightText; --accessible-select-option-radius: .375rem; color: var(--accessible-select-text); display: block; font: inherit; position: relative; }
          details { position: relative; }
          summary, input { box-sizing: border-box; font: inherit; width: 100%; }
          summary { align-items: center; background: var(--accessible-select-surface); border: 1px solid var(--accessible-select-border); border-radius: var(--accessible-select-radius); color: var(--accessible-select-text); cursor: pointer; display: flex; gap: .75rem; justify-content: space-between; list-style: none; min-block-size: var(--accessible-select-control-height); padding: var(--accessible-select-padding); text-align: start; }
          summary::-webkit-details-marker { display: none; }
          summary:hover:not([aria-disabled="true"]) { background: var(--accessible-select-hover); }
          summary[aria-disabled="true"] { color: GrayText; cursor: not-allowed; }
          [part=value] { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          [part=value][data-placeholder] { color: var(--accessible-select-muted); }
          [part=indicator] { block-size: .45rem; border-block-end: 2px solid currentColor; border-inline-end: 2px solid currentColor; flex: 0 0 auto; inline-size: .45rem; transform: rotate(45deg) translate(-.1rem, -.1rem); }
          details[open] [part=indicator] { transform: rotate(225deg) translate(-.05rem, -.05rem); }
          [part=panel] { background: var(--accessible-select-surface); border: 1px solid var(--accessible-select-border); border-radius: var(--accessible-select-radius); box-shadow: var(--accessible-select-shadow); color: var(--accessible-select-text); display: flex; flex-direction: column; inset-block-start: calc(100% + var(--accessible-select-panel-gap)); inset-inline: 0; max-block-size: min(20rem, 60vh); overflow-x: hidden; overflow-y: auto; position: absolute; z-index: 1; }
          [part=search-wrap] { align-items: center; border-block-end: 1px solid var(--accessible-select-border); border-start-start-radius: calc(var(--accessible-select-radius) - 1px); border-start-end-radius: calc(var(--accessible-select-radius) - 1px); display: flex; }
          [part=search-wrap]:has([part=search]:focus-visible) { outline: 2px solid var(--accessible-select-focus); outline-offset: -2px; }
          [part=search] { background: var(--accessible-select-surface); border: 0; color: var(--accessible-select-text); min-block-size: var(--accessible-select-control-height); padding: var(--accessible-select-padding); }
          [part=search]::-webkit-search-cancel-button { display: none; }
          [part=clear] { background: none; border: 0; color: var(--accessible-select-muted); cursor: pointer; flex: 0 0 auto; font: inherit; line-height: 1; min-block-size: var(--accessible-select-control-height); min-inline-size: var(--accessible-select-control-height); }
          [part=clear]:hover { color: var(--accessible-select-text); }
          [part=panel] > * { flex: none; }
          [part=panel] > [part=listbox] { flex: 0 1 auto; min-block-size: 0; }
          [part=listbox] { background: var(--accessible-select-surface); color: var(--accessible-select-text); overflow-y: auto; padding: .25rem; position: relative; }
          [part~=option] { border-radius: var(--accessible-select-option-radius); cursor: pointer; overflow: hidden; padding-block: .5rem; padding-inline: .75rem; text-overflow: ellipsis; user-select: none; white-space: nowrap; }
          [part~=option]:hover, [part~=option][part~=active] { background: var(--accessible-select-hover); }
          [part~=option][part~=selected] { background: var(--accessible-select-selected-surface); color: var(--accessible-select-selected-text); }
          [part~=option][aria-disabled=true] { background: none; color: var(--accessible-select-muted); cursor: not-allowed; }
          [part=listbox]:focus-visible [part~=active] { outline: 2px solid var(--accessible-select-focus); outline-offset: -2px; }
          [part=status], [part=name], [part=search-label], [part=clear] > span:first-child { block-size: 1px; clip-path: inset(50%); inline-size: 1px; overflow: hidden; position: absolute; white-space: nowrap; }
          [part=hint], [part=empty] { color: var(--accessible-select-muted); margin: 0; padding: .5rem .875rem; border-block-start: 1px solid var(--accessible-select-border); }
          [part=error] { border-block-start: 1px solid var(--accessible-select-border); margin: 0; padding: .625rem .875rem; }
          [part=panel][data-placement=above] { inset-block-start: auto; inset-block-end: calc(100% + var(--accessible-select-panel-gap)); }
          summary:focus-visible { outline: 2px solid var(--accessible-select-focus); outline-offset: 2px; }
          [part=search]:focus-visible { outline: none; }
          [part=listbox]:focus-visible { outline: 2px solid var(--accessible-select-focus); outline-offset: -2px; }
          @media (prefers-reduced-motion: no-preference) { summary, [part=panel] { transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease; } }
          @media (pointer: coarse) { [part~=option] { padding-block: .75rem; } }
          @media (forced-colors: active) { [part=panel] { box-shadow: none; } [part~=option][part~=selected] { background: Highlight; color: HighlightText; forced-color-adjust: none; } }
          [hidden] { display: none !important; }
        </style>
        <details><summary part="button" role="button" aria-expanded="false" aria-haspopup="listbox"><span part="name"></span><span part="value"></span><span part="indicator" aria-hidden="true"></span></summary>
        <div part="panel" hidden>
          <div part="search-wrap">
            <label part="search-label"></label>
            <input part="search" type="search" autocomplete="off">
            <button part="clear" type="button" hidden><span></span><span aria-hidden="true">\u00d7</span></button>
          </div>
          <output part="status" role="status" aria-live="polite" aria-atomic="true"></output>
          <div part="listbox" role="listbox" tabindex="0"></div>
          <p part="hint" hidden></p>
          <p part="empty" hidden></p>
          <p part="error" role="alert" aria-atomic="true" hidden></p>
        </div></details>`;
    }

    bindElements() {
      this.disclosure = this.root.querySelector("details");
      this.button = this.root.querySelector("summary");
      this.value = this.root.querySelector("[part=value]");
      this.panel = this.root.querySelector("[part=panel]");
      this.search = this.root.querySelector("[part=search]");
      this.searchLabel = this.root.querySelector("[part=search-label]");
      this.clear = this.root.querySelector("[part=clear]");
      this.clearText = this.clear.firstElementChild;
      this.hint = this.root.querySelector("[part=hint]");
      this.empty = this.root.querySelector("[part=empty]");
      this.nameLabel = this.root.querySelector("[part=name]");
      this.status = this.root.querySelector("[part=status]");
      this.list = this.root.querySelector("[part=listbox]");
      this.error = this.root.querySelector("[part=error]");
      this.list.id = `accessible-select-list-${++listId}`;
      this.error.id = `${this.list.id}-error`;
      this.nameLabel.id = `${this.list.id}-name`;
      this.value.id = `${this.list.id}-value`;
      this.search.id = `${this.list.id}-search`;
      this.searchLabel.htmlFor = this.search.id;
      this.button.setAttribute("aria-labelledby", `${this.nameLabel.id} ${this.value.id}`);
      this.search.setAttribute("aria-controls", this.list.id);
    }

    bindEvents() {
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
        } else if (event.key === "ArrowDown" && this.items.length) {
          event.preventDefault();
          this.highlight();
          this.list.focus();
        } else if (event.key === "Enter") {
          event.preventDefault();
          this.commit();
        }
      });
      this.clear.addEventListener("click", () => {
        this.search.value = "";
        this.draw();
        this.search.focus();
      });
      // Keep focus where it is during a press, so focusout cannot close the
      // panel before the click lands; WebKit would not focus the list anyway.
      this.list.addEventListener("mousedown", event => event.preventDefault());
      this.list.addEventListener("click", event => {
        const item = event.target.closest("[role=option]");
        if (!item) return;
        this.setActive(this.items.indexOf(item), false);
        if (this.pick()) this.close(true);
      });
      this.list.addEventListener("keydown", event => this.listKeydown(event));
      this.list.addEventListener("focus", () => this.highlight());
      this.root.addEventListener("focusout", () => queueMicrotask(() => {
        if (!this.matches(":focus-within")) this.close();
      }));
    }

    listKeydown(event) {
      if (event.isComposing || event.key === "Process") return;
      const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      if (step) {
        event.preventDefault();
        this.setActive(this.nextSelectable(this.active, step));
        return;
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const from = event.key === "Home" ? -1 : this.items.length;
        this.setActive(this.nextSelectable(from, event.key === "Home" ? 1 : -1));
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        this.close(true);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (this.pick()) this.close(true);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        this.search.value = this.search.value.slice(0, -1);
        this.draw();
        this.search.focus();
        return;
      }
      if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        this.search.value += event.key;
        this.draw();
        this.search.focus();
      }
    }

    disconnectedCallback() {
      this.form?.removeEventListener("reset", this.reset);
      this.labels?.forEach(label => label.removeEventListener("click", this.labelClick));
      this.select?.ownerDocument.removeEventListener("pointerdown", this.dismiss);
      this.form = null;
    }

    attributeChangedCallback() {
      if (!this.ready) return;
      this.setSearchText();
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

    setSearchText() {
      const label = this.message("search-label", "Search options");
      this.searchLabel.textContent = label;
      this.search.placeholder = this.message("search-placeholder", label);
      this.clearText.textContent = this.message("clear-label", "Clear search");
    }

    setStatus(text, now = false) {
      clearTimeout(this.statusTimer);
      if (text === this.status.textContent) return;
      if (now) this.status.textContent = text;
      else this.statusTimer = setTimeout(() => this.status.textContent = text, 300);
    }

    place() {
      const rect = this.disclosure.getBoundingClientRect();
      const height = this.panel.offsetHeight;
      const below = window.innerHeight - rect.bottom;
      if (below < height && rect.top > below) this.panel.dataset.placement = "above";
      else delete this.panel.dataset.placement;
    }

    setInvalid(invalid) {
      const id = this.error.id;
      for (const item of [this.button, this.search, this.list]) {
        invalid ? item.setAttribute("aria-describedby", id) : item.removeAttribute("aria-describedby");
      }
      for (const item of [this.button, this.list]) {
        invalid ? item.setAttribute("aria-invalid", "true") : item.removeAttribute("aria-invalid");
      }
      this.error.hidden = !invalid;
    }

    refresh() {
      if (!this.ready) return;
      const option = this.select.options[this.select.selectedIndex];
      const value = option ? optionText(option) : "";
      this.button.tabIndex = this.select.disabled ? -1 : 0;
      this.button.setAttribute("aria-disabled", String(this.select.disabled));
      this.nameLabel.textContent = this.name;
      this.list.setAttribute("aria-label", this.name);
      this.list.setAttribute("aria-required", String(this.select.required));
      this.value.textContent = value;
      this.value.toggleAttribute("data-placeholder", Boolean(option?.disabled && !option.value));
      this.setSearchText();
      if (this.select.disabled) this.close();
      this.draw();
      if (this.select.validity.valid) this.setInvalid(false);
    }

    open(focus = true) {
      if (this.select.disabled) return;
      this.disclosure.open = true;
      this.panel.hidden = false;
      this.button.setAttribute("aria-expanded", "true");
      this.draw();
      this.setStatus(this.statusText, true);
      this.place();
      if (focus) this.search.focus();
    }

    close(focus = false) {
      if (!this.ready) return;
      clearTimeout(this.statusTimer);
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
      const limited = !query && shown.length > 10;
      const selected = shown.find(([, index]) => index === this.select.selectedIndex);
      const visible = limited ? shown.slice(0, 10) : shown;
      if (limited && selected && !visible.includes(selected)) visible[visible.length - 1] = selected;
      this.items = visible.map(([option, index], position) => {
        const item = document.createElement("div");
        const selected = index === this.select.selectedIndex;
        item.id = `${this.list.id}-option-${position}`;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(selected));
        item.part.add("option");
        if (selected) item.part.add("selected");
        if (option.disabled) item.setAttribute("aria-disabled", "true");
        item.dataset.index = index;
        item.textContent = item.title = optionText(option);
        return item;
      });
      this.list.replaceChildren(...this.items);
      this.active = -1;
      let active = this.items.findIndex(item => item.part.contains("selected"));
      if (query) {
        const best = this.bestMatch(this.items.filter(item => !item.hasAttribute("aria-disabled")), query);
        if (best) active = this.items.indexOf(best);
      }
      this.setActive(active, !this.panel.hidden);
      this.drawMessages(shown.length, visible.length, limited);
      if (this.disclosure.open) this.place();
    }

    drawMessages(count, shownCount, limited) {
      this.list.hidden = count === 0;
      this.empty.hidden = count > 0;
      this.empty.textContent = this.message("no-results-message", "No results");
      this.hint.hidden = !limited;
      this.hint.textContent = this.message("more-results-message",
        "Showing {shown} of {count}. Search to see them all")
        .replaceAll("{shown}", shownCount).replaceAll("{count}", count);
      this.clear.hidden = !this.search.value;
      this.statusText = count === 0
        ? this.message("no-results-message", "No results")
        : this.message(count === 1 ? "result-message" : "results-message",
          count === 1 ? "{count} result" : "{count} results").replaceAll("{count}", count);
      this.setStatus(this.statusText);
    }

    pick() {
      const item = this.items[this.active];
      const index = item ? Number(item.dataset.index) : -1;
      const option = this.select.options[index];
      if (!option || option.disabled) return false;
      if (index === this.select.selectedIndex) return true;
      this.select.selectedIndex = index;
      this.select.dispatchEvent(new Event("input", { bubbles: true }));
      this.select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    setActive(position, reveal = true) {
      this.items[this.active]?.part.remove("active");
      this.active = position;
      const item = this.items[position];
      if (!item) {
        this.list.removeAttribute("aria-activedescendant");
        return;
      }
      item.part.add("active");
      this.list.setAttribute("aria-activedescendant", item.id);
      if (!reveal) return;
      // Scroll the list, never the page: scrollIntoView would move both.
      const top = item.offsetTop;
      const bottom = top + item.offsetHeight;
      if (top < this.list.scrollTop) this.list.scrollTop = top;
      else if (bottom > this.list.scrollTop + this.list.clientHeight) this.list.scrollTop = bottom - this.list.clientHeight;
    }

    nextSelectable(from, step) {
      for (let position = from + step; position >= 0 && position < this.items.length; position += step) {
        if (!this.items[position].hasAttribute("aria-disabled")) return position;
      }
      return this.active;
    }

    highlight() {
      // Keyboard users need a highlighted option for Enter to pick.
      const current = this.items[this.active];
      if (current && !current.hasAttribute("aria-disabled")) return;
      this.setActive(this.nextSelectable(-1, 1));
    }

    commit() {
      const current = this.items[this.active];
      const selectable = this.items.filter(item => !item.hasAttribute("aria-disabled"));
      const target = current && !current.hasAttribute("aria-disabled") ? current
        : selectable.length === 1 ? selectable[0] : null;
      if (!target) return;
      this.setActive(this.items.indexOf(target), false);
      if (this.pick()) this.close(true);
    }

    bestMatch(items, query) {
      // After typing, highlight an exact label, then a label starting with the search.
      const texts = items.map(item => searchText(item.textContent));
      return items[texts.indexOf(query)]
        ?? items[texts.findIndex(text => text.startsWith(query))]
        ?? items[0] ?? null;
    }

    showInvalid(event) {
      event.preventDefault();
      this.error.textContent = this.select.validationMessage;
      this.setInvalid(true);
      this.open();
    }
  }

if (!customElements.get("accessible-select")) {
  customElements.define("accessible-select", AccessibleSelect);
}
