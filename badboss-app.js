'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const moneyFormat = new Intl.NumberFormat('en-GB', {style:'currency',currency:'EUR',maximumFractionDigits:0});
  const numberFormat = new Intl.NumberFormat('en-GB',{maximumFractionDigits:2});
  const money = value => Number.isFinite(Number(value)) ? moneyFormat.format(Math.abs(Number(value)) < .00001 ? 0 : Number(value)) : '—';
  const number = value => Number.isFinite(Number(value)) ? numberFormat.format(Number(value)) : '—';
  const percent = value => Number.isFinite(Number(value)) ? `${(Number(value)*100).toFixed(1)}%` : '—';
  const versions = ['draft','corrected','management'];
  const labels = {draft:'Original draft',corrected:'Corrected baseline',management:'Management budget'};
  const pnlLines = [
    {key:'revenue',label:'Total revenue',className:'total'},
    {key:'corporateRevenue',label:'Corporate revenue',className:'subline'},
    {key:'openRevenue',label:'Open-seat revenue',className:'subline'},
    {key:'directCosts',label:'Direct costs'},
    {key:'contribution',label:'Contribution',className:'total'},
    {key:'contributionMargin',label:'Contribution margin',ratio:true},
    {key:'operatingExpenses',label:'Operating expenses'},
    {key:'operatingProfit',label:'Operating profit / (loss)',className:'profit'},
    {key:'operatingMargin',label:'Operating margin',ratio:true}
  ];
  let model, selectedVersion = 'corrected', selectedMeasure = 'operatingProfit';
  const annual = version => model.annual[version];
  const sumDecision = key => model.monthly.reduce((total,item)=>total+(Number(item.decision?.[key])||0),0);
  const ratioValue = (budget,key) => key==='contributionMargin' ? budget.contribution/budget.revenue : key==='operatingMargin' ? budget.operatingProfit/budget.revenue : budget[key];
  const formatLine = (budget,line) => line.ratio ? percent(ratioValue(budget,line.key)) : money(budget[line.key]);
  function plain(value) {
    if (value===null || value===undefined) return '';
    if (typeof value==='string' || typeof value==='number') return String(value);
    if (Array.isArray(value)) return value.map(plain).filter(Boolean).join('; ');
    return Object.entries(value).map(([key,item])=>`${key.replace(/([a-z])([A-Z])/g,'$1 $2')}: ${plain(item)}`).join('; ');
  }
  function setText(id,value) { if($(id)) $(id).textContent=plain(value); }
  function renderAnnualCards() {
    $('annual-cards').innerHTML = versions.map((version,index)=>{
      const budget=annual(version);
      const explanations=['Uncorrected management forecast','Existing plan with supported estimates','Baseline plus separately costed actions'];
      return `<article class="metric-card"><p class="eyebrow">${index===0?'Starting point':index===1?'Part 1':'Part 2'} / ${labels[version]}</p><p class="metric-value ${budget.operatingProfit<0?'negative':''}">${money(budget.operatingProfit)}</p><p class="metric-description">Operating profit / (loss)</p><div class="metric-secondary"><span>Revenue</span><strong>${money(budget.revenue)}</strong></div><span class="visually-hidden">${explanations[index]}</span></article>`;
    }).join('');
    setText('management-profit',money(annual('management').operatingProfit));
    setText('currency-basis',model.currency || 'EUR excluding VAT');
    setText('basis-note',`${model.basis || 'P&L only. Case operating profit includes interest; no income tax is modelled.'} Displayed euro amounts are rounded; calculation precision is retained in the workbook.`);
  }
  function renderBudget(version) {
    selectedVersion=version;
    document.querySelectorAll('[data-budget]').forEach(button=>{
      const active=button.dataset.budget===version;
      button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
    });
    if(!$('budget-panel'))return;
    $('budget-panel').setAttribute('aria-labelledby',`tab-${version}`);
    const budget=annual(version);
    const lines=pnlLines.filter(line=>line.ratio || budget[line.key]!==undefined);
    $('budget-panel').innerHTML=`<table class="pnl-table"><caption class="visually-hidden">${labels[version]} monthly P&amp;L for ${model.year}, euro excluding VAT. Expenses shown negative.</caption><thead><tr><th scope="col">${labels[version]}</th>${model.monthly.map(item=>`<th scope="col">${escape(item.month)}</th>`).join('')}<th scope="col" class="annual">Full year</th></tr></thead><tbody>${lines.map(line=>`<tr class="${line.className||''}"><td>${line.label}</td>${model.monthly.map(item=>{const value=ratioValue(item[version],line.key);return `<td class="${value<0?'negative':''}">${formatLine(item[version],line)}</td>`;}).join('')}<td class="annual ${ratioValue(budget,line.key)<0?'negative':''}">${formatLine(budget,line)}</td></tr>`).join('')}</tbody></table>`;
  }
  function renderAnnualComparison() {
    if(!$('annual-comparison'))return;
    const lines=pnlLines.filter(line=>line.ratio || versions.some(version=>annual(version)[line.key]!==undefined));
    $('annual-comparison').innerHTML=`<table class="annual-table"><caption class="visually-hidden">Annual comparison of the three budgets.</caption><thead><tr><th scope="col">2026 P&amp;L / EUR</th>${versions.map(version=>`<th scope="col">${labels[version]}</th>`).join('')}</tr></thead><tbody>${lines.map(line=>`<tr class="${line.className||''}"><td>${line.label}</td>${versions.map(version=>{const value=ratioValue(annual(version),line.key);return `<td class="${value<0?'negative':''}">${formatLine(annual(version),line)}</td>`;}).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function renderChart(measure) {
    selectedMeasure=measure;
    if(!$('trend-chart'))return;
    document.querySelectorAll('[data-chart]').forEach(button=>{const active=button.dataset.chart===measure;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const width=1100,height=290,left=73,right=20,top=18,bottom=40,plotHeight=height-top-bottom;
    const values=model.monthly.flatMap(item=>versions.map(version=>item[version][measure]));
    const low=Math.min(0,...values),high=Math.max(0,...values),padding=Math.max((high-low)*.09,1);
    const min=low-padding,max=high+padding;
    const x=index=>left+index*(width-left-right)/(model.monthly.length-1);
    const y=value=>top+(max-value)*plotHeight/(max-min);
    const ticks=Array.from({length:5},(_,i)=>min+(max-min)*i/4);
    const colors={draft:'#c69858',corrected:'#a74637',management:'#346880'};
    const title=`Monthly ${measure==='revenue'?'revenue':'operating profit'} for original draft, corrected baseline and management budget`;
    $('trend-chart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">${title}</title><desc id="chart-desc">${versions.map(version=>`${labels[version]} annual ${measure==='revenue'?'revenue':'operating profit'} ${money(annual(version)[measure])}`).join('. ')}. Exact monthly amounts are in the budget tables.</desc>${ticks.map(tick=>`<line x1="${left}" y1="${y(tick)}" x2="${width-right}" y2="${y(tick)}" stroke="#e4e7e4"/><text x="${left-12}" y="${y(tick)+4}" fill="#63717a" font-size="11" text-anchor="end">${escape(`${Math.round(tick/1000)}k`)}</text>`).join('')}<line x1="${left}" x2="${width-right}" y1="${y(0)}" y2="${y(0)}" stroke="#aab8bc" stroke-width="1.3"/>${versions.map(version=>`<polyline fill="none" points="${model.monthly.map((item,i)=>`${x(i)},${y(item[version][measure])}`).join(' ')}" stroke="${colors[version]}" stroke-width="${version==='management'?3:2}" stroke-linejoin="round"/>${model.monthly.map((item,i)=>`<circle cx="${x(i)}" cy="${y(item[version][measure])}" r="${version==='management'?3.5:2.5}" fill="${colors[version]}"><title>${escape(`${item.month} · ${labels[version]} · ${money(item[version][measure])}`)}</title></circle>`).join('')}`).join('')}${model.monthly.map((item,i)=>`<text x="${x(i)}" y="${height-12}" text-anchor="middle" fill="#63717a" font-size="11">${escape(item.month)}</text>`).join('')}<text x="${left-12}" y="10" text-anchor="end" fill="#63717a" font-size="10">EUR</text></svg>`;
  }
  function bridgeItems(from,to,key) {
    const supplied=model.bridges?.[key];
    if(Array.isArray(supplied))return supplied;
    if(Array.isArray(supplied?.items))return supplied.items;
    return [
      {label:'Revenue estimate',annual:annual(to).revenue-annual(from).revenue},
      {label:'Direct costs',annual:annual(to).directCosts-annual(from).directCosts},
      {label:'Operating expenses',annual:annual(to).operatingExpenses-annual(from).operatingExpenses}
    ];
  }
  function bridgeAmount(item) {return Number(item.annual ?? item.amount ?? item.value ?? item.profitEffect ?? 0);}
  function renderBridges() {
    if(!$('bridge-cards'))return;
    const pairs=[{from:'draft',to:'corrected',key:'draftToCorrected',title:'Draft → Corrected baseline'},{from:'corrected',to:'management',key:'correctedToManagement',title:'Corrected → Management budget'}];
    $('bridge-cards').innerHTML=pairs.map(pair=>{
      const start=annual(pair.from).operatingProfit,end=annual(pair.to).operatingProfit,delta=end-start,items=bridgeItems(pair.from,pair.to,pair.key);
      const reconciles=Math.abs(start+items.reduce((total,item)=>total+bridgeAmount(item),0)-end)<.01;
      const monthly=document.body.dataset.page==='review' && items.every(item=>Array.isArray(item.monthly)&&item.monthly.length===12) ? `<details class="comparison-details"><summary>Inspect the monthly bridge</summary><div class="table-scroll"><table class="monthly-bridge"><thead><tr><th scope="col">Profit effect / EUR</th>${model.monthly.map(item=>`<th scope="col">${escape(item.month)}</th>`).join('')}</tr></thead><tbody><tr class="endpoint"><td>${labels[pair.from]} profit</td>${model.monthly.map(item=>`<td>${money(item[pair.from].operatingProfit)}</td>`).join('')}</tr>${items.map(item=>`<tr><td>${escape(item.label)}</td>${item.monthly.map(value=>`<td class="${value<0?'negative':''}">${money(value)}</td>`).join('')}</tr>`).join('')}<tr class="endpoint"><td>${labels[pair.to]} profit</td>${model.monthly.map(item=>`<td>${money(item[pair.to].operatingProfit)}</td>`).join('')}</tr></tbody></table></div></details>` : '';
      return `<article class="bridge-card"><div class="bridge-top"><h3>${pair.title}</h3><span class="delta ${delta<0?'negative':'positive'}">${delta>0?'+':''}${money(delta)}</span></div><table class="bridge-table"><caption class="visually-hidden">Profit reconciliation: ${pair.title}</caption><tbody><tr class="endpoint"><td>${labels[pair.from]} profit</td><td class="${start<0?'negative':''}">${money(start)}</td></tr>${items.map(item=>`<tr><td>${escape(item.label || item.title || item.decision)}${item.note?`<span class="source-cite" style="display:block">${escape(plain(item.note))}</span>`:''}</td><td class="${bridgeAmount(item)<0?'negative':''}">${bridgeAmount(item)>0?'+':''}${money(bridgeAmount(item))}</td></tr>`).join('')}<tr class="endpoint"><td>${labels[pair.to]} profit</td><td class="${end<0?'negative':''}">${money(end)}</td></tr></tbody></table><p class="bridge-source">${reconciles?'Reconciles to the annual P&L.':'Bridge requires reconciliation; inspect the workbook.'} ${escape(plain(model.bridges?.[pair.key]?.source || 'The workbook retains the detailed supporting calculations.'))}</p>${monthly}</article>`;
    }).join('');
  }
  function defaultAssumptions() {
    return [
      {id:'A01',topic:'Salespeople and employment dates',treatment:'Anna leaves after February. Ella is paid from May, with onboarding and a gradual selling ramp. Existing staff remain; promised improvements require evidence.',source:'06 HR and Personnel Plan.docx ¶7–19; 03 Sales Director Plan.docx ¶5–11; 07 Draft Operating Costs!D7:O10',risk:'Salary dates and productive sales capacity are separate assumptions.'},
      {id:'A02',topic:'Open-course demand and existing dates',treatment:'Previous-month enquiries are scaled by the existing monthly marketing spend and converted at 198/817. January uses December’s 60 enquiries. Seat counts are rounded down and bounded by the seven existing dates.',source:'03 Prior Year Marketing!D7:O12; 07 Draft Operating Costs!D11:O11; 03 Sales Director Plan.docx ¶11; 06 Draft Program Plan!B8:R30',impact:'90 seats and €35,700 open revenue in the corrected baseline.',risk:'A typical 12–20 participants is not a guaranteed minimum. The July enquiry trough leaves the August event with five seats.'},
      {id:'A03',topic:'Deliverable revenue carries its direct costs',treatment:'Cost the whole delivery workload, including corporate demand beyond the pencilled register. Retain customer travel, participant materials and ordinary commissions in both budgets.',source:'05 Operations and Trainer Plan.docx ¶19–20; 06 Draft Program Plan!G7:R32; 01 Company Background and Management Targets.docx ¶9–17',risk:'An annual sales target alone does not reserve a trainer, room or a client delivery date.'},
      {id:'A04',topic:'Large groups and assistant staffing',treatment:'Corporate daily price is €2,500 for the first 20 participants plus €650 for each started extra block of ten. Delivery personnel are one per 30 participants, rounded up; the first is the instructor.',source:'01 Company Background and Management Targets.docx ¶11,¶15; 05 Operations and Trainer Plan.docx ¶16',risk:'Assistant requirements and program length must both be included in the event cost.'},
      {id:'A05',topic:'Trainer rate increases in July',treatment:'Use €700 per external instructor day through June and €770 from July. Assistant day rates remain one quarter of the instructor rate.',source:'07 Finance and Administration Notes.docx ¶5; 01 Company Background and Management Targets.docx ¶17',risk:'External trainers require six to eight weeks’ notice; quoted availability is not guaranteed.'},
      {id:'A06',topic:'Annual insurance and studio depreciation',treatment:'Recognise annual insurance evenly at €150 a month. The €25,000 studio fit-out is available on 1 May and adds €416.67 monthly depreciation from May; capital expenditure itself is excluded from the P&L.',source:'07 Finance and Administration Notes.docx ¶6–7; 07 Draft Operating Costs!G15,D17:O17',risk:'This review is a P&L budget; it does not establish funding or cash availability.'}
    ];
  }
  function renderAssumptions(query='') {
    if(!$('assumption-list'))return;
    const all=Array.isArray(model.assumptions)&&model.assumptions.length?model.assumptions:defaultAssumptions();
    const items=all.filter(item=>plain(item).toLowerCase().includes(query.trim().toLowerCase()));
    setText('assumption-count',`${items.length} of ${all.length} assumptions shown`);
    $('assumption-list').innerHTML=items.length?items.map((item,index)=>{
      const treatment=item.treatment ?? item.corrected ?? item.correctedAssumption ?? item.explanation;
      const impact=item.impact ?? item.effect;
      return `<article class="assumption-item"><div class="assumption-id">${escape(item.id || `A${String(index+1).padStart(2,'0')}`)}</div><div><h3>${escape(item.topic || item.title || item.assumption)}</h3><p class="assumption-treatment">${escape(plain(treatment))}</p>${(impact || item.risk || item.draft)?`<div class="assumption-detail">${item.draft?`<div class="detail-block"><strong>Original draft</strong>${escape(plain(item.draft))}</div>`:''}${impact?`<div class="detail-block"><strong>Effect / treatment</strong>${escape(plain(impact))}</div>`:''}${item.risk?`<div class="detail-block"><strong>Forecast risk</strong>${escape(plain(item.risk))}</div>`:''}</div>`:''}${item.source || item.sources?`<p class="source-cite">${escape(plain(item.source || item.sources))}</p>`:''}</div></article>`;
    }).join(''):'<p class="empty">No assumptions match this search.</p>';
  }
  function defaultDecisions() {
    return [
      {id:'D1',decision:'Price a former-client retention arrangement.',timing:'After Anna’s February departure; confirm a new agreement before relying on deliveries.',cost:`10% contractor commission replaces the ordinary 5% allowance on retained work. The additional premium is ${money(sumDecision('contractPremium'))}.`,effect:`${money(sumDecision('annaExtraRevenue'))} incremental corporate revenue, with the additional delivery costs included.`,feasibility:'40% recovery of the eligible portfolio is an explicit forecast assumption. A signed agreement, named client owners and feasible delivery dates remain conditions.',source:'06 HR and Personnel Plan.docx ¶7,¶19; 03 Sales Director Plan.docx ¶5; model portfolio and delivery working calculations'},
      {id:'D2',decision:'Add four demand-backed premium open dates.',timing:'January calendar decision; February, April, June and December delivery.',cost:'€1,000 January setup plus instructors, venue, materials and 5% commission on every new event. Existing €52,500 marketing appropriation remains.',effect:`55 additional seats and ${money(sumDecision('newOpenRevenue'))} additional revenue, using historical conversion with no new-enquiry uplift.`,feasibility:'Book trainers and rooms six to eight weeks ahead. Check at least eight paid seats four weeks before each event. The February lead time and willingness to pay €600 remain risks.',source:'03 Prior Year Marketing!D7:O12; 03 Sales Director Plan.docx ¶11; 05 Operations and Trainer Plan.docx ¶10,¶14; 01 Company Background and Management Targets.docx ¶29–31'},
      {id:'D3',decision:'Allocate eligible internal instructor capacity.',timing:'€1,000 February training; allocations begin in March.',cost:'Add €150 gross allowance per internal day plus the case’s 25% employer burden (€187.50 loaded). Keep a two-day monthly reserve.',effect:`Use ${number(sumDecision('internalDays'))} internal trainer days; instructor savings of ${money(sumDecision('internalSaving'))} are already included in direct costs.`,feasibility:'Allocations are bounded by available capacity and actual workload. Confirm that the existing fixed delivery salary includes the instructor’s base pay and that the person is qualified before approval.',source:'05 Operations and Trainer Plan.docx ¶8; 06 HR and Personnel Plan.docx ¶18; model internal-day allocation schedule'}
    ];
  }
  function renderDecisions() {
    const decisions=Array.isArray(model.decisions)&&model.decisions.length?model.decisions:defaultDecisions();
    $('decision-list').innerHTML=decisions.map((item,index)=>`<article class="decision-card"><div class="decision-id"><span>${escape(item.id || `D${index+1}`)}</span><span>New management decision</span></div><h3>${escape(item.decision || item.title)}</h3>${[['Timing',item.timing || item.start],['Cost',item.cost],['Expected effect',item.effect || item.expectedEffect],['Conditions',item.feasibility || item.conditions]].filter(([,value])=>value!==undefined).map(([label,value])=>`<div class="detail-block"><strong>${label}</strong>${escape(plain(value))}</div>`).join('')}${item.source || item.sources?`<p class="source-cite">${escape(plain(item.source || item.sources))}</p>`:''}</article>`).join('');
    const fallback=`Reject the original draft. Conditionally authorise the three costed actions, subject to contractor terms, paid-seat demand, trainer bookings and internal instructor eligibility. The resulting annual forecast still loses ${money(Math.abs(annual('management').operatingProfit))}; withhold full annual budget approval and require a further evidenced plan before committing to the full year.`;
    setText('board-recommendation',model.recommendation || fallback);
    const risks=Array.isArray(model.risks)&&model.risks.length?model.risks:[
      'Demand and conversion are historical planning assumptions; future bookings are not assured.',
      'The internal instructor’s base-pay coverage and eligibility require confirmation before the savings can be relied on.',
      'External lead time, assistant capacity and the remaining annual loss require continued board review.'
    ];
    $('risk-list').innerHTML=risks.map((risk,index)=>`<div class="risk-item"><span>CONDITION ${String(index+1).padStart(2,'0')}</span>${escape(plain(risk))}</div>`).join('');
  }
  function workingTable(title,description,columns,rows,source) {
    return `<div class="working-block"><h3>${escape(title)}</h3><p>${escape(description)}</p><div class="table-scroll"><table><caption class="visually-hidden">${escape(title)}</caption><thead><tr>${columns.map(column=>`<th scope="col">${escape(typeof column==='string'?column:column.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,index)=>`<td class="${typeof cell==='string' && cell.length>25?'text-cell':''}">${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${source?`<p class="source-cite">${escape(source)}</p>`:''}</div>`;
  }
  function renderWorkings() {
    const drivers=model.drivers;
    $('driver-cards').innerHTML=[
      {value:percent(drivers.openConversion),label:'Historical enquiry-to-seat conversion'},
      {value:number(annual('corrected').openSeats),label:'Baseline open seats · seven dates'},
      {value:number(annual('management').openSeats),label:'Management open seats · eleven dates'},
      {value:number(annual('management').trainerDays),label:'Management trainer days · all delivery'}
    ].map(item=>`<div class="driver-card"><strong>${item.value}</strong><p>${item.label}</p></div>`).join('');
    const demandRows=model.monthly.map(item=>[item.month,number(item.openEnquiryBasis),number(item.openDemand),number(item.corrected.openSeats),money(item.corrected.openRevenue),number(item.decision.newOpenSeats),money(item.decision.newOpenRevenue)]);
    const capacityRows=model.monthly.map(item=>[item.month,number(item.corrected.trainerDays),number(item.management.trainerDays),number(item.decision.internalAvailable),number(item.decision.internalReserve),number(item.decision.internalDays),number(item.decision.externalDays)]);
    const staffRows=model.monthly.map(item=>[item.month,money(item.incumbentCorporate),money(item.formerPortfolioEnvelope),percent(item.ellaRamp),money(item.residualCorporateRevenue),number(item.residualCorporateDays),money(item.decision.annaExtraRevenue)]);
    let html=workingTable('Open demand and delivery dates','One enquiry cohort is used once. Existing dates are retained in the baseline; the management version adds four dates against demand in otherwise unserved months.', ['Month','Enquiry basis','Potential seats','Baseline seats','Baseline revenue','Added seats','Added revenue'],demandRows,'03 Prior Year Marketing!D7:O12; 07 Draft Operating Costs!D11:O11; 06 Draft Program Plan!B7:R32; 03 Sales Director Plan.docx ¶11. January opening pipeline and the lag are explicit assumptions.');
    html+=workingTable('Instructor workload and capacity','Required days include the entire revenue forecast. Internal allocation begins after February training and preserves a two-day reserve. External demand still needs advance booking.', ['Month','Baseline days','Management days','Internal capacity','Reserve','Allocated internal','Required external'],capacityRows,'05 Operations and Trainer Plan.docx ¶8–10; 07 Finance and Administration Notes.docx ¶5. Internal eligibility and fixed-base-pay coverage are conditions, not completed checks.');
    if(Array.isArray(model.capacity) && model.capacity.length) {
      const reservations=model.capacity.map(item=>[item.month,number(item.minimumWholeInternalDayReservations),number(item.minimumWholeExternalDayReservations),number(item.assistantPersonDays),number(item.maximumConcurrentAssistantPositions),number(item.additionalAssistantPersonDaysForConcurrentPositions),item.externalBookingDeadline || '—']);
      html+=workingTable('Whole-day reservations and assistant concurrency','Expected fractional delivery volumes require a dated schedule of whole days. Assistant positions are simultaneous roles: the additional person-days are part of the total costed assistant workload. Booking milestones are planning requirements, not confirmed reservations.', ['Month','Minimum internal days','Minimum external days','Assistant person-days','Concurrent assistant positions','Extra assistant person-days','Booking milestone'],reservations,'05 Operations and Trainer Plan.docx ¶10,¶12,¶16,¶19; 06 Draft Program Plan!G7:M32. Approximate two-month booking milestones must be replaced by exact supplier dates in the delivery calendar.');
    }
    html+=workingTable('Corporate portfolio, ramp and residual delivery','The portfolio multiplier applies to Anna while employed and to the handover/ramp reference thereafter. A company calendar floor can exceed the ramped amount and is included once. Residual revenue beyond the register is translated to delivery days and costs.', ['Month','Incumbent basis','Former portfolio','Portfolio multiplier','Residual revenue','Residual days','Added retention'],staffRows,'02 Prior Year Sales; 03 Sales Director Plan.docx ¶5–11; 06 HR and Personnel Plan.docx ¶7–19. Ramp factors and retention recovery are forecast assumptions; the calendar floor is company revenue, not Ella’s personal output.');
    if(Array.isArray(model.workingSchedules))html+=model.workingSchedules.map(schedule=>workingTable(schedule.title,schedule.description || '',schedule.columns || [],(schedule.rows || []).map(row=>Array.isArray(row)?row:Object.values(row)),plain(schedule.source || schedule.sources))).join('');
    const calendar=model.monthly.flatMap(item=>(item.calendarEvents || []).map(event=>[event.id,item.month,event.name,event.type,number(event.days),number(event.participants),money(event.revenue),`06 Draft Program Plan, row ${event.sourceRow}`]));
    html+=`<div class="working-block"><details><summary>Inspect the existing 26-event source calendar</summary>${workingTable('Existing program register','These dates are part of the existing plan. Open attendance reflects the corrected demand forecast; pencilled corporate dates are included within the broader forecast, without double counting.', ['ID','Month','Client / program','Type','Days','Participants','Revenue','Source'],calendar,'06 Draft Program Plan!B7:R32; 05 Operations and Trainer Plan.docx ¶3,¶19.')}</details></div>`;
    $('working-tables').innerHTML=html;
  }
  function renderFiles() {
    const workbook=model.workbook || {file:'ea25077-budget-review.xlsx',label:'Completed budget review workbook'};
    const file=typeof workbook==='string'?workbook:workbook.file;
    document.querySelectorAll('.workbook-link').forEach(link=>{link.setAttribute('href',file);link.setAttribute('download','');});
    setText('workbook-title',workbook.label || 'Completed budget review workbook');
    const fallback=[
      ['00','Start Here Budget Review Assignment','docx'],['01','Company Background and Management Targets','docx'],['02','Historical Results and Draft P&L Budget','xlsx'],['03','Sales Director Plan','docx'],['04','Marketing Director Plan','docx'],['05','Operations and Trainer Plan','docx'],['06','HR and Personnel Plan','docx'],['07','Finance and Administration Notes','docx']
    ].map(([id,label,type])=>({label:`${id} · ${label}`,file:`badboss-source-${id}.${type}`,type}));
    const sources=Array.isArray(model.sources)&&model.sources.length?model.sources:fallback;
    $('source-files').innerHTML=sources.map(item=>`<a class="source-file" href="${escape(item.file)}" download><span class="file-type">${escape((item.type || item.file.split('.').pop()).toUpperCase())}</span><span>${escape(item.label || item.title || item.name)}</span><span class="arrow" aria-hidden="true">↓</span></a>`).join('');
    if($('review-files') && Array.isArray(model.aiReviews)) $('review-files').innerHTML=`<div class="working-block"><h3>Independent review files</h3><p>Separate agent reviews and a management-plan challenge support the evidence review. Final decisions and figures are recorded in the completed workbook.</p><div class="source-grid">${model.aiReviews.map(item=>`<a class="source-file" href="${escape(item.file)}" download><span class="file-type">JSON</span><span>${escape(item.label)}</span><span class="arrow" aria-hidden="true">↓</span></a>`).join('')}</div></div>`;
  }
  function bindControls() {
    document.querySelectorAll('[data-budget]').forEach(button=>button.addEventListener('click',()=>renderBudget(button.dataset.budget)));
    document.querySelectorAll('[data-budget]').forEach(button=>button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const index=versions.indexOf(selectedVersion);
      const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3;
      renderBudget(versions[next]);$(`tab-${versions[next]}`).focus();
    }));
    document.querySelectorAll('[data-chart]').forEach(button=>button.addEventListener('click',()=>renderChart(button.dataset.chart)));
    $('assumption-search')?.addEventListener('input',event=>renderAssumptions(event.target.value));
  }
  async function init() {
    try {
      const response=await fetch('badboss-model.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Snapshot request failed');
      model=await response.json();
      if(!Array.isArray(model.monthly)||model.monthly.length!==12||!model.annual||versions.some(version=>!model.annual[version]))throw new Error('Incomplete snapshot');
      renderAnnualCards();renderBudget(selectedVersion);renderAnnualComparison();renderChart(selectedMeasure);renderBridges();renderAssumptions();renderDecisions();renderWorkings();renderFiles();bindControls();
      $('load-status').hidden=true;$('dashboard').hidden=false;
    } catch(error) {
      $('load-status').classList.add('error');$('load-status').textContent='The published data could not be loaded. Reload this page or download the completed budget review workbook.';
      document.querySelectorAll('.workbook-link').forEach(link=>{link.href='ea25077-budget-review.xlsx';link.setAttribute('download','');});
    }
  }
  init();
})();
