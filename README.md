# HidePDF

Upload a PDF, choose what to hide, and download a redacted file. If the user picks nothing, HidePDF hides every detected sensitive field (email, phone, credit card, SSN, IBAN).

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
- `POST /v1/inspect` multipart field `file`
- `POST /v1/redact` multipart `file`, optional `types`, optional `item_ids`

If `types` and `item_ids` are both empty, every detected sensitive field is hidden.

Set `API_KEY` and send `X-API-Key` when you want the API locked.
