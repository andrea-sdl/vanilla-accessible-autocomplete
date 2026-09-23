# Accessible searchable select

`<accessible-select>` adds a searchable display to one native single-choice
`<select>`. It has no dependencies and needs no build step. Load it as an ES
module.

The source select stays the canonical value and native form field. Without
JavaScript, users get the normal select. With JavaScript, the component hides
that source select and builds an accessible `details`/`summary` disclosure,
search input, result status, validation error, and native listbox in its shadow
root.

[Live demo](https://andrea-sdl.github.io/vanilla-accessible-autocomplete/) · [Source code](https://github.com/andrea-sdl/vanilla-accessible-autocomplete)

## Integrate

Add this module tag to load the `v0.2.4` release from GitHub through jsDelivr:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/andrea-sdl/vanilla-accessible-autocomplete@v0.2.4/accessible-select.js"></script>
```

For a newer release, replace `v0.2.4` with its Git tag. Use `main` only to
test unreleased changes.

Then put exactly one supported select directly inside the custom element. Give
the select an explicit `<label>`, `aria-label`, or `aria-labelledby` name.

```html
<label for="country">Select your country (required)</label>
<accessible-select>
  <select id="country" name="country" required>
    <option value="" disabled>Choose a country</option>
    <option value="fr" selected>France</option>
    <option value="de">Germany</option>
  </select>
</accessible-select>
```

To serve the checked-out file yourself, use
`<script type="module" src="accessible-select.js"></script>` instead.

The component preserves the selection the browser made while it parsed the
source HTML. If no option has `selected`, it keeps the browser's normal
first-option choice.

## Supported source markup

The child select must be static, direct, single-choice markup with direct
`<option>` children. The component leaves the source select unchanged when it
has no explicit name, uses `multiple`, has `size` greater than one, has no
options, has an `<optgroup>`, or has another element beside the source select.

Disabled options stay visible in results and cannot be selected. Options with
the same value keep their own source index, so the visible label and the native
selection stay in sync.

## Behavior

- Search matches option labels by case-insensitive, accent-insensitive
  substring. Searching never changes the form value.
- A result does not select on blur, even when it is the only exact match.
- Clicking the source label opens the disclosure and focuses search. A pointer
  click outside closes it, including on non-focusable page content.
- A pointer click on a selectable result commits it and closes the panel.
- Arrow keys, Home, and End only browse the result list. They never change the
  form value. Enter commits the highlighted option, closes the panel, and
  returns focus to the summary button, from either the search field or the
  result list.
- With an empty search, the current value is highlighted. Enter in the search
  field commits it, or the only selectable result when there is exactly one.
- After typing, the best selectable match is highlighted instead: a label
  equal to the search, then the first label starting with it, then the first
  result. Moving through the list with the arrow keys changes the highlight,
  and Enter picks that option. Escape and moving focus away close the panel
  without committing.
- Typing while the result list has focus returns focus to search and filters
  the list. Backspace from the result list removes the last search character
  and returns focus to search.
- The search field has a clear button that appears once the field has text. It
  clears the search and returns focus to the field. Set `clear-label` to
  translate its name.
- When a search matches nothing, the result list is hidden and the panel shows
  the `no-results-message` paragraph instead.
- When an empty search has more than 10 results, the list shows 10 options,
  always including the selected option, and a hint paragraph below the list.
  Search filters all options. Set `more-results-message` to translate that
  hint; it may use `{shown}` and `{count}`.
- The panel opens below the button, and flips above it when the viewport has
  no room below and more room above.
- Each result carries its full label as a `title`, so a truncated label still
  shows its complete text on hover.
- Closing clears the search and rebuilds the complete list around the committed
  source selection. Escape never reverses an already committed change.
- The source emits bubbling native `input` and `change` events after a user
  commits a result.
- Native form submission uses the source select. Native reset restores its
  initial selection and then refreshes the visible value.
- On invalid required submission, the panel opens, shows the browser's local
  `validationMessage`, announces it, and focuses the search input.

For required fields, include the required state in the visible source label.

If code changes the source select without dispatching its normal events, call
`refresh()` on the custom element:

```js
document.querySelector("accessible-select").refresh();
```

## Localized text

Set these optional attributes on `<accessible-select>`. Result strings may use
`{count}`. The more-results text may also use `{shown}`.

| Attribute | Default |
| --- | --- |
| `search-label` | `Search options` |
| `search-placeholder` | `Search options` |
| `result-message` | `{count} result` |
| `results-message` | `{count} results` |
| `no-results-message` | `No results` |
| `more-results-message` | `Showing {shown} of {count}. Search to see them all` |
| `clear-label` | `Clear search` |

The validation error always uses the browser-provided, localized
`select.validationMessage`.

## Styling

The component uses inherited fonts and CSS system colors. Its clean default
uses these optional custom properties: `--accessible-select-surface`,
`--accessible-select-text`, `--accessible-select-muted`,
`--accessible-select-border`, `--accessible-select-focus`,
`--accessible-select-radius`, `--accessible-select-control-height`,
`--accessible-select-padding`, `--accessible-select-panel-gap`,
`--accessible-select-shadow`, and `--accessible-select-hover`.

It exposes these shadow parts: `button`, `name`, `value`, `indicator`, `panel`,
`search-wrap`, `search-label`, `search`, `clear`, `listbox`, `status`, `hint`,
`empty`, and `error`.

Safari ignores `padding` on `<option>` elements, so touch targets in the result
list follow its own option metrics there.

For example, a site can replace the default border and selected-list look with
`::part()` rules:

```css
accessible-select::part(button) { border: 3px solid black; }
accessible-select::part(panel) { border: 3px solid black; }
accessible-select::part(listbox) { font-size: 1.5rem; }

accessible-select {
  --accessible-select-radius: 0;
  --accessible-select-border: black;
  --accessible-select-panel-gap: 0;
}
```

## Browser support

The component targets modern evergreen browsers. `color-mix()` is only used in
the `:host` custom-property defaults, and every one of those declarations is
preceded by a plain fallback declaration, so a browser without `color-mix()`
keeps the earlier system-color value. All custom properties are declared on
`:host`, so a page can override any of them without the component losing a
default. Safari ignores `option` padding.

## Screen reader checklist

Automated accessibility coverage (axe, Playwright) is a possible follow-up, but
it would add a dev dependency, which this project does not have. Until then,
check manually with VoiceOver + Safari, NVDA + Firefox, and TalkBack + Chrome:

- The button announces the field name, the current value, its expanded state,
  and its listbox popup, each once.
- The search field announces its own label, not the surrounding text.
- The result count is announced once, after typing pauses.
- Arrow keys read options without changing the announced button value.
- Enter commits the current option and returns focus to the button.
- A validation error is announced and is linked to the button, search field,
  and result list.

## Demo and tests

Open [the live demo](https://andrea-sdl.github.io/vanilla-accessible-autocomplete/)
for a form example and a short integration guide. For GitHub Pages, set `main`
and `/docs` as the publishing source. Open `test.html` in a modern browser for
the dependency-free browser tests. The test page reports each result and sets
its document title to passed or failed.
