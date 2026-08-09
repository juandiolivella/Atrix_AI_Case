"use client";

import { useMemo, useState } from "react";

type View = "run" | "quality" | "evidence" | "priorities" | "deck";
type Category = "Safety" | "Competition" | "Sequencing" | "Access";
type Priority = "P3" | "P2" | "P1";

const navigation: { id: View; label: string; eyebrow: string }[] = [
  { id: "run", label: "Report run", eyebrow: "01" },
  { id: "quality", label: "Data quality", eyebrow: "02" },
  { id: "evidence", label: "Evidence explorer", eyebrow: "03" },
  { id: "priorities", label: "Priority workspace", eyebrow: "04" },
  { id: "deck", label: "Deck handoff", eyebrow: "05" },
];

const sources = [
  ["Assignment Instructions", "DOCX", "Reference"],
  ["KITs & KIQs", "PPTX", "Taxonomy"],
  ["MSL Meeting Notes", "XLSX", "103 interactions"],
  ["ASCO Field Notes", "DOCX", "Qualitative"],
  ["OVT-209 Training Session", "PPTX", "Context"],
  ["Legacy Report", "PPTX", "Benchmark"],
];

const qualityIssues = [
  { id: "asset", title: "Asset naming variants", detail: "57 OVT-209 records use four product labels.", resolution: "Normalize to OVT-209; retain raw value.", confidence: "High" },
  { id: "ta", title: "Missing therapeutic area", detail: "12 CRM records have a blank therapeutic area.", resolution: "Suggest NSCLC only when note context supports it.", confidence: "Medium" },
  { id: "dup", title: "Repeated note templates", detail: "19 records include six exact repeated note texts.", resolution: "Cluster for review; preserve source rows.", confidence: "High" },
  { id: "entity", title: "HCP location conflicts", detail: "Three HCP entities appear with inconsistent locations.", resolution: "Flag for entity review; do not auto-merge.", confidence: "Medium" },
  { id: "metric", title: "Unverified clinical metrics", detail: "Field and legacy reports contain unsupported comparisons.", resolution: "Route to Medical Affairs fact-sheet validation.", confidence: "High" },
];

const evidence = [
  { category: "Safety" as Category, title: "ILD monitoring is a field-opening conversation", metric: "13 interactions · 11 HCPs", quote: "The monitoring protocol would make a real difference in clinic.", source: "CRM + Field Notes + Training", confidence: "High", geography: "US-led" },
  { category: "Competition" as Category, title: "An ‘equivalent ADCs’ narrative is forming", metric: "7 interactions · 6 HCPs", quote: "Without a clear distinction, the products will be viewed as broadly equivalent.", source: "CRM + Field Notes", confidence: "Medium", geography: "US" },
  { category: "Sequencing" as Category, title: "Placement is the main unanswered question", metric: "12 interactions · 10 HCPs", quote: "Where does OVT-209 sit against docetaxel and later-line options?", source: "CRM + Training", confidence: "High", geography: "US-led" },
  { category: "Access" as Category, title: "Readiness signals extend beyond the US", metric: "12 interactions · 11 HCPs", quote: "Regional pathway requirements need to be visible early.", source: "CRM", confidence: "Medium", geography: "US, EUCAN, APAC" },
];

const priorities: { level: Priority; category: Category; title: string; action: string; owner: string; timeframe: string; confidence: string }[] = [
  { level: "P3", category: "Safety", title: "Make ILD monitoring an execution advantage", action: "Ship the Medical-approved monitoring pocket card and follow up with Dr. Martinez.", owner: "Medical Affairs + MSL", timeframe: "0–30 days", confidence: "High" },
  { level: "P3", category: "Competition", title: "Protect differentiation vs. Lunexorimab", action: "Approve the evidence-bounded differentiation narrative; avoid cross-trial superiority claims.", owner: "Medical Strategy", timeframe: "0–30 days", confidence: "Medium" },
  { level: "P2", category: "Sequencing", title: "Close the positioning gap", action: "Create 2L vs. 3L+ vs. docetaxel placement FAQ and define evidence gaps.", owner: "Medical Strategy", timeframe: "30–90 days", confidence: "High" },
  { level: "P2", category: "Sequencing", title: "Validate EGFR wild-type signal", action: "Request a formal, non-powered subgroup analysis from Biostatistics.", owner: "Biostatistics", timeframe: "30–90 days", confidence: "Low–Medium" },
  { level: "P2", category: "Access", title: "Track market-readiness pull", action: "Create a regional appendix and validate PMDA / MFDS requests as hypotheses.", owner: "Market Access", timeframe: "30–90 days", confidence: "Medium" },
  { level: "P2", category: "Sequencing", title: "Follow MD Anderson feasibility", action: "Confirm Dr. Okonkwo follow-up and document decision criteria.", owner: "MSL Lead", timeframe: "30–90 days", confidence: "Medium" },
  { level: "P1", category: "Safety", title: "Monitor ILD rechallenge questions", action: "Centralize into the ILD FAQ rather than open a standalone workstream.", owner: "Medical Information", timeframe: "Monitor", confidence: "Medium" },
  { level: "P1", category: "Competition", title: "Monitor durability conversation", action: "De-duplicate templated notes before interpreting signal volume.", owner: "Insights Ops", timeframe: "Monitor", confidence: "Low" },
  { level: "P1", category: "Access", title: "Watch infusion-format interest", action: "Reassess if field volume grows after future congresses.", owner: "Commercial Insights", timeframe: "Monitor", confidence: "Low–Medium" },
];

const deckSlides = [
  ["01", "The ASCO signal", "One clear opportunity: turn safety readiness into field confidence."],
  ["02", "What needs action now", "Two P3 actions to protect execution and differentiation."],
  ["03", "Safety", "ILD monitoring can become a tangible field advantage."],
  ["04", "Competition", "Address equivalence risk with approved, evidence-bounded messaging."],
  ["05", "Sequencing & access", "Build placement clarity and validate regional-readiness signals."],
  ["06", "90-day roadmap", "Owners, timeframes and open evidence requests."],
];

export default function Home() {
  const [view, setView] = useState<View>("run");
  const [approved, setApproved] = useState<string[]>([]);
  const [category, setCategory] = useState<Category | "All">("All");
  const [deckReady, setDeckReady] = useState(false);
  const visibleEvidence = useMemo(() => category === "All" ? evidence : evidence.filter((item) => item.category === category), [category]);
  const remaining = qualityIssues.length - approved.length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-dot" /> <span>atrix <b>AI</b></span></div>
        <div className="case-label">CONGRESS INTELLIGENCE</div>
        <nav aria-label="Workflow stages">
          {navigation.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}><span>{item.eyebrow}</span>{item.label}</button>)}
        </nav>
        <div className="sidebar-footer"><span className="status-dot" /> Report run active<br /><small>Orivus · ASCO 2025</small></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div><span className="overline">ORIVUS / ASCO 2025</span><h1>{navigation.find((item) => item.id === view)?.label}</h1></div><div className="topbar-right"><span className="live-chip">● Live workspace</span><button className="avatar" aria-label="User profile">JL</button></div></header>

        {view === "run" && <section className="page-content">
          <div className="hero"><div><span className="overline orange">REPORT RUN / READY FOR REVIEW</span><h2>From unstructured congress signal to an action-ready story.</h2><p>Six case assets are mapped to the Orivus intelligence taxonomy. Start with quality, then let evidence drive the executive narrative.</p></div><div className="hero-number"><strong>06</strong><span>connected<br />source assets</span></div></div>
          <div className="stat-grid"><Stat number="103" label="CRM interactions" /><Stat number="48" label="Named HCPs" /><Stat number="20" label="MSLs represented" /><Stat number="04" label="Signal categories" /></div>
          <section className="panel"><div className="panel-heading"><div><span className="overline">SOURCE INVENTORY</span><h3>Connected input assets</h3></div><button className="text-button" onClick={() => setView("quality")}>Review data quality →</button></div><div className="source-list">{sources.map(([name, type, role]) => <div className="source-row" key={name}><span className="file-type">{type}</span><span className="source-name">{name}</span><span className="source-role">{role}</span><span className="source-check">✓</span></div>)}</div></section>
        </section>}

        {view === "quality" && <section className="page-content">
          <div className="page-intro"><div><span className="overline orange">HUMAN-IN-THE-LOOP REVIEW</span><h2>Make evidence clean before making it persuasive.</h2></div><div className="review-count"><strong>{approved.length}</strong> / {qualityIssues.length} approved</div></div>
          <div className="quality-progress"><span style={{ width: `${(approved.length / qualityIssues.length) * 100}%` }} /></div>
          <p className="supporting">{remaining ? `${remaining} items still need a decision. AI suggestions never overwrite raw source values.` : "All suggestions reviewed. The raw source values remain available for traceability."}</p>
          <div className="issue-grid">{qualityIssues.map((issue, i) => { const done = approved.includes(issue.id); return <article className={done ? "issue-card approved" : "issue-card"} key={issue.id}><div className="issue-top"><span className="issue-index">0{i + 1}</span><span className={`confidence ${issue.confidence.toLowerCase()}`}>{issue.confidence} confidence</span></div><h3>{issue.title}</h3><p>{issue.detail}</p><div className="resolution"><span>AI SUGGESTION</span>{issue.resolution}</div><button className={done ? "approve-button done" : "approve-button"} onClick={() => setApproved((current) => done ? current.filter((id) => id !== issue.id) : [...current, issue.id])}>{done ? "Approved ✓" : "Approve suggested normalization"}</button></article>})}</div>
        </section>}

        {view === "evidence" && <section className="page-content">
          <div className="page-intro"><div><span className="overline orange">TRACEABLE INTELLIGENCE</span><h2>See the signal, source and certainty in one place.</h2></div><div className="evidence-total">4 <span>priority<br />themes</span></div></div>
          <div className="filter-row" role="group" aria-label="Filter evidence by category">{(["All", "Safety", "Competition", "Sequencing", "Access"] as const).map((item) => <button key={item} className={category === item ? "filter active-filter" : "filter"} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div className="evidence-grid">{visibleEvidence.map((item) => <article className="evidence-card" key={item.category}><div className="card-meta"><span className={`category-tag ${item.category.toLowerCase()}`}>{item.category}</span><span className="confidence">{item.confidence} confidence</span></div><h3>{item.title}</h3><strong className="metric">{item.metric}</strong><blockquote>“{item.quote}”</blockquote><footer><span>{item.source}</span><span>{item.geography}</span></footer></article>)}</div>
        </section>}

        {view === "priorities" && <section className="page-content">
          <div className="page-intro"><div><span className="overline orange">ACTION FRAMEWORK</span><h2>Priority is urgency. Category is the nature of the signal.</h2></div><div className="legend"><span><i className="p3-dot" /> P3 immediate</span><span><i className="p2-dot" /> P2 near-term</span><span><i className="p1-dot" /> P1 monitor</span></div></div>
          <div className="priority-columns">{(["P3", "P2", "P1"] as Priority[]).map((level) => <section className={`priority-column ${level.toLowerCase()}`} key={level}><header><div><span>{level}</span><h3>{level === "P3" ? "Critical / immediate" : level === "P2" ? "Important / near-term" : "Monitor / lower priority"}</h3></div><b>{priorities.filter((item) => item.level === level).length}</b></header>{priorities.filter((item) => item.level === level).map((item) => <article className="priority-card" key={item.title}><div className="card-meta"><span className={`category-tag ${item.category.toLowerCase()}`}>{item.category}</span><span className="confidence">{item.confidence}</span></div><h4>{item.title}</h4><p>{item.action}</p><dl><div><dt>OWNER</dt><dd>{item.owner}</dd></div><div><dt>WHEN</dt><dd>{item.timeframe}</dd></div></dl></article>)}</section>)}</div>
        </section>}

        {view === "deck" && <section className="page-content">
          <div className="page-intro"><div><span className="overline orange">EXECUTIVE HANDOFF</span><h2>Translate validated signals into a decision-ready executive deck.</h2><p className="supporting">The handoff follows your approved Atrix AI / Orivus narrative structure: magnitude, evidence, implications and an actionable next step.</p></div><button className={deckReady ? "generate-button ready" : "generate-button"} onClick={() => setDeckReady(true)}>{deckReady ? "Deck ready for review ✓" : "Generate executive deck"}</button></div>
          <section className="deck-canvas"><div className="deck-cover"><span>ATRIX AI</span><h3>ASCO 2025<br />Executive insights</h3><p>Orivus · OVT-209</p></div><div className="slide-grid">{deckSlides.map(([number, title, detail]) => <article className="slide-thumb" key={number}><span>{number}</span><h4>{title}</h4><p>{detail}</p><div className="slide-line" /></article>)}</div></section>
          <div className="handoff-note"><span>✓</span><p><b>Traceability is preserved.</b> Each final slide retains its evidence category, source set, confidence label and review status.</p></div>
        </section>}
      </section>
    </main>
  );
}

function Stat({ number, label }: { number: string; label: string }) { return <div className="stat"><strong>{number}</strong><span>{label}</span></div>; }
