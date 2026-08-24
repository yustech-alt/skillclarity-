# SkillClarity landing page

Single static page with one working registration form, built as a demand-validation test.

```
public/    index.html, styles.css, app.js, config.js  — the page
server/    zero-dependency Node server: static hosting + form storage + counter
data/      signups.jsonl and events.jsonl (created at runtime, git-ignored)
```

## Run it

```bash
ADMIN_KEY=pick-something-long node server/server.js   # http://localhost:3000
```

## Where submissions go

`public/config.js` has two modes:

- `submitMode: "local"` — posts to the bundled server, appended to `data/signups.jsonl`.
- `submitMode: "formspree"` — set `formspreeId` to the id from your Formspree endpoint
  (`https://formspree.io/f/<id>`). Use this when hosting the page as pure static files
  (Netlify, Vercel, GitHub Pages) with no server.

Read what has come in:

```bash
curl "http://localhost:3000/api/signups?key=$ADMIN_KEY"
curl "http://localhost:3000/api/stats?key=$ADMIN_KEY"
```

`/api/stats` returns pageviews, unique visitors, signups and the conversion rate.

## Analytics

The built-in counter always runs (`/api/event`, deduplicated by a `localStorage` visitor id).
Set `plausibleDomain` in `config.js` to also load Plausible — the same `pageview` and
`signup` events are sent there.

## Static hosting

Deploy `public/` on its own with `submitMode: "formspree"` and a `plausibleDomain` set;
the server is only needed for the local storage mode.
