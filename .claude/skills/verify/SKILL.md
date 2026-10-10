---
name: verify
description: How to build, run and drive this app (Next.js + Supabase realtime draft) to verify changes end-to-end.
---

# Verifying ti4map changes

## Launch

```bash
npm run dev -- --port 3456   # .env.local has real Supabase creds; rooms are created for real
```

Wait for `curl -s -o /dev/null -w "%{http_code}" http://localhost:3456` → 200.

## Drive (headless browser)

Playwright works with the system Chrome (the ms-playwright cache is often
version-mismatched): `chromium.launch({ executablePath: '/usr/bin/google-chrome' })`.
Install `playwright` in the scratchpad, not in the repo.

Flow to get a live map on screen:

1. `goto /` → click **"Usar exemplo (6p)"** → click **"Iniciar draft"**.
2. Wait for URL `/room/<id>?player=Marcelo`; map is `svg polygon` (37 hexes for 6p).
3. Whose turn: first `h2` reads "Sua vez de escolher" or "Vez de <name>".
   Enter as any player via `?player=<name>`.
4. Position pick = click a `svg g.cursor-pointer polygon`, then the
   **Confirmar** button in the dialog.

## Gotchas

- Rooms persist in Supabase and anon key **cannot delete** them (RLS) —
  test rooms named "Draft TI4 — Np" accumulate; mention leftovers in the report.
- Downloads (map PNG/PDF export): use Playwright `acceptDownloads` context and
  `page.waitForEvent('download')`.
