'use strict';

(() => {
  const page = document.body.dataset.page;
  const $ = (selector, within = document) => within.querySelector(selector);
  const fmt = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 2 });
  const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  let data;
  let evidenceById;
  let decisionPage = 1;
  let reviewFilter = 'all';
  const perPage = 10;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function human(value) {
    return String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, char => char.toUpperCase());
  }

  function safeUrl(value) {
    const url = String(value ?? '').trim();
    if (!url || /^(?:javascript|data|vbscript):/i.test(url) || /^\/\//.test(url)) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:\/\//i.test(url)) return '';
    return esc(url);
  }

  function simple(value) {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') return fmt.format(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return esc(value);
  }

  function sentence(value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return esc(value).replace(/\n/g, '<br>');
    return structured(value);
  }

  function structured(value, depth = 0) {
    if (value === null || value === undefined) return '<span class="muted">Not quantified</span>';
    if (typeof value !== 'object') return sentencePrimitive(value);
    if (Array.isArray(value)) {
      if (!value.length) return '<span class="muted">None recorded</span>';
      if (value.every(item => item && typeof item === 'object' && !Array.isArray(item))) return objectTable(value);
      return `<ul class="structured-list">${value.map(item => `<li>${structured(item, depth + 1)}</li>`).join('')}</ul>`;
    }
    return `<div class="structured"><dl>${Object.entries(value).map(([key, item]) => `<div class="field-row"><dt>${esc(human(key))}</dt><dd>${structured(item, depth + 1)}</dd></div>`).join('')}</dl></div>`;
  }

  function sentencePrimitive(value) {
    return typeof value === 'string' ? esc(value).replace(/\n/g, '<br>') : simple(value);
  }

  function objectTable(rows, columns) {
    if (!rows || !rows.length) return '<p class="empty">No rows recorded.</p>';
    const keys = columns ? columns.map(col => typeof col === 'string' ? col : col.key || col.field || col.id) : [...new Set(rows.flatMap(row => Object.keys(row)))];
    const labels = columns ? columns.map((col, index) => typeof col === 'string' ? human(col) : col.label || col.title || human(keys[index])) : keys.map(human);
    return `<div class="table-wrap"><table><thead><tr>${keys.map((key, index) => `<th class="${rows.some(row => typeof row[key] === 'number') ? 'number' : ''}">${esc(labels[index])}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${keys.map(key => `<td class="${typeof row[key] === 'number' ? 'number' : ''}">${key === 'evidence' ? refs(row[key]) : structured(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function refs(ids = []) {
    if (!Array.isArray(ids)) ids = [ids];
    return `<div class="evidence-links">${ids.map(id => {
      const fullReference = String(id);
      const sourceId = evidenceById.has(fullReference) ? fullReference : fullReference.split(':')[0];
      const record = evidenceById.get(sourceId);
      return `<a class="evidence-link" href="${page === 'review' ? './' : ''}#evidence-${esc(sourceId)}" title="${esc(record?.title || record?.name || id)}">${esc(fullReference)}${record?.shortTitle ? ` · ${esc(record.shortTitle)}` : ''} ↗</a>`;
    }).join('')}</div>`;
  }

  function tag(label, kind = '') {
    return `<span class="tag ${esc(kind)}">${esc(label)}</span>`;
  }

  function money(value) {
    return typeof value === 'number' ? esc(euro.format(value)) : value !== undefined && value !== null ? esc(value) : '—';
  }

  function metric(label, value, note, negative = false, count = false) {
    return `<div class="metric"><div class="metric-label">${esc(label)}</div><div class="metric-value ${negative ? 'negative' : ''}">${count ? simple(value) : money(value)}</div><div class="metric-note">${esc(note || '')}</div></div>`;
  }

  function findNumber(object, aliases) {
    if (!object || typeof object !== 'object') return undefined;
    const normalized = aliases.map(alias => alias.replace(/[^a-z0-9]/gi, '').toLowerCase());
    for (const [key, value] of Object.entries(object)) {
      if (typeof value === 'number' && normalized.includes(key.replace(/[^a-z0-9]/gi, '').toLowerCase())) return value;
    }
    if (Array.isArray(object)) {
      const row = object.find(item => item && normalized.includes(String(item.label || item.name || item.item || '').replace(/[^a-z0-9]/gi, '').toLowerCase()));
      if (row && typeof (row.amount ?? row.value ?? row.total) === 'number') return row.amount ?? row.value ?? row.total;
    }
    for (const value of Object.values(object)) {
      if (value && typeof value === 'object') {
        const found = findNumber(value, aliases);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  function sectionHead(number, title, description = '', extra = '') {
    return `<div class="section-head"><div><div class="eyebrow">${esc(number)}</div><h2>${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ''}</div>${extra}</div>`;
  }

  function mainHero() {
    const report = data.report || {};
    const summary = data.summary || {};
    const revenue = summary.revenue ?? findNumber(data.statements?.profitAndLoss, ['revenue', 'totalRevenue', 'netRevenue']);
    const result = summary.profitBeforeMissingInsurance ?? summary.netProfit ?? summary.profit ?? findNumber(data.statements?.profitAndLoss, ['netProfit', 'profitBeforeMissingInsurance', 'profit', 'netResult']);
    const cash = summary.closingCash ?? findNumber(data.statements?.balanceSheet, ['cash', 'closingCash', 'cashAtBank', 'bank']);
    const assets = summary.totalAssets ?? findNumber(data.statements?.balanceSheet, ['totalAssets']);
    return `<section class="hero" aria-labelledby="hero-title"><div><div class="eyebrow">DPI-HT-01 · Acquisition finance review</div><h1 id="hero-title">${esc(report.headline || summary.headline || 'Reconstructing the financial truth.')}</h1><p>${esc(report.summary || summary.explanation || 'An evidence-led reconstruction of Divorce Party International Ltd. at 31 August 2026, with the decisions, calculations and remaining uncertainties behind the accounts.')}</p></div>${identity()}</section><div class="metrics">${metric('Recognised revenue', revenue, summary.revenueNote || 'Eight months ended 31 August 2026')}${metric(summary.profitLabel || 'Net result', result, summary.profitNote || 'See accounting basis and uncertainty', result < 0)}${metric('Closing bank cash', cash, summary.cashNote || 'Reconciled to the bank evidence')}${metric(summary.assetsLabel || (/conditional/i.test(data.statements?.balanceSheet?.status || '') ? 'Known-evidence assets' : 'Total assets'), assets, summary.assetsNote || 'See balance sheet assumptions')}</div>`;
  }

  function identity() {
    return `<div class="identity"><small>Prepared by</small><strong>${esc(data.student?.name || 'Elina Abdulmuslimova')}</strong><code>${esc(data.student?.id || 'ea25077')}</code><small style="margin-top:14px;margin-bottom:0">31 August 2026 · EUR</small></div>`;
  }

  function notes(value) {
    if (!value) return '';
    return `<div class="footnotes">${structured(value)}</div>`;
  }

  function statementContent(key) {
    const statement = data.statements?.[key] || {};
    const labels = { profitAndLoss: 'Profit and Loss Statement', cashFlow: 'Cash Flow Statement', balanceSheet: 'Balance Sheet' };
    let rows = Array.isArray(statement) ? statement : statement.rows || statement.lines || statement.items;
    const description = statement.description || statement.basis;
    let body;
    if (Array.isArray(rows)) {
      body = `<div class="table-wrap"><table class="statement-table"><thead><tr><th scope="col">Account / classification</th><th scope="col" class="number">EUR</th></tr></thead><tbody>${rows.map(row => {
        const kind = row.kind || row.type || (row.isTotal ? 'total' : '');
        const amount = row.amount ?? row.value ?? row.total;
        return `<tr class="${['total', 'subtotal', 'heading'].includes(kind) ? kind : ''}"><td>${esc(row.label || row.name || row.item || row.account || '')}${row.note || row.description ? `<div class="table-note">${sentence(row.note || row.description)}</div>` : ''}${row.evidence ? refs(row.evidence) : ''}</td><td class="number">${kind === 'heading' && (amount === undefined || amount === null) ? '' : simple(amount)}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    } else {
      body = structured(Object.fromEntries(Object.entries(statement).filter(([item]) => !['title', 'description', 'basis', 'notes', 'period', 'evidence'].includes(item))));
    }
    return `<div class="statement-top"><div><h3>${esc(statement.title || labels[key])}</h3>${statement.status ? `<div style="margin-top:8px">${tag(statement.status, /bank-backed|reconciled|verified/i.test(statement.status) ? 'pass' : 'uncertain')}</div>` : ''}${description ? `<p class="table-note">${sentence(description)}</p>` : ''}</div><small>${esc(statement.period || (key === 'balanceSheet' ? 'At 31 August 2026' : '1 January–31 August 2026'))}</small></div>${body}${statement.evidence ? `<div style="margin-top:18px">${refs(statement.evidence)}</div>` : ''}${notes(statement.notes)}`;
  }

  function statementsSection() {
    return `<section class="section" id="statements">${sectionHead('01 / The reconstructed accounts', 'Three statements. One evidence base.', 'Amounts in EUR. The stated accounting basis and unresolved items form part of these accounts.')}<div class="card"><div class="tabs" role="tablist" aria-label="Financial statement"><button id="tab-profitAndLoss" type="button" role="tab" aria-selected="true" aria-controls="statement-panel" data-statement="profitAndLoss">Profit & loss</button><button id="tab-cashFlow" type="button" role="tab" aria-selected="false" aria-controls="statement-panel" data-statement="cashFlow" tabindex="-1">Cash flow</button><button id="tab-balanceSheet" type="button" role="tab" aria-selected="false" aria-controls="statement-panel" data-statement="balanceSheet" tabindex="-1">Balance sheet</button></div><div id="statement-panel" class="statement-wrap" role="tabpanel" aria-labelledby="tab-profitAndLoss">${statementContent('profitAndLoss')}</div></div></section>`;
  }

  function checkState(check) {
    const status = String(check.status || '').toLowerCase();
    if (/conditional|unresolved|missing|pending|uncertain|exception|unreconciled|fail/.test(status)) return false;
    if (typeof check.difference === 'number' && Math.abs(check.difference) > 0.005) return false;
    if (check.passed === false || check.pass === false) return false;
    return check.passed === true || check.pass === true || /^(passed|pass|balanced|reconciled|matched|verified|complete|resolved)$/.test(status);
  }

  function checkCard(check, index) {
    const pass = checkState(check);
    const difference = check.difference ?? check.variance;
    const details = check.explanation || check.description || check.note || check.formula || '';
    const extra = Object.fromEntries(Object.entries(check).filter(([key]) => !['id', 'title', 'name', 'status', 'explanation', 'description', 'note', 'formula', 'calculation', 'difference', 'variance', 'rows', 'evidence', 'passed', 'pass'].includes(key)));
    return `<article class="card check" id="check-${esc(check.id || index)}"><span class="check-icon ${pass ? '' : 'warn'}" aria-hidden="true">${pass ? '✓' : '!'}</span><div><h3>${esc(check.title || check.name || `Check ${index + 1}`)}</h3><p>${sentence(details)}</p><div class="check-numbers">${tag(check.status || (pass ? 'Reconciled' : 'Review required'), pass ? 'pass' : 'uncertain')}${difference !== undefined ? ` <span style="margin-left:7px">Difference: ${simple(difference)} EUR</span>` : ''}</div>${Object.keys(extra).length ? `<div style="margin-top:12px">${structured(extra)}</div>` : ''}${check.rows ? objectTable(check.rows) : ''}${check.evidence ? `<div style="margin-top:10px">${refs(check.evidence)}</div>` : ''}</div></article>`;
  }

  function reconciliationSection(compact = false) {
    const checks = data.reconciliations || [];
    return `<section class="section" id="reconciliations">${sectionHead(compact ? '02 / Numerical controls' : '02 / Reconciliation controls', 'Follow the roll-forwards.', 'Green identifies a completed check. Amber identifies a qualification, missing evidence or an unresolved difference.', `<span class="counter">${checks.filter(checkState).length} / ${checks.length} completed</span>`)}<div class="check-grid">${checks.map(checkCard).join('')}</div></section>`;
  }

  function decisionTags(decision) {
    return `<div class="tags">${decision.agentDisagreement ? tag('Agent disagreement', 'disagreement') : ''}${decision.changedFromAI ? tag('Final override', 'override') : ''}${tag(`${human(decision.confidence)} confidence`, decision.confidence)}${decision.reviewTier === 'material_judgment' ? tag('Material', 'material') : ''}</div>`;
  }

  function effects(value) {
    if (!value) return '';
    return `<div><h4>Statement effect · EUR</h4><div class="effects">${['profit', 'cash', 'assets', 'liabilities', 'equity'].map(key => `<div class="effect"><span>${esc(human(key))}</span><strong>${value[key] === null || value[key] === undefined ? 'Not quantified' : `${value[key] > 0 ? '+' : ''}${simple(value[key])}`}</strong></div>`).join('')}</div>${value.basis ? `<p class="table-note">${sentence(value.basis)}</p>` : ''}</div>`;
  }

  function decisionCard(decision, open = false) {
    const material = decision.reviewTier === 'material_judgment';
    const certified = decision.certification?.status || decision.certificationStatus || data.certification?.status || 'Final decision';
    const certificationNote = typeof decision.certification === 'string' ? decision.certification : decision.certification?.note || decision.certification?.declaration || '';
    return `<details class="decision" id="${esc(decision.id)}" ${open ? 'open' : ''}><summary><span class="decision-id">${esc(decision.id)}</span><span class="decision-question">${esc(decision.question)}<small>${esc(human(decision.category))}</small></span>${decisionTags(decision)}<span class="chevron" aria-hidden="true">›</span></summary><div class="decision-body">${material ? `<div class="judgment-grid"><div class="review-position"><h4>Agent 1 · First proposal</h4>${sentence(decision.aiProposal)}</div><div class="review-position"><h4>Agent 2 · Independent analysis</h4>${sentence(decision.independentChallenge)}</div></div>` : ''}<div class="final-answer"><h4>${esc(human(certified))} final answer</h4>${sentence(decision.answer)}</div>${material ? `<div><h4>Final reasoning</h4>${sentence(decision.studentReasoning)}</div>${effects(decision.statementEffect)}${decision.effectBasis || decision.statementEffectBasis ? `<p class="table-note">${sentence(decision.effectBasis || decision.statementEffectBasis)}</p>` : ''}` : ''}<div><h4>Evidence supporting the decision</h4>${refs(decision.evidence)}</div>${material ? `<p class="table-note">AI proposal changed: <strong>${decision.changedFromAI ? 'Yes' : 'No'}</strong>${decision.agentDisagreement !== undefined ? ` · Substantive agent disagreement: <strong>${decision.agentDisagreement ? 'Yes' : 'No'}</strong>` : ''}${certificationNote ? ` · ${sentence(certificationNote)}` : ''}</p>` : ''}<a class="table-note" href="${page === 'review' ? './' : ''}#${esc(decision.id)}">Permanent decision link ↗</a></div></details>`;
  }

  function decisionsSection() {
    const categories = [...new Set(data.decisions.map(decision => decision.category))];
    return `<section class="section" id="decisions">${sectionHead('03 / Decision register', 'The answer behind every number.', 'Search all 100 decisions. Open a material judgment to compare both independent AI positions, the final reasoning and financial effect.', `<span class="counter">${data.decisions.length} decisions</span>`)}<div class="card"><div class="filters"><label class="search-wrap"><span aria-hidden="true">⌕</span><span class="sr-only">Search decisions</span><input id="decision-search" type="search" placeholder="Search question, answer, evidence or ID…"></label><label><span class="sr-only">Decision category</span><select id="decision-category"><option value="">All categories</option>${categories.map(category => `<option value="${esc(category)}">${esc(human(category))}</option>`).join('')}</select></label><label><span class="sr-only">Confidence</span><select id="decision-confidence"><option value="">All confidence</option><option value="high">High confidence</option><option value="medium">Medium confidence</option><option value="low">Low confidence</option></select></label><label><span class="sr-only">Review tier</span><select id="decision-tier"><option value="">All decisions</option><option value="material_judgment">Material judgments</option><option value="operational">Operational</option></select></label></div><div id="decision-list"></div><div class="pagination"><span id="decision-range" aria-live="polite"></span><div><button type="button" id="decision-prev">← Previous</button><span id="decision-page"></span><button type="button" id="decision-next">Next →</button></div></div></div></section>`;
  }

  function filterDecisions() {
    const search = $('#decision-search').value.trim().toLowerCase();
    const category = $('#decision-category').value;
    const confidence = $('#decision-confidence').value;
    const tier = $('#decision-tier').value;
    return data.decisions.filter(decision => (!search || JSON.stringify(decision).toLowerCase().includes(search)) && (!category || decision.category === category) && (!confidence || decision.confidence === confidence) && (!tier || decision.reviewTier === tier));
  }

  function showDecisions() {
    const filtered = filterDecisions();
    const pages = Math.max(1, Math.ceil(filtered.length / perPage));
    decisionPage = Math.min(Math.max(decisionPage, 1), pages);
    const start = (decisionPage - 1) * perPage;
    $('#decision-list').innerHTML = filtered.slice(start, start + perPage).map(decision => decisionCard(decision)).join('') || '<p class="empty">No decisions match the selected filters.</p>';
    $('#decision-range').textContent = filtered.length ? `${start + 1}–${Math.min(start + perPage, filtered.length)} of ${filtered.length} decisions` : '0 decisions';
    $('#decision-page').textContent = `${decisionPage} / ${pages}`;
    $('#decision-prev').disabled = decisionPage <= 1;
    $('#decision-next').disabled = decisionPage >= pages;
  }

  function scheduleBody(schedule) {
    if (Array.isArray(schedule)) return structured(schedule);
    if (!schedule || typeof schedule !== 'object') return sentence(schedule);
    let result = '';
    if (Array.isArray(schedule.rows)) result += objectTable(schedule.rows, schedule.columns);
    const extra = Object.fromEntries(Object.entries(schedule).filter(([key]) => !['title', 'description', 'rows', 'columns', 'notes', 'evidence'].includes(key)));
    if (Object.keys(extra).length) result += `<div style="padding-top:16px">${structured(extra)}</div>`;
    if (schedule.evidence) result += `<div style="margin-top:16px">${refs(schedule.evidence)}</div>`;
    return result + notes(schedule.notes);
  }

  function schedulesSection() {
    const schedules = Object.entries(data.schedules || {});
    return `<section class="section" id="schedules">${sectionHead('04 / Supporting schedules', 'Reproduce the reconstruction.', 'The revenue, working capital, operating cost, asset, debt and equity calculations that feed the statements.', `<span class="counter">${schedules.length} schedules</span>`)}<div class="schedule-grid">${schedules.map(([key, schedule]) => `<details class="card schedule" id="schedule-${esc(key)}"><summary><div><h3>${esc(human(schedule?.title || key))}</h3><p>${esc(schedule?.description || 'Open the supporting calculation and evidence.')}</p></div><span class="chevron" aria-hidden="true">›</span></summary><div class="schedule-content">${scheduleBody(schedule)}</div></details>`).join('')}</div></section>`;
  }

  function evidenceSection() {
    return `<section class="section" id="evidence">${sectionHead('05 / Evidence register', 'Every source has a place.', 'Bank records and signed third-party documents take priority. Management files and messages are assessed against the underlying evidence.', `<span class="counter">${data.evidence.length} sources</span>`)}<div class="evidence-grid">${data.evidence.map((record, index) => {
      const file = safeUrl(record.file || record.url || record.path);
      const type = (record.file || '').split('.').pop()?.toUpperCase() || record.type || 'FILE';
      const reliability = record.reliability || record.sourceType || record.strength;
      return `<article class="card evidence-card" id="evidence-${esc(record.id || index)}"><div class="evidence-top"><span class="decision-id">${esc(record.id || '')}</span><span class="file-icon">${esc(type)}</span></div><h3>${esc(record.title || record.name || record.file || `Evidence ${index + 1}`)}</h3>${reliability ? `<p><strong>${esc(human(reliability))}</strong></p>` : ''}${record.location ? `<p>${sentence(record.location)}</p>` : ''}${record.note || record.notes || record.description ? `<p>${sentence(record.note || record.notes || record.description)}</p>` : ''}${file ? `<a class="file-link" href="${file}" target="_blank" rel="noopener">Open original evidence ↗</a>` : ''}</article>`;
    }).join('')}</div></section>`;
  }

  function unresolvedUncertainties() {
    return (data.uncertainties || []).filter(item => item.resolved !== true && !/^(resolved|closed)$/i.test(item.status || ''));
  }

  function uncertaintyCard(item, index) {
    const title = item.title || item.name || `Uncertainty ${index + 1}`;
    const content = item.description || item.issue || item.uncertainty || item.note;
    const extra = Object.fromEntries(Object.entries(item).filter(([key]) => !['id', 'title', 'name', 'description', 'reason', 'issue', 'uncertainty', 'note', 'confidence', 'evidence', 'status', 'resolved'].includes(key)));
    const status = item.status || (item.resolved ? 'Resolved' : 'Unresolved');
    return `<article class="card uncertainty" id="uncertainty-${esc(item.id || index)}"><div class="tags">${tag(status, item.resolved || /^resolved$/i.test(status) ? 'pass' : 'uncertain')}${item.confidence ? tag(`${human(item.confidence)} confidence`, item.confidence) : ''}</div><h3>${esc(title)}</h3>${content ? `<p>${sentence(content)}</p>` : ''}${Object.keys(extra).length ? `<div style="margin-top:13px">${structured(extra)}</div>` : ''}${item.evidence ? `<div style="margin-top:15px">${refs(item.evidence)}</div>` : ''}</article>`;
  }

  function uncertaintySection(compact = false) {
    const uncertainties = compact ? unresolvedUncertainties() : data.uncertainties || [];
    return `<section class="section" id="uncertainties">${sectionHead(compact ? '03 / Matters remaining open' : '06 / Material uncertainty', 'What the evidence cannot settle.', 'The reporting basis separates known amounts from assumptions and identifies the evidence needed to resolve each open issue.', `<span class="counter">${unresolvedUncertainties().length} open matters</span>`)}<div class="uncertainty-grid">${uncertainties.map(uncertaintyCard).join('') || '<p class="empty">No unresolved uncertainty recorded.</p>'}</div></section>`;
  }

  function boardSection() {
    const board = data.boardRecommendation || {};
    const actions = board.actions || board.priorities || [];
    const extra = Object.fromEntries(Object.entries(board).filter(([key]) => !['title', 'decision', 'recommendation', 'rationale', 'conclusion', 'actions', 'priorities', 'evidence'].includes(key)));
    return `<section class="section" id="board">${sectionHead('07 / Board recommendation', 'Decide with the evidence in view.')}<div class="board"><div class="board-main"><div class="eyebrow">Recommendation to Bad Decisions Capital Ltd.</div><h3>${sentence(board.decision || board.recommendation || board.title || 'Adopt the evidence-led accounting basis.')}</h3>${board.rationale ? `<p>${sentence(board.rationale)}</p>` : ''}${board.conclusion ? `<p>${sentence(board.conclusion)}</p>` : ''}${Object.keys(extra).length ? `<div style="margin-top:18px">${structured(extra)}</div>` : ''}${board.evidence ? `<div style="margin-top:20px">${refs(board.evidence)}</div>` : ''}</div><div class="board-actions"><h4>Execution priorities</h4>${Array.isArray(actions) ? actions.map((action, index) => `<div class="action-row"><span class="action-num">${String(index + 1).padStart(2, '0')}</span><div><p>${sentence(typeof action === 'string' ? action : action.action || action.title || action.description)}</p>${typeof action === 'object' ? `<small>${esc([action.owner, action.timing || action.deadline, action.priority].filter(Boolean).join(' · '))}</small>` : ''}</div></div>`).join('') : structured(actions)}</div></div>${certification()}${downloads()}<a class="back-top" href="#hero-title">Back to the top ↑</a></section>`;
  }

  function certification() {
    const cert = data.certification || {};
    const declaration = typeof cert === 'string' ? cert : cert.declaration || cert.statement || cert.note || 'The final decisions, evidence references, reasoning and confidence levels are recorded in this submission.';
    const extras = typeof cert === 'object' ? Object.fromEntries(Object.entries(cert).filter(([key]) => !['declaration', 'statement', 'note', 'status', 'name', 'student', 'studentName', 'studentId', 'id'].includes(key))) : {};
    return `<div class="certification"><div><h3>Final certification</h3><p>${sentence(declaration)}</p>${Object.keys(extras).length ? `<div style="margin-top:10px">${structured(extras)}</div>` : ''}</div>${tag(human(cert.status || 'Final submission'), cert.status === 'certified' ? 'pass' : '')}</div>`;
  }

  function downloads() {
    const links = data.downloads || [
      { title: 'Case report PDF', file: 'case-report.pdf' },
      { title: 'Submission JSON', file: 'submission.json' },
      { title: 'Certification', file: 'certification.md' },
      { title: 'Agent 1 analysis', file: 'independent-agent-1.json' },
      { title: 'Agent 2 analysis', file: 'independent-agent-2.json' },
      { title: 'Verification preparation', file: 'verification-answers.md' }
    ];
    return `<div class="downloads">${links.map(link => `<a class="button" href="${safeUrl(link.file || link.url)}">${esc(link.title || link.label)} ↓</a>`).join('')}</div>`;
  }

  function mainPage() {
    $('#app').innerHTML = `<main class="page" id="main">${mainHero()}<nav class="section-nav" aria-label="Investigation sections"><a href="#statements">Statements</a><a href="#reconciliations">Reconciliations</a><a href="#decisions">100 decisions</a><a href="#schedules">Schedules</a><a href="#evidence">Evidence</a><a href="#uncertainties">Uncertainty</a><a href="#board">Board recommendation</a></nav>${statementsSection()}${reconciliationSection()}${decisionsSection()}${schedulesSection()}${evidenceSection()}${uncertaintySection()}${boardSection()}</main>`;
    showDecisions();
    ['decision-search', 'decision-category', 'decision-confidence', 'decision-tier'].forEach(id => $(`#${id}`).addEventListener(id === 'decision-search' ? 'input' : 'change', () => { decisionPage = 1; showDecisions(); }));
    $('#decision-prev').addEventListener('click', () => { decisionPage--; showDecisions(); $('#decisions').scrollIntoView({ block: 'start' }); });
    $('#decision-next').addEventListener('click', () => { decisionPage++; showDecisions(); $('#decisions').scrollIntoView({ block: 'start' }); });
    const tabs = [...document.querySelectorAll('[data-statement]')];
    function activateTab(tab) {
      tabs.forEach(button => { const selected = button === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
      $('#statement-panel').innerHTML = statementContent(tab.dataset.statement);
      $('#statement-panel').setAttribute('aria-labelledby', tab.id);
    }
    tabs.forEach((button, index) => {
      button.addEventListener('click', () => activateTab(button));
      button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
        if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length - 1];
        if (next) { event.preventDefault(); activateTab(next); next.focus(); }
      });
    });
    openHash();
    window.addEventListener('hashchange', openHash);
  }

  function openHash() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (/^D\d{3}$/.test(id)) {
      ['decision-search', 'decision-category', 'decision-confidence', 'decision-tier'].forEach(filter => { $(`#${filter}`).value = ''; });
      const index = data.decisions.findIndex(decision => decision.id === id);
      if (index < 0) return;
      decisionPage = Math.floor(index / perPage) + 1;
      showDecisions();
      const decision = document.getElementById(id);
      decision.open = true;
      requestAnimationFrame(() => decision.scrollIntoView({ block: 'start' }));
    } else if (id) {
      const target = document.getElementById(id);
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
  }

  function reviewPage() {
    const material = data.decisions.filter(decision => decision.reviewTier === 'material_judgment');
    const disagreement = material.filter(decision => decision.agentDisagreement);
    const overrides = material.filter(decision => decision.changedFromAI);
    const low = data.decisions.filter(decision => decision.confidence === 'low');
    const open = unresolvedUncertainties();
    $('#app').innerHTML = `<main class="page review-page" id="main"><section class="hero"><div><div class="eyebrow">DPI-HT-01 · Compact assessor view</div><h1>AI Review Trail.</h1><p>The independent positions, final decisions and evidence for the 25 material judgments. Exceptions and uncertainty remain visible.</p></div>${identity()}</section><div class="metrics">${metric('Material judgments', material.length, `${data.decisions.length} total decisions`, false, true)}${metric('Agent disagreements', disagreement.length, 'Substantive differences in treatment', false, true)}${metric('Final overrides', overrides.length, 'Final answer changed from Agent 1', false, true)}${metric('Low confidence', low.length, 'Across all 100 decisions', false, true)}${metric('Open uncertainty', open.length, 'Evidence or resolution outstanding', false, true)}</div>${certification()}<section class="section" id="trail">${sectionHead('01 / Independent analysis and final judgment', 'Review the 25 material decisions.', 'Open a decision to inspect its evidence, financial impact, independent challenge and final reasoning.', '<button class="print-link" id="print-review" type="button">Print review ↗</button>')}<div class="card"><div class="review-toolbar" aria-label="Review filters"><button type="button" data-review-filter="all" aria-pressed="true">All material judgments</button><button type="button" data-review-filter="disagreements" aria-pressed="false">Agent disagreements</button><button type="button" data-review-filter="overrides" aria-pressed="false">Final overrides</button><button type="button" data-review-filter="low" aria-pressed="false">Low confidence · all decisions</button><button type="button" id="expand-trail">Expand all</button><label class="search-wrap"><span aria-hidden="true">⌕</span><span class="sr-only">Search review trail</span><input id="review-search" type="search" placeholder="Search the review trail…"></label></div><div id="review-list"></div><div class="review-count" id="review-count" aria-live="polite"></div></div></section>${reconciliationSection(true)}${uncertaintySection(true)}<section class="section" id="review-board">${sectionHead('04 / Board decision and submission', 'The final position in context.')}<div class="card card-pad"><h3>${sentence(data.boardRecommendation?.decision || data.boardRecommendation?.recommendation || 'Board recommendation')}</h3><div style="margin-top:13px;font-size:13px;color:var(--muted)">${sentence(data.boardRecommendation?.rationale || data.boardRecommendation?.conclusion || '')}</div><div class="downloads"><a class="button" href="./#board">Full board recommendation ↗</a><a class="button" href="./#decisions">All 100 decisions ↗</a><a class="button" href="./#evidence">Original evidence ↗</a></div></div>${downloads()}</section></main>`;
    showReview();
    document.querySelectorAll('[data-review-filter]').forEach(button => button.addEventListener('click', () => {
      reviewFilter = button.dataset.reviewFilter;
      document.querySelectorAll('[data-review-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      showReview();
    }));
    $('#review-search').addEventListener('input', showReview);
    $('#expand-trail').addEventListener('click', () => {
      const details = [...$('#review-list').querySelectorAll('details')];
      const expand = details.some(detail => !detail.open);
      details.forEach(detail => { detail.open = expand; });
      $('#expand-trail').textContent = expand ? 'Collapse all' : 'Expand all';
    });
    $('#print-review').addEventListener('click', () => {
      $('#review-search').value = '';
      reviewFilter = 'all';
      document.querySelectorAll('[data-review-filter]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.reviewFilter === 'all')));
      showReview();
      document.querySelectorAll('#review-list details').forEach(detail => { detail.open = true; });
      $('#expand-trail').textContent = 'Collapse all';
      window.print();
    });
  }

  function showReview() {
    const search = $('#review-search').value.trim().toLowerCase();
    const decisions = data.decisions.filter(decision => {
      if (reviewFilter === 'low') return decision.confidence === 'low';
      if (decision.reviewTier !== 'material_judgment') return false;
      if (reviewFilter === 'disagreements') return decision.agentDisagreement;
      if (reviewFilter === 'overrides') return decision.changedFromAI;
      return true;
    }).filter(decision => !search || JSON.stringify(decision).toLowerCase().includes(search));
    $('#review-list').innerHTML = decisions.map(decision => decisionCard(decision)).join('') || '<p class="empty">No decisions match this review filter.</p>';
    $('#review-count').textContent = `${decisions.length} ${reviewFilter === 'low' ? 'decisions' : 'material judgments'} shown · source: submission.json`;
    $('#expand-trail').textContent = 'Expand all';
  }

  async function load() {
    try {
      const response = await fetch('submission.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Submission returned HTTP ${response.status}`);
      data = await response.json();
      if (!Array.isArray(data.decisions) || !Array.isArray(data.evidence)) throw new Error('The submission must contain decisions and evidence arrays.');
      evidenceById = new Map(data.evidence.map(record => [String(record.id), record]));
      if (page === 'review') reviewPage(); else mainPage();
    } catch (error) {
      $('#app').innerHTML = `<main class="loading" id="main"><span class="loading-mark">DPI</span><h1>The submission could not be opened.</h1><p>${esc(error.message)}</p><p>Open this project through a web server and check that <a href="submission.json"><u>submission.json</u></a> is available.</p></main>`;
      console.error(error);
    }
  }

  load();
})();
