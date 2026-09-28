# Design sources

`landing.dc.html` and `dashboard.dc.html` are exported from Claude Design (claude.ai/design).
`node scripts/dc-compile.js` turns them into `public/<name>.tpl.js` and `public/<name>.css`; the page logic lives in `public/landing.js` and `public/dashboard.js`.

Edits made to the exported files. Reapply them when you re-export a design:

- `landing.dc.html`: the two header "Sign in" buttons read `{{ signInLabel }}` (shows Account / PRO when signed in), and the toast shows only `{{ toast }}` instead of "Prototype · would open".
- `dashboard.dc.html`: its prototype account modal (`mAccount`) is unused; `public/account.js` provides the real dialog.
- Both: links are relative (`dashboard.html`, `./`), never `/…`, so the site also works under a sub-path such as GitHub Pages. Buttons that need the API (sign-in, account, chat, "Ask CardRadar AI", PRO checkout) carry `data-needs-server`; `account.css` hides them when `account.js` finds no `/api`.
