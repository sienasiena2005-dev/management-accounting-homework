# DPI-HT-01 — Financial reconstruction

**Elina Abdulmuslimova · ea25077**  
Divorce Party International Ltd. · reporting date 31 August 2026 · EUR

The application presents the financial reconstruction, its evidence and the complete decision register. The main page contains the three financial statements, reconciliation checks, 100 decisions, supporting schedules, evidence register, material uncertainty and board recommendation. `/review` provides the compact AI Review Trail for the 25 material judgments and filters for agent disagreements, final overrides and low-confidence decisions. `/submission.json` is the machine-readable answer.

All report content is read from `submission.json`. The UI keeps completed checks distinct from conditional or unresolved checks and displays the accounting basis alongside the statements. Original evidence files are linked from the evidence register.

## Run locally

No dependency installation or build is needed. From this directory:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/` for the investigation and `http://localhost:8000/review.html` for the assessor view. The Vercel configuration exposes the reviewer route as `/review`.

## Project contents

- `index.html`, `review.html`, `styles.css`, `app.js`: static application.
- `submission.json`: final structured decisions, accounts and supporting analysis.
- `case-report.pdf`: the printable financial investigation report.
- Original PDF, XLSX and CSV files: case evidence, linked by the register.
- `independent-agent-1.json`, `independent-agent-2.json`: separate AI analyses.
- `certification.md`: final decision declaration and reporting qualifications.
- `verification-answers.md`: preparation material for the later individual verification.
- `vercel.json`: public routes and response headers.

The later individual verification is a separate, no-AI exercise. Preparation material does not record that the exercise has been completed.

## Data and review

The supplied submission schema requires exactly 100 decision IDs, `D001` through `D100`. Material judgments contain the first AI proposal, independent second-agent challenge, final answer, reasoning, statement effect, confidence and an explicit override flag. Evidence references use the IDs in the evidence register. Financial effects use signed EUR amounts; a null amount means the effect has not been quantified.

The review filters use `agentDisagreement` to identify a substantive disagreement and `changedFromAI` to identify a final override. Reconciliation status comes from the final analysis. An unresolved or conditional status remains visible even when a numerical difference is zero.

## Publication

Deploy the repository root as a static Vercel project with no build command. Check the public main page, `/review` and `/submission.json`, including access without an account. The completed submission URL is the public Vercel project URL.
