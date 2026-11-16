# What You Unlock

The "What paid plans open up." section from the 01Resolved pricing page:
four tiles (Trader profiles, NAV/AS history, 01R MCP in Claude, Your own alerts),
each with an isometric illustration that plays while the tile is hovered or focused.

Live at https://01resolved.calcutta.studio

## Files

| File | What it is |
| --- | --- |
| `index.html` | Section markup and copy |
| `src/unlock.css` | Section styles (tokens, panel, eyebrow, heading, grid, iso stage) |
| `src/unlock.js` | The four animations, plain JS. Finds every `[data-iso]` element on load |
| `src/main.js` | Vite entry, imports the two files above |

To reuse it elsewhere, copy the `<section class="panel">` block, link
`unlock.css`, and load `unlock.js` after the section. Fonts: EB Garamond and
Figtree from Google Fonts (Open Sauce One is used when installed).

## Run it

```sh
npm install
npm run dev
```

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml` (custom domain from `public/CNAME`).
