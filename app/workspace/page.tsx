"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

type WorkflowMode = "human_in_the_loop" | "one_click";
type Run = { id: string; name: string; mode: WorkflowMode; status?: string };
type DocumentRecord = {
  id: string;
  filename: string;
  status: string;
  sourceBlockCount: number;
  message: string;
};
type DataQualityIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  whatFound: string;
  suggestedCorrection: string;
  confidence: "high" | "medium" | "low";
  affectedRecords: number;
};
type DecisionChoice = "approve" | "keep_raw";
type RequestState = "idle" | "creating" | "ready" | "uploading" | "uploaded" | "analysing" | "analysed" | "error";

export default function WorkspacePage() {
  const [runName, setRunName] = useState("");
  const [mode, setMode] = useState<WorkflowMode>("human_in_the_loop");
  const [run, setRun] = useState<Run | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [decisions, setDecisions] = useState<Record<string, DecisionChoice>>({});
  const [pendingDecisionId, setPendingDecisionId] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectFiles = (fileList: FileList | null) => {
    const nextFiles = Array.from(fileList ?? []);
    const unsupportedFile = nextFiles.find((file) => !isSupportedDocument(file));
    if (unsupportedFile) {
      setFiles([]);
      setError(`${unsupportedFile.name} is not a supported document. Add CSV, DOCX, PPTX, XLSX or PDF files.`);
      return;
    }
    setFiles(nextFiles);
    setError(null);
  };

  const uploadFiles = async (activeRun: Run, filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;

    setRequestState("uploading");
    const formData = new FormData();
    filesToUpload.forEach((file) => formData.append("files", file));
    const response = await fetch(`/api/runs/${activeRun.id}/documents`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(readApiError(payload, "The documents could not be uploaded."));
    }

    setDocuments(payload.documents ?? []);
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setRequestState("uploaded");
  };

  const createRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = runName.trim();
    if (!normalizedName) {
      setError("Name this intelligence run before continuing.");
      return;
    }

    setError(null);
    setRequestState("creating");
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, mode }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(readApiError(payload, "The intelligence run could not be created."));
      }

      const nextRun = payload.run as Run;
      setRun(nextRun);
      setRequestState("ready");
      await uploadFiles(nextRun, files);
    } catch (caughtError) {
      setRequestState("error");
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong. Please try again.");
    }
  };

  const uploadSelectedFiles = async () => {
    if (!run || files.length === 0) return;
    setError(null);
    try {
      await uploadFiles(run, files);
    } catch (caughtError) {
      setRequestState("error");
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong. Please try again.");
    }
  };

  const runDataQuality = async () => {
    if (!run || !documents.some((document) => document.status === "extracted")) return;

    setError(null);
    setRequestState("analysing");
    try {
      const response = await fetch(`/api/runs/${run.id}/stages/data-quality`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(readApiError(payload, "Data Quality could not be completed."));
      }

      setIssues(payload.stage?.output?.issues ?? []);
      setDecisions({});
      setRequestState("analysed");
    } catch (caughtError) {
      setRequestState("error");
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong. Please try again.");
    }
  };

  const saveDecision = async (issueId: string, choice: DecisionChoice) => {
    if (!run) return;
    setError(null);
    setPendingDecisionId(issueId);
    try {
      const response = await fetch(`/api/runs/${run.id}/stages/data-quality/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, choice }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(payload, "The review decision could not be saved."));
      setDecisions((current) => ({ ...current, [issueId]: choice }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong. Please try again.");
    } finally {
      setPendingDecisionId(null);
    }
  };

  const statusCopy = {
    idle: "Create a run to start retaining your source files and learning records.",
    creating: "Creating persistent run…",
    ready: "Run created. Add source files to begin extraction.",
    uploading: "Uploading and extracting evidence…",
    uploaded: "Upload complete. Your source is stored and ready for Data Quality.",
    analysing: "Atrix is reviewing the extracted evidence for quality gaps…",
    analysed: "Data Quality is complete. Review the traceable suggestions below.",
    error: "This step needs attention before you continue.",
  }[requestState];

  return <main className="entry-shell">
    <header className="entry-header"><Link className="brand" href="/"><span className="brand-dot" /><span>atrix</span></Link><span>FUNCTIONAL WORKSPACE</span></header>
    <section className="workspace-page functional-workspace">
      <p className="entry-eyebrow">PERSISTENT INTELLIGENCE RUN</p>
      <h1>Start with your source material.</h1>
      <p>Every file, decision and stage record in this workspace is saved to your intelligence run.</p>

      <form className="workspace-card" onSubmit={createRun}>
        <div className="workspace-card-heading"><span>01</span><div><b>Create an intelligence run</b><small>Choose the review mode and name the work you are starting.</small></div></div>
        <label className="field-label" htmlFor="run-name">Run name</label>
        <input id="run-name" className="workspace-input" value={runName} onChange={(event) => setRunName(event.target.value)} placeholder="e.g. ASCO 2026 field intelligence" disabled={Boolean(run)} maxLength={255} />
        <fieldset className="mode-fieldset" disabled={Boolean(run)}><legend>Review mode</legend>
          <label htmlFor="mode-human" aria-label="Human in the loop" className={mode === "human_in_the_loop" ? "workspace-mode selected" : "workspace-mode"}><input id="mode-human" type="radio" name="mode" value="human_in_the_loop" checked={mode === "human_in_the_loop"} onChange={() => setMode("human_in_the_loop")} /><span><b>Human in the loop</b><small>Approve each suggestion before it is used.</small></span></label>
          <label htmlFor="mode-one-click" aria-label="One click" className={mode === "one_click" ? "workspace-mode selected" : "workspace-mode"}><input id="mode-one-click" type="radio" name="mode" value="one_click" checked={mode === "one_click"} onChange={() => setMode("one_click")} /><span><b>One click</b><small>Apply rules from the approved global playbook.</small></span></label>
        </fieldset>
        {!run && <button className="continue-button workspace-action" type="submit" disabled={requestState === "creating"}>{requestState === "creating" ? "Creating run…" : "Create persistent run →"}</button>}
        {run && <div className="workspace-success" role="status"><b>Run created</b><span>{run.name} · {run.mode === "one_click" ? "One click" : "Human in the loop"}</span></div>}
      </form>

      <section className={run ? "workspace-card" : "workspace-card workspace-card-muted"} data-disabled={!run}>
        <div className="workspace-card-heading"><span>02</span><div><b>Upload source files</b><small>CSV, DOCX, PPTX and XLSX are extracted now. PDFs are stored and marked queued until their extractor is enabled.</small></div></div>
        <input ref={fileInputRef} id="source-files" className="file-input" type="file" accept=".csv,.docx,.pptx,.xlsx,.pdf" multiple disabled={!run || requestState === "uploading"} onChange={(event) => selectFiles(event.target.files)} />
        <label className="workspace-upload" htmlFor="source-files"><span>↑</span><b>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Choose source files"}</b><small>{run ? "Select one or more files to store and analyse." : "Create your run first to enable upload."}</small></label>
        {files.length > 0 && <div className="workspace-file-list">{files.map((file) => <span key={`${file.name}-${file.lastModified}`}>{file.name} <small>{formatFileSize(file.size)}</small></span>)}</div>}
        {run && files.length > 0 && <button className="continue-button workspace-action" type="button" onClick={uploadSelectedFiles} disabled={requestState === "uploading"}>{requestState === "uploading" ? "Uploading…" : "Upload files →"}</button>}
        {documents.length > 0 && <div className="workspace-documents"><b>Stored documents</b>{documents.map((document) => <div key={document.id}><span>{document.filename}</span><small>{document.status} · {document.sourceBlockCount} source block{document.sourceBlockCount === 1 ? "" : "s"}</small><small>{document.message}</small></div>)}</div>}
      </section>

      <section className={run ? "workspace-card" : "workspace-card workspace-card-muted"} data-disabled={!run}>
        <div className="workspace-card-heading"><span>03</span><div><b>Review Data Quality</b><small>Analyse extracted evidence for missing values, inconsistent labels and traceability gaps.</small></div></div>
        <button className="continue-button workspace-action" type="button" onClick={runDataQuality} disabled={!documents.some((document) => document.status === "extracted") || requestState === "analysing"}>{requestState === "analysing" ? "Running Data Quality…" : "Run Data Quality →"}</button>
        {documents.length > 0 && !documents.some((document) => document.status === "extracted") && <small className="workspace-hint">Add an extractable document before running this stage. PDFs remain queued for now.</small>}
        {issues.length > 0 && <div className="workspace-issues"><div className="workspace-issues-heading"><b>Data Quality results</b><small>{Object.keys(decisions).length} / {issues.length} reviewed</small></div>{issues.map((issue) => <article key={issue.id} className={`workspace-issue severity-${issue.severity}`}><div><span>{issue.severity}</span><b>{issue.title}</b></div><p>{issue.whatFound}</p><p><strong>Suggested correction:</strong> {issue.suggestedCorrection}</p><small>{issue.affectedRecords} affected record{issue.affectedRecords === 1 ? "" : "s"} · {issue.confidence} confidence</small><div className="workspace-decision-row"><span>{decisions[issue.id] === "approve" ? "Suggestion approved" : decisions[issue.id] === "keep_raw" ? "Raw value retained" : "Choose a review decision"}</span><div><button type="button" className={decisions[issue.id] === "approve" ? "decision approved" : "decision"} onClick={() => saveDecision(issue.id, "approve")} disabled={pendingDecisionId === issue.id}>Approve</button><button type="button" className={decisions[issue.id] === "keep_raw" ? "decision raw" : "decision"} onClick={() => saveDecision(issue.id, "keep_raw")} disabled={pendingDecisionId === issue.id}>Keep raw value</button></div></div></article>)}</div>}
      </section>

      <div className={requestState === "error" ? "workspace-status workspace-status-error" : "workspace-status"} role="status"><span>{requestState === "uploaded" || requestState === "analysed" ? "✓" : requestState === "error" ? "!" : "•"}</span><div><b>{requestState === "analysed" ? "Data Quality complete" : requestState === "uploaded" ? "Upload complete" : requestState === "creating" ? "Creating run" : requestState === "uploading" ? "Uploading source" : requestState === "analysing" ? "Analysing evidence" : "Run status"}</b><small>{error ?? statusCopy}</small></div></div>
      <Link className="workspace-back" href="/">← Back to workspace selection</Link>
    </section>
  </main>;
}

function isSupportedDocument(file: File) {
  return ["csv", "docx", "pptx", "xlsx", "pdf"].some((extension) => file.name.toLowerCase().endsWith(`.${extension}`));
}

function readApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return fallback;
  const { error } = payload as { error?: unknown };
  if (typeof error === "string") return error;
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
