# HidePDF

Live playground: https://hidepdf-production.up.railway.app

Upload a PDF, choose what to hide, and download a redacted file. If the user picks nothing, HidePDF hides every detected sensitive field: emails, phones, cards, IBANs, and country IDs such as India Aadhaar, PAN, and UPI.

The playground has no country or field picker. It hides every detected value automatically and shows the redacted PDF. Playground requests from this site do not need an API key. Direct API clients send `X-API-Key` or `Authorization: Bearer <key>`.

## Run locally

```bash
npm install
npm run sample
npm run dev
```

Open http://localhost:3001

## API

- `GET /v1/health`
- `GET /v1/hide-types`
- `GET /v1/example`
- `GET /openapi.json`
- `POST /v1/inspect` multipart field `file`
- `POST /v1/redact` multipart `file`, optional `types`, optional `countries`, optional `item_ids`

If `types`, `countries`, and `item_ids` are all empty, every detected sensitive field is hidden.

Set `API_KEY` and send `X-API-Key` when you want the API locked. The hosted playground stays usable because same-origin browser requests are allowed.

## Deploy

Hosted on Railway. After code changes:

```bash
npm run build
railway up -s hidepdf -y --ci
```
