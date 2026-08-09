"use client";

import { useRef, useState } from "react";

type WorkflowMode = "guided" | "one-click";
type UploadedFile = { id: string; name: string; size: number; source: "upload" | "example"; file?: File };

const exampleFiles = [
  ["Summer-MBA-Intern-TakeHome-Assignment Instructions.docx", 32768],
  ["Orivus_KITs_KIQs_ASCO_2025.pptx", 138240],
  ["Orivus_MSL_Meeting_Notes_2025.xlsx", 57344],
  ["Orivus_ASCO_2025_Field_Notes.docx", 28672],
  ["Orivus_OVT209_Training_Session3_April2025.pptx", 92160],
  ["Example_Legacy_Report_ASCO_2025_Executive_Summary.pptx", 49152],
];

export default function Home() {
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("guided");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    const records = Array.from(files).map((file, index) => ({ id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`, name: file.name, size: file.size, source: "upload" as const, file }));
    setUploadedFiles((current) => [...current, ...records]);
  };

  const loadExample = () => setUploadedFiles(exampleFiles.map(([name, size], index) => ({ id: `example-${index}`, name: String(name), size: Number(size), source: "example" as const })));

  return <main className="intake-shell">
    <header className="intake-header">
      <div className="brand"><span className="brand-dot" /><span>atrix <b>AI</b></span></div>
      <div className="intake-status"><span>STEP 01</span><i /> Upload information</div>
      <span className="intake-session">SESSION-ONLY WORKSPACE</span>
    </header>

    <section className="intake-page">
      <div className="intake-intro"><span className="overline orange">START A NEW INTELLIGENCE RUN</span><h1>Bring your congress intelligence together.</h1><p>Add the materials you want to analyse. Choose how you want to work with Atrix, then we’ll build the next stage together.</p></div>

      <div className="upload-layout">
        <section className="upload-main">
          <input ref={inputRef} className="file-input" type="file" multiple onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
          <div className={isDragging ? "dropzone dragging" : "dropzone"} role="button" tabIndex={0} aria-label="Select files to upload" onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }}>
            <span className="upload-icon">↑</span><h2>Drop files here, or browse</h2><p>Any file type is welcome — documents, slides, spreadsheets, PDFs, notes and more.</p><button type="button" className="browse-button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>Browse files</button>
          </div>
          <div className="session-note"><span>◷</span><p><b>Files stay in this browser session.</b> They are not stored after you close or refresh this page.</p></div>
          <div className="example-row"><div><span className="overline">TRY THE WORKFLOW</span><p>Use the six Orivus ASCO 2025 case files as a ready-made example.</p></div><button type="button" className="example-button" onClick={loadExample}>Load example case</button></div>
          <section className="file-queue" aria-live="polite"><div className="queue-heading"><div><span className="overline">FILES IN THIS RUN</span><h2>{uploadedFiles.length ? `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} ready` : "No files added yet"}</h2></div>{uploadedFiles.length > 0 && <button type="button" className="clear-button" onClick={() => setUploadedFiles([])}>Clear all</button>}</div>{uploadedFiles.length ? <div className="queue-list">{uploadedFiles.map((file) => <div className="upload-row" key={file.id}><span className="file-badge">{fileExtension(file.name)}</span><span className="upload-name">{file.name}<small>{formatFileSize(file.size)} · {file.source === "example" ? "Example case" : "Uploaded"}</small></span><span className="ready-label">Ready</span><button type="button" className="remove-file" aria-label={`Remove ${file.name}`} onClick={() => setUploadedFiles((current) => current.filter((item) => item.id !== file.id))}>×</button></div>)}</div> : <div className="empty-queue">Your selected files will appear here.</div>}</section>
        </section>

        <aside className="workflow-choice"><span className="overline">CHOOSE YOUR WORKFLOW</span><h2>How would you like Atrix to work?</h2><button type="button" className={workflowMode === "guided" ? "mode-card selected" : "mode-card"} onClick={() => setWorkflowMode("guided")}><span className="mode-radio">{workflowMode === "guided" && "✓"}</span><span><b>Human in the loop</b><small>You validate every AI suggestion before it becomes part of the final output.</small><em>Recommended for new or high-stakes runs</em></span></button><button type="button" className={workflowMode === "one-click" ? "mode-card selected" : "mode-card"} onClick={() => setWorkflowMode("one-click")}><span className="mode-radio">{workflowMode === "one-click" && "✓"}</span><span><b>One click</b><small>Atrix will automatically approve suggestions when the full workflow is ready.</small><em>Best for repeatable, trusted workflows</em></span></button><div className="workflow-note"><span>01</span><p><b>Upload complete.</b><br />The next stage will be added together after you validate this intake experience.</p></div></aside>
      </div>
    </section>
  </main>;
}

function fileExtension(name: string) { const extension = name.split(".").pop(); return extension ? extension.toUpperCase() : "FILE"; }
function formatFileSize(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
