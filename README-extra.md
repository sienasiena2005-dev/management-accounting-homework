# Companion homework pages

These flat files accompany the main DIVORCE/Sherlock submission for **Elina Abdulmuslimova (ea25077)**. The Year 2 page comes from Elina's 18 September project, commit `8f0928d`, whose recorded class link is `https://year-2-decision-simulator.vercel.app/` and whose Home Assignments status is **Accepted**. The Bad Boss page reuses an existing completed P&L site and its unchanged workbook as a separate assignment aid; Elina's Bad Boss link and status cells are blank, so this package does not claim that assignment has been approved for her.

Only compiled asset URLs have been changed to fit the combined flat repository. Year 2 calculations and the P&L workbook have not been edited. No prior student's personal certification has been copied.

## Files and routes

| Page or download | File | Supporting files |
|---|---|---|
| Year 2 Pork and Garlic decision tool | `year-2.html` | Eight `year-2-*.js`/`.css` chunk files and four `year-2-*.svg` files |
| Bad Boss Budget explanation | `bad-boss.html` | `bad-boss.js`, `bad-boss.css`, `bad-boss-favicon.svg` |
| Completed P&L workbook | `Bad-Boss-Business-School-Completed-Budget.xlsx` | Linked from the Bad Boss page |
| Rebuildable Elina Year 2 source | `year-2-source.zip` | Source, financial tests, package manifest/lock and build configuration |
| Bad Boss source and workbook | `bad-boss-source.zip` | Static site, configuration and unchanged workbook |

Copy the flat files into the combined repository's root. With Vercel `cleanUrls: true`, open `/year-2` and `/bad-boss`; otherwise use `/year-2.html` and `/bad-boss.html`. Keep the main `/`, `/review` and `/submission.json` routes. Deploy the combined repository as a static site from its root. The source ZIPs are downloads; do not apply their standalone framework settings to the combined site.

Publish only through GitHub `sienasiena2005-dev` and Vercel `sienasiena2005-4715` (verified browser workspace `siena8`). The source ZIPs exclude `.git`, `.vercel`, `node_modules`, build caches, environment files and authentication files. Original README repository references describe historical provenance, not publishing destinations.

## Year 2 inputs remain a dependency

Elina's tool starts with a blank Year 1 closing position because her actual records were not supplied when it was created. An Accepted tool does not establish a completed personal Winter decision. Enter actual closing cash, annual profit, tax-loss pool, remaining machine lives and unpaid loans; confirm those records. Enter both proposed Winter plans and the actual trainer allocation, resolve capacity and funding alerts, then compare lower allocations and record the chosen strategy. Validate against a real recorded Year 1 season when its results are available.

Year 1 prices, tax, interest, capacity and timing rules remain editable Year 2 estimates until the trainer issues final rules. The 410,000-unit Winter figure is total market demand, not guaranteed personal sales. Unknown storage details for premises A/B/F receive no invented benefit.

Inputs save in browser local storage. A new Vercel origin has separate storage; saved inputs from the previous website do not migrate automatically. Export and import the student's own records if she has them. No personal Year 1 balances or strategy have been fabricated here.

## Reproduction and verification

Extract `year-2-source.zip` into a separate folder. With Node `>=22.13.0`, run `npm ci`, `npm test` and `npm run build`. The included Next configuration exports a standalone static site into `out/`. The combined `year-2.html` rewrites its chunk paths and image paths to the supplied flat asset filenames. The original source also retains its historical Vinext configuration for reproducibility.

All six existing Elina model tests pass: the official worked example (gross profit Sh 35,200, net loss Sh 3,560, closing cash Sh 71,940), capital purchases versus depreciation, loan principal versus interest, tax-loss use, whole-unit transport allocation and lower-allocation spoilage/revenue. The flattened page loaded in Chrome, its Model Validation panel expanded correctly, and the browser reported no console errors or warnings. HTML asset references resolve locally; all supplied JavaScript files pass syntax checks.

The P&L workbook remains byte-for-byte identical to the reused completed file. SHA-256: `c21e6bc2e5d035d0ddf5faa18d951c22d916e821731e5b74a9c0117509e035d5`. Its original source tabs, corrected and management P&Ls, assumptions, decisions, monthly comparison, schedules and reconciliations remain available for review. Forecasts depend on Anna's signed terms, instructor pay coverage and achieved campaign results.
