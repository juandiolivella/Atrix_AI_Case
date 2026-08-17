"use client";

import { useRef, useState } from "react";

type WorkflowMode = "guided" | "one-click";
type Screen = "upload" | "quality" | "enrich";
type Decision = "approved" | "raw";
type UploadedFile = { id: string; name: string; size: number; source: "upload" | "example"; file?: File };

const exampleFiles = [
  { name: "Summer-MBA-Intern-TakeHome-Assignment_Instructions.docx", path: "/examples/orivus-asco-2025/Summer-MBA-Intern-TakeHome-Assignment_Instructions.docx" },
  { name: "Orivus_KITs_KIQs_ASCO_2025.pptx", path: "/examples/orivus-asco-2025/Orivus_KITs_KIQs_ASCO_2025.pptx" },
  { name: "Orivus_MSL_Meeting_Notes_2025.xlsx", path: "/examples/orivus-asco-2025/Orivus_MSL_Meeting_Notes_2025.xlsx" },
  { name: "Orivus_ASCO_2025_Field_Notes.docx", path: "/examples/orivus-asco-2025/Orivus_ASCO_2025_Field_Notes.docx" },
  { name: "Orivus_OVT209_Training_Session3_April2025.pptx", path: "/examples/orivus-asco-2025/Orivus_OVT209_Training_Session3_April2025.pptx" },
  { name: "Example_Legacy_Report_ASCO_2025_Executive_Summary.pptx", path: "/examples/orivus-asco-2025/Example_Legacy_Report_ASCO_2025_Executive_Summary.pptx" },
];

const qualityIssues = [
  { id: "asset", title: "Asset naming variants", severity: "High", source: "MSL Meeting Notes · 57 records", confidence: "High confidence", problem: "Four labels refer to the same asset: OVT-209, OVT 209, OVT209 and Orivus 209.", suggestion: "Normalize analysis labels to OVT-209 while preserving the raw source value.", evidence: ["OVT-209", "OVT 209", "OVT209", "Orivus 209"] },
  { id: "ta", title: "Missing therapeutic area", severity: "Medium", source: "MSL Meeting Notes · 12 records", confidence: "Medium confidence", problem: "The therapeutic-area field is blank for 12 meeting records.", suggestion: "Infer NSCLC only where the note context supports it; retain all other records for manual review." },
  { id: "templates", title: "Repeated / templated notes", severity: "Medium", source: "MSL Meeting Notes · 19 records", confidence: "High confidence", problem: "Six exact note templates recur across 19 records and may overstate theme volume.", suggestion: "Cluster templates for signal counting; retain every original CRM record for traceability." },
  { id: "location", title: "HCP location conflicts", severity: "Medium", source: "CRM entity data · 3 HCPs", confidence: "Medium confidence", problem: "Three HCP entities appear with conflicting location values across the source material.", suggestion: "Keep the raw locations and route these entities to manual validation before aggregation." },
  { id: "metrics", title: "Unverified clinical metrics", severity: "High", source: "Field Notes + Legacy Report", confidence: "Needs review", problem: "Clinical claims and legacy-report figures are not all traceable to a verified primary source.", suggestion: "Exclude unverified figures from the final narrative until Medical Affairs completes fact checking." },
];

const workflowSteps = ["Upload information", "Review data quality", "Enrich evidence", "Prioritize insights", "Generate presentation"];
const severityRank = { High: 0, Medium: 1, Low: 2 } as const;
const evidenceClusters = [
  { title: "ILD safety differentiation", kit: "Safety & Tolerability", sources: "CRM · Field Notes · Training", confidence: "High", detail: "18 NSCLC-relevant CRM mentions; Field Notes and training feedback corroborate monitoring interest." },
  { title: "Sequencing and placement", kit: "New: Sequencing KIT", sources: "CRM · Training", confidence: "High", detail: "16 CRM rows raise 2L versus 3L+ placement; eight MSLs asked for clearer guidance." },
  { title: "Competitive positioning", kit: "Competitive Positioning", sources: "Field Notes · CRM", confidence: "Medium", detail: "A possible equivalence narrative is emerging versus Lunexorimab; corroboration remains limited." },
];
const enrichmentSuggestions = [
  { id: "kit", title: "Map evidence to decision questions", detail: "Attach each structured signal to the relevant KIT/KIQ so downstream priorities have a clear decision owner." },
  { id: "cluster", title: "Cluster corroborating sources", detail: "Preserve source-level records while grouping recurring evidence to prevent duplicated notes from inflating signal volume." },
  { id: "trace", title: "Attach confidence and traceability", detail: "Carry source convergence, supporting records and validation status into each final insight." },
];

export default function DemoPage() {
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("guided");
  const [screen, setScreen] = useState<Screen>("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [enrichmentDecisions, setEnrichmentDecisions] = useState<Record<string, "accepted" | "edited">>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isExampleLoading, setIsExampleLoading] = useState(false);
  const [exampleLoadError, setExampleLoadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addFiles = (files: FileList | File[]) => setUploadedFiles((current) => [...current, ...Array.from(files).map((file, index) => ({ id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`, name: file.name, size: file.size, source: "upload" as const, file }))]);
  const loadExample = async () => {
    setIsExampleLoading(true);
    setExampleLoadError(null);
    try {
      const files = await Promise.all(exampleFiles.map(async ({ name, path }) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Could not load ${name}`);
        const blob = await response.blob();
        return new File([blob], name, { type: blob.type || "application/octet-stream" });
      }));
      setUploadedFiles((current) => [...current, ...files.map((file, index) => ({ id: `example-${file.name}-${file.lastModified}-${Date.now()}-${index}`, name: file.name, size: file.size, source: "example" as const, file }))]);
    } catch {
      setExampleLoadError("The example case could not be loaded. Please try again.");
    } finally {
      setIsExampleLoading(false);
    }
  };
  const reviewedCount = Object.keys(decisions).length;
  const setDecision = (issueId: string, decision: Decision) => setDecisions((current) => ({ ...current, [issueId]: decision }));
  const sortedIssues = [...qualityIssues].sort((a, b) => severityRank[a.severity as keyof typeof severityRank] - severityRank[b.severity as keyof typeof severityRank]);

  return <main className="intake-shell">
    <header className="intake-header"><div className="brand"><span className="brand-dot" /><span>atrix</span></div><div className="intake-session">INTELLIGENCE WORKSPACE</div></header>
    <div className="product-layout">
      <aside className="workflow-rail" aria-label="Five-step workflow"><span className="rail-label">WORKFLOW</span><ol>{workflowSteps.map((step, index) => {
        const activeIndex = screen === "upload" ? 0 : screen === "quality" ? 1 : 2;
        const className = index < activeIndex ? "complete-step" : index === activeIndex ? "active-step" : "upcoming-step";
        const status = className === "complete-step" ? "Complete" : className === "active-step" ? "In progress" : "Upcoming";
        return <li key={step} className={className}><span>{className === "complete-step" ? "✓" : String(index + 1).padStart(2, "0")}</span><div><b>{step}</b><small>{status}</small></div></li>;
      })}</ol><p><i /> Human review is built into every stage.</p></aside>
      <section className="intake-page">
        <section hidden={screen !== "upload"}>
          <div className="intake-intro"><h1>Bring your congress intelligence together.</h1><p>Add the materials you want to analyse. Choose how you want to work with Atrix, then we’ll build the next stage together.</p></div>
          <div className="upload-layout">
            <section className="upload-main">
              <input ref={inputRef} className="file-input" type="file" multiple onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
              <div className={isDragging ? "dropzone dragging" : "dropzone"} role="button" tabIndex={0} aria-label="Select files to upload" onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }}><span className="upload-icon">↑</span><h2>Drop files here, or browse</h2><p>Any file type is welcome — documents, slides, spreadsheets, PDFs, notes and more.</p><button type="button" className="browse-button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>Browse files</button></div>
              <div className="session-note"><span>◷</span><p><b>Files stay in this browser session.</b> They are not stored after you close or refresh this page.</p></div>
              <div className="example-row"><p>Use the six Orivus ASCO 2025 case files as a ready-made example.</p><button type="button" className="example-button" onClick={loadExample} disabled={isExampleLoading}>{isExampleLoading ? "Loading example case…" : <>Load example case <span>→</span></>}</button></div>
              {exampleLoadError && <p className="example-load-error" role="alert">{exampleLoadError}</p>}
              <section className="file-queue" aria-live="polite"><div className="queue-heading"><h2>{uploadedFiles.length ? `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} ready` : "No files added yet"}</h2>{uploadedFiles.length > 0 && <button type="button" className="clear-button" onClick={() => setUploadedFiles([])}>Clear all</button>}</div>{uploadedFiles.length ? <div className="queue-list">{uploadedFiles.map((file) => <div className="upload-row" key={file.id}><span className="file-badge">{fileExtension(file.name)}</span><span className="upload-name">{file.name}<small>{formatFileSize(file.size)} · {file.source === "example" ? "Example case" : "Uploaded"}</small></span><span className="ready-label">Ready</span><button type="button" className="remove-file" aria-label={`Remove ${file.name}`} onClick={() => setUploadedFiles((current) => current.filter((item) => item.id !== file.id))}>×</button></div>)}</div> : <div className="empty-queue">Your selected files will appear here.</div>}</section>
              {uploadedFiles.length > 0 && <button type="button" className="continue-button" onClick={() => setScreen("quality")}>Continue to data quality <span>→</span></button>}
            </section>
            <aside className="workflow-choice"><h2>How would you like Atrix to work?</h2><button type="button" className={workflowMode === "guided" ? "mode-card selected" : "mode-card"} onClick={() => setWorkflowMode("guided")}><span className="mode-radio">{workflowMode === "guided" && "✓"}</span><span><b>Human in the loop</b><small>You validate every AI suggestion before it becomes part of the final output.</small><em>Recommended for new or high-stakes runs</em></span></button><button type="button" className={workflowMode === "one-click" ? "mode-card selected" : "mode-card"} onClick={() => setWorkflowMode("one-click")}><span className="mode-radio">{workflowMode === "one-click" && "✓"}</span><span><b>One click</b><small>Atrix will automatically approve suggestions when the full workflow is ready.</small><em>Best for repeatable, trusted workflows</em></span></button><div className="workflow-note"><span>01</span><p><b>Upload complete.</b><br />Your files will be analysed in the next stage.</p></div></aside>
          </div>
        </section>

        <section className="quality-page" hidden={screen !== "quality"}>
          <div className="quality-heading"><div><p className="eyebrow">STEP 02 · HUMAN REVIEW</p><h1>Review data quality.</h1><p>Validate what Atrix found before the evidence is structured and prioritised.</p></div><button type="button" className="back-button" onClick={() => setScreen("upload")}>← Back to upload</button></div>
          <div className="run-context"><span className="context-dot" /><div><b>Orivus ASCO 2025</b><small>{uploadedFiles.length || 6} files analysed · Example case</small></div><p>New uploads use this same review workflow; this run shows the ASCO 2025 findings.</p></div>
          <div className="quality-summary"><div><span>DATA QUALITY REVIEW</span><strong>{qualityIssues.length} issues found</strong><p>Each decision stays in this browser session and can be changed at any time.</p></div><div className="review-progress"><b>{reviewedCount}<small> / {qualityIssues.length} reviewed</small></b><div><i style={{ width: `${(reviewedCount / qualityIssues.length) * 100}%` }} /></div></div></div>
          <div className="quality-list">{sortedIssues.map((issue, index) => <article className="quality-card" key={issue.id}><div className="issue-number">{String(index + 1).padStart(2, "0")}</div><div className="issue-content"><div className="issue-title"><div><span className={`severity severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span><h2>{issue.title}</h2></div><span className="confidence">{issue.confidence}</span></div><p className="issue-source">{issue.source}</p><div className="issue-columns"><div><span>WHAT ATRIX FOUND</span><p>{issue.problem}</p></div><div><span>SUGGESTED CORRECTION</span><p>{issue.suggestion}</p></div></div><button type="button" className="evidence-toggle" onClick={() => setExpandedIssue((current) => current === issue.id ? null : issue.id)}>{expandedIssue === issue.id ? "Hide evidence" : "View evidence"} <span>{expandedIssue === issue.id ? "↑" : "↓"}</span></button>{expandedIssue === issue.id && <div className="evidence-panel">{issue.evidence ? <><div className="evidence-heading"><div><span>RAW ASSET LABELS</span><b>4 variants detected</b></div><div><span>{decisions[issue.id] === "approved" ? "APPLIED NORMALIZED VALUE" : "SUGGESTED NORMALIZED VALUE"}</span><b className={decisions[issue.id] === "approved" ? "normalized applied" : "normalized"}>OVT-209</b></div></div><div className="evidence-table"><div><b>Raw asset label</b><b>{decisions[issue.id] === "approved" ? "Applied normalized value" : "Suggested normalized value"}</b></div>{issue.evidence.map((label) => <div key={label}><span>{label}</span><strong className={decisions[issue.id] === "approved" ? "highlighted-value" : ""}>OVT-209</strong></div>)}</div></> : <p><b>Source evidence:</b> {issue.source}. The proposed correction is retained for review against the original records.</p>}</div>}<div className="decision-row"><span>{decisions[issue.id] ? decisions[issue.id] === "approved" ? "Suggestion approved" : "Raw value retained" : "Choose a review decision"}</span><div><button type="button" className={decisions[issue.id] === "approved" ? "decision approved" : "decision"} onClick={() => setDecision(issue.id, "approved")}>Approve</button><button type="button" className={decisions[issue.id] === "raw" ? "decision raw" : "decision"} onClick={() => setDecision(issue.id, "raw")}>Keep raw value</button></div></div></div></article>)}</div><button type="button" className="continue-button" onClick={() => setScreen("enrich")}>Continue to enrich evidence <span>→</span></button>
        </section>
        <section className="enrich-page" hidden={screen !== "enrich"}><div className="quality-heading"><div><p className="eyebrow">STEP 03 · HUMAN REVIEW</p><h1>Enrich evidence.</h1><p>Turn validated records into decision-ready evidence, while keeping every signal traceable to its source.</p></div><button type="button" className="back-button" onClick={() => setScreen("quality")}>← Back to data quality</button></div><div className="enrich-status"><span>✓</span><div><b>5 data-quality corrections applied</b><small>Orivus ASCO 2025 · 6 source files · session-only workflow</small></div></div><section className="evidence-map"><div className="section-label"><div><span>STRUCTURED EVIDENCE MAP</span><h2>Signals ready for enrichment</h2></div><p>Representative evidence clusters are grounded in the cleaned ASCO 2025 case data.</p></div><div className="signal-grid">{evidenceClusters.map((cluster) => <article className="signal-card" key={cluster.title}><div><span className="kit-label">{cluster.kit}</span><span className="signal-confidence">{cluster.confidence} confidence</span></div><h3>{cluster.title}</h3><p>{cluster.detail}</p><small>{cluster.sources}</small></article>)}</div></section><section className="enrichment-queue"><div className="section-label"><div><span>ATRIX SUGGESTIONS</span><h2>Enrich before prioritising</h2></div><p>{Object.keys(enrichmentDecisions).length} / {enrichmentSuggestions.length} reviewed</p></div>{enrichmentSuggestions.map((suggestion, index) => <article className="enrichment-card" key={suggestion.id}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{suggestion.title}</h3><p>{suggestion.detail}</p></div><div className="enrichment-actions"><button type="button" className={enrichmentDecisions[suggestion.id] === "accepted" ? "decision approved" : "decision"} onClick={() => setEnrichmentDecisions((current) => ({ ...current, [suggestion.id]: "accepted" }))}>Accept suggestion</button><button type="button" className={enrichmentDecisions[suggestion.id] === "edited" ? "decision raw" : "decision"} onClick={() => setEnrichmentDecisions((current) => ({ ...current, [suggestion.id]: "edited" }))}>Edit</button></div></article>)}</section></section>
      </section>
    </div>
    <span hidden>Save changes · P3 — Critical / Immediate</span>
  </main>;
}

function fileExtension(name: string) { const extension = name.split(".").pop(); return extension ? extension.toUpperCase() : "FILE"; }
function formatFileSize(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
