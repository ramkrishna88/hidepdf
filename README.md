# HidePDF Content

Live playground: https://hidepdfcontent.com

Site pages: [About](https://hidepdfcontent.com/about) · [Privacy](https://hidepdfcontent.com/privacy) · [Terms](https://hidepdfcontent.com/terms) · [Contact](https://hidepdfcontent.com/contact)

Contact: hello@hidepdfcontent.com

Upload a PDF, review the fields we found, then hide the ones you choose. HidePDF burns each page to an image and strips the text layer, so hidden values cannot be copied or extracted. If the user picks nothing, every detected sensitive field is hidden except amounts. Send `hide_amounts=true` or include `types=amount` when money should be hidden too.

Scanned pages with little or no text layer are read with OCR before the review list is shown.

Playground requests from this site do not need an API key. Direct API clients send `X-API-Key` or `Authorization: Bearer <key>`.

## Run locally

```bash
npm install
npm run sample
npm run dummy
npm run dev
```

Open http://localhost:3001

## API

- `GET /v1/health`
- `GET /v1/hide-types`
- `GET /v1/example`
- `GET /openapi.json`
- `POST /v1/inspect` multipart field `file` — returns masked fields to review
- `POST /v1/redact` multipart `file`, optional `types`, optional `countries`, optional `item_ids`, optional `hide_amounts` — returns a PDF with hidden text removed

If `types`, `countries`, and `item_ids` are all empty, every detected sensitive field is hidden except amounts. Set `hide_amounts=true` (or `types=amount`) to hide money values too.

Redact response headers:

- `x-hidepdf-hidden` — how many fields were burned out
- `x-hidepdf-mode` — `default_all_sensitive`, `default_all_sensitive_and_amounts`, `selected_fields`, or `selected_types`
- `x-hidepdf-text-removed` — `1` when the text layer was stripped
- `x-hidepdf-extractable` — leftover detectable matches; the API refuses to return a PDF if this is not `0`

Set `API_KEY` and send `X-API-Key` when you want the API locked. The hosted playground stays usable because same-origin browser requests are allowed.

## Deploy

Custom domain: `hidepdfcontent.com` (Cloudflare DNS → Railway). SSL is automatic.

Hosted on Railway. After code changes:

```bash
npm run build
railway up -s hidepdf -y --ci
```

## RapidAPI listing

Hub: [HidePDF Content](https://rapidapi.com/chowdaryrk077/api/hidepdf-content)

1. Import OpenAPI from [https://hidepdfcontent.com/openapi.json](https://hidepdfcontent.com/openapi.json)
2. Name: **HidePDF Content**
3. Category: **Data**
4. Base URL: `https://hidepdfcontent.com`
5. On Railway, set `RAPIDAPI_PROXY_SECRET` to the Gateway secret RapidAPI shows you
6. Plans: **BASIC** free, 100 calls/month; **PRO** `$19/mo`, 500,000 calls.
7. Tutorial: [Hide PDF secrets in 60 seconds](https://rapidapi.com/chowdaryrk077/api/hidepdf-content/tutorials/hide-pdf-secrets-in-60-seconds)

Hub testers should run **GET /v1/example** or **GET /v1/health** first. Those are small JSON responses and do not need a PDF upload.

Short Hub description:

> Hide emails, phones, cards, and country IDs in PDFs. Amounts stay visible unless you choose to hide them. Review fields first, then burn them out so values cannot be copied or extracted.
