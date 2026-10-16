# Pro Bento

Four isometric illustrations on one page. Hover or focus a tile to play its
animation; the **Copy JSX** button in each tile's top-right copies that
illustration's source file to your clipboard.

## Run it

```sh
npm install
npm run dev
```

## The four illustration files

Each file in the project root is **self-contained** — its own React import plus
every shared piece it uses (the `Stage` well, `Card`, `Pill`, `Rise`, that
illustration's data and constants). Drop one into any React project and it runs.

| File | Component |
| --- | --- |
| `TraderProfilesIso-2.jsx` | `TraderProfilesIso` |
| `NavHistoryIso.jsx` | `NavHistoryIso` |
| `McpClaudeIso.jsx` | `McpClaudeIso` |
| `WatchlistAlertsIso.jsx` | `WatchlistAlertsIso` |

Each has the component as its default export:

```jsx
import TraderProfilesIso from './TraderProfilesIso-2'

<div style={{ height: 380 }}>
  <TraderProfilesIso active={hovered} />
</div>
```

Two things to know:

- **Size** — each illustration fills its parent, so the parent needs a height,
  like the 380px wells in the bento.
- **Names** — each file defines its own copies of the shared helpers, so keep
  one per file. Pasting two into the same file will clash.

`src/ProBento.jsx` imports these files with `?raw`, so the copy buttons always
copy their current contents. Edit a file and the button follows.

The illustrations also need Inter loaded by the host page, and
`-webkit-font-smoothing: antialiased` to match how they render here:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap" />
```

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Enable it once per repo under
**Settings → Pages → Source → GitHub Actions**.
