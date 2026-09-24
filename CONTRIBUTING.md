# Contributing

Issues and pull requests are welcome. The plugin is MIT licensed, so you may also fork it
and do your own thing — no permission needed.

## Before you open a pull request

```bash
npm install
npm test            # builds src/main.js → main.js, then runs every test suite
npx eslint src/     # the official Obsidian plugin linter — it must stay at 0 errors
```

`npm test` runs more than 340 checks against a fake vault held in memory (no folder on your
disk): the map, sources, settings, the AI flows and What's new. It also runs a translation check that fails if any user-visible text lacks its English or Spanish
counterpart, or any visible text written without `T()`. If you add a string, wrap it in `T('…')` and add the English line to the `EN`
dictionary at the top of `src/main.js`; the test will tell you if you forgot.

A third check renders the settings screen in headless Chrome and fails if it breaks halfway:
an exception inside `display()` leaves the screen half-drawn with no visible error, so the
rest simply does not appear. It skips itself where Chrome is not installed.

## What the plugin promises, and must keep promising

Three rules are the product. A change that weakens one of them will not be merged:

1. **Nothing is written without the user's approval.** One inserted line at a time; existing
   text is never rewritten or deleted.
2. **Quotes are verified by code, not by the model.** If a quote is not found literally in
   the file, the suggestion cannot be approved.
3. **No telemetry, no server, no network call the user did not ask for.** The AI key stays
   in the device's local storage, never in `data.json`. Automatic modes are off by default
   and say what they will send before sending it.

## Conventions

- Code and comments are in Spanish (the author's language). Keep the surrounding style.
- User-visible text goes through `T('…')`. Never a bare string.
- Use the Obsidian API: `Vault.process`, `fileManager.processFrontMatter`,
  `getFileByPath`, `normalizePath`, `registerDomEvent`. No `fetch`, no Node APIs, no
  inline styles — the plugin must keep working on phones.
- `src/main.js` is the source. The `main.js` at the root is the build output.
