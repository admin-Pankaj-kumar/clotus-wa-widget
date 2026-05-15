# Clotus WhatsApp Widget (Read-Only)

Embedded widget for Zoho CRM Lead detail pages that displays the
full WhatsApp conversation history from the AiSensy Pro extension.

## What this is

A read-only conversation viewer that replaces the AiSensy Pro
extension's buggy built-in widget. Fixes:

- 20-record cap (now paginated, full history accessible)
- Broken 24h countdown when no inbound exists
- Race conditions in message rendering
- State leak when navigating between leads
- XSS vulnerability in message body rendering

## Hosting

This repo is served via GitHub Pages. The Zoho widget definition
points at `https://<username>.github.io/<reponame>/widget.html`
as its index page (Hosting: External).

## Backend

The widget calls one Zoho Deluge function:
**`clotus_wa_load_conversation`** — reads from
`aisensypro__WA_Communications` module with pagination support.

## File map

| File | Purpose |
|---|---|
| widget.html | Main HTML shell, flip-clock countdown |
| script.js | Widget logic — load, render, paginate, poll |
| styles.css | Chat UI styling (WhatsApp-like) |
| *.svg, *.png | Icons |

## Updating the widget

1. Edit files locally
2. Commit and push to `main`
3. GitHub Pages rebuilds within 1-2 minutes
4. Hard refresh the Lead page in Zoho

No re-upload to Zoho needed — the widget config points at the
GitHub Pages URL, which always serves the latest.

## Security note

This repo is intentionally public for GitHub Pages free hosting.
Public exposure is acceptable because:

- No secrets are stored in client code
- All sensitive operations route through the Deluge function
  (server-side, authenticated by Zoho)
- The AiSensy bearer token is never in this codebase
