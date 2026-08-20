# Accessible searchable select

`<accessible-select>` adds a searchable display to one native single-choice
`<select>`. It has no dependencies and needs no build step. Load it as an ES
module.

The source select stays the canonical value and native form field. Without
JavaScript, users get the normal select. With JavaScript, the component hides
that source select and builds an accessible `details`/`summary` disclosure,
search input, result status, validation error, and native listbox in its shadow
root.

## Use

Load `accessible-select.js`, then put exactly one supported select directly
inside the custom element. Give the select an explicit `<label>`, `aria-label`,
or `aria-labelledby` name.

```html
<label for="country">Select your country</label>
<accessible-select>
  <select id="country" name="country" required>
    <option value="" disabled>Choose a country</option>
    <option value="fr" selected>France</option>
    <option value="de">Germany</option>
  </select>
</accessible-select>
<script type="module" src="accessible-select.js"></script>
```

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
  Arrow keys, Home, End, and type-ahead keep the panel open for navigation.
- Closing clears the search and rebuilds the complete list around the committed
  source selection. Escape never reverses an already committed change.
- The source emits bubbling native `input` and `change` events after a user
  commits a result.
- Native form submission uses the source select. Native reset restores its
  initial selection and then refreshes the visible value.
- On invalid required submission, the panel opens, shows the browser's local
  `validationMessage`, announces it, and focuses the search input.

If code changes the source select without dispatching its normal events, call
`refresh()` on the custom element:

```js
document.querySelector("accessible-select").refresh();
```

## Localized text

Set these optional attributes on `<accessible-select>`. Result strings may use
`{count}`.

| Attribute | Default |
| --- | --- |
| `search-label` | `Search options` |
| `search-placeholder` | `Search in list` |
| `result-message` | `{count} result` |
| `results-message` | `{count} results` |
| `no-results-message` | `No results` |

The validation error always uses the browser-provided, localized
`select.validationMessage`.

## Styling

The component uses inherited fonts and CSS system colors. Its clean default
uses these optional custom properties: `--accessible-select-surface`,
`--accessible-select-text`, `--accessible-select-border`,
`--accessible-select-focus`, `--accessible-select-radius`,
`--accessible-select-panel-gap`, `--accessible-select-shadow`, and
`--accessible-select-hover`.

It exposes these shadow parts: `button`, `value`, `panel`, `search`,
`listbox`, `status`, and `error`.

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

## Demo and tests

Open `demo.html` for a form example. Open `test.html` in a modern browser for
the dependency-free browser tests. The test page reports each result and sets
its document title to passed or failed.
