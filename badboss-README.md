# 2026 budget review

Elina Abdulmuslimova · ea25077

The completed `ea25077-budget-review.xlsx` is the primary submission. Sheets 00–08 retain the original case evidence. The completed assumption review, corrected baseline, management decisions, management budget and comparison are in sheets 09–13.

The website presents a read-only snapshot from `badboss-model.json`. It shows all three monthly P&Ls, reconciles both annual operating-profit bridges, and links the underlying source files. Accounting edits belong in the workbook; this site does not edit its figures.

Open `badboss-index.html` for the dashboard or `badboss-review.html` for the focused review trail. A static HTTP server is needed for the JSON request; opening the HTML directly from a file URL will not load the data.

All web assets use the `badboss-` prefix so that these files can coexist with the earlier submission in the GitHub repository. A separate deployment can serve `badboss-index.html` as its root page.

The forecast is in euro excluding VAT, with expenses shown as negative values. The case's operating-profit definition includes interest; no income tax is modelled. The website rounds displayed currency to whole euro; the workbook retains calculation precision.
