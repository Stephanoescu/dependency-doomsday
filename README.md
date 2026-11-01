# Dependency Doomsday

**How close is your project to midnight?** Paste a `package.json` or a public GitHub repo and get a
doomsday forecast of your npm dependencies: which are abandoned, which have a single npm maintainer,
and which are critical. You get a score from 0 to 100, a doomsday clock, and a link, image and badge
you can share.

- **Free:** public APIs only (npm registry, npm downloads, GitHub) on Vercel's free plan.
- **Rules, not AI:** fixed, versioned rules, documented in plain language at `/methodology`
  (logic in [`lib/risk.ts`](lib/risk.ts)).
- **Private:** only package names are processed. Pasted files are parsed in the browser and your code
  is never sent anywhere.
- **No sign-up**, no database.

## Run it locally

Requires Node.js 20.9 or newer. No accounts or environment variables are needed.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script                      | What it does                                                            |
| --------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`               | Development server                                                      |
| `npm run build && npm start`| Production build and server                                             |
| `npm test`                  | Unit tests (Vitest): parsing, risk rules, narrative, links, cache…      |
| `npm run lint` / `typecheck`| ESLint / TypeScript                                                     |
| `npm run check:fit`         | Checks the result's first screen fits 390×844 and 360×740 (server must be running; uses your installed Chrome) |
| `npm run fixtures:capture`  | Refreshes the frozen real-world data used by the sanity test            |

## Configuration

Every variable is optional; copy [`.env.example`](.env.example) to `.env.local` and fill in what you need.

| Variable                                             | Why                                                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`                                       | GitHub allows 60 requests/hour per IP without a token and 5,000 with one. Fine-grained token, public repositories read-only. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared cache and rate limits across serverless instances. **Recommended in production** (see below). |
| `NEXT_PUBLIC_SITE_URL`                               | Public origin for Open Graph tags, e.g. `https://doomsday.example`. Defaults to the Vercel production URL, then `http://localhost:3000`. |

## Deploying to Vercel

1. Import the repository in Vercel. The defaults work and no build settings are needed.
2. Add `GITHUB_TOKEN` and, if you use a custom domain, `NEXT_PUBLIC_SITE_URL`.
3. Set up Upstash as described below.

The API routes that keep working after responding (`/api/analyze`, `/api/og`, `/api/badge`) declare
`maxDuration = 60`, which the Hobby plan allows with or without Fluid compute.

### Setting up Upstash Redis (recommended in production)

Without Upstash, the cache lives in each serverless instance's memory, which causes two problems:

- A link-preview crawler that lands on a cold instance gets the generic brand image instead of the
  score.
- The per-IP rate limit is counted per instance, so it is only approximate.

With Upstash, every instance shares one 24-hour cache and one set of rate-limit counters. Upstash has
a free plan.

1. **Create a database.** Sign in at [console.upstash.com](https://console.upstash.com), click
   **Create Database** and choose **Redis**.
   - **Region:** pick the one closest to your Vercel functions. Vercel's default, `iad1`, is in
     Washington D.C., so use `us-east-1`.
   - **Plan:** Free.
   - Leave eviction off.
2. **Copy the credentials.** On the database page, open the **REST API** section and copy
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. **Add them to Vercel.** In Vercel, go to **Project → Settings → Environment Variables**, add both
   variables for Production (and Preview, if you like), then **redeploy**. Environment variables only
   apply to new deployments.
   - You can also connect Upstash through **Vercel → Storage → Marketplace**. If the integration names
     the variables differently (for example `KV_REST_API_URL` and `KV_REST_API_TOKEN`), add the two
     variables above with the same values.
4. **Verify.** Run a forecast on the live site, then open **Data Browser** in Upstash. You should see
   keys like `dd:v4:npm:express`, `dd:v4:sum:…` and `dd:rl:analyze:…`.

To use Upstash locally as well, put the same two variables in `.env.local`.

**Usage:** an uncached forecast costs a few Redis commands per package. Cached forecasts cost a
handful in total. Rate-limit checks cost 3 commands each. A hobby deployment stays far below the free
plan's monthly allowance; check [upstash.com/pricing](https://upstash.com/pricing) for current limits.
If Upstash is unreachable, the app falls back to treating every lookup as a cache miss and allowing
the request, so a Redis outage never takes the site down.

## How it works

- **Input:** `package.json` text is parsed in the browser. For GitHub repos, `/api/resolve` reads
  `package.json` from `raw.githubusercontent.com`, which costs no API quota, and returns package names
  only.
- **Data:** `/api/analyze` streams progress as NDJSON while it collects data:
  - npm registry documents, reduced to the few fields the rules use;
  - monthly downloads, using the bulk endpoint for unscoped packages;
  - GitHub repo activity.

  It runs at most 8 requests at a time, caches results for 24 hours, and a failing source never stops
  the analysis.
- **Score:** see `/methodology`. Package score = sum of rule points, capped at 100. Project score =
  100 − the download-weighted average risk. Minutes to midnight = score ÷ 10.
- **Share links:**
  - repos: `/r/github/owner/repo[/tree/<ref>/<path>]`;
  - pasted files: `/list?d=<lz-string>`. This link holds package names only, and leaves out packages
    npm couldn't find, which are likely private.

  Links are recomputed on open, from the cache.
- **Images:** `/api/og` renders 1200×630 and 1080×1920 cards. If the analysis takes more than about
  4 s, crawlers get the brand card and the analysis finishes in the background, so the next request
  gets the score.
- **Badge:** `/api/badge?repo=owner/repo` returns a shields-style SVG that links to the report.
- **Limits:** per IP, `/api/analyze` allows 10 requests/min, `/api/resolve` 30/min, and images and
  badges 30/min.

## License and credits

The fonts in [`assets/fonts`](assets/fonts) (Archivo Black, JetBrains Mono) are licensed under the SIL
Open Font License; their license files sit next to them.
