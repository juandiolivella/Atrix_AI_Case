import Link from "next/link";

export default function WorkspacePage() {
  return <main className="entry-shell">
    <header className="entry-header"><Link className="brand" href="/"><span className="brand-dot" /><span>atrix</span></Link><span>FUNCTIONAL WORKSPACE</span></header>
    <section className="workspace-page">
      <p className="entry-eyebrow">PERSISTENT INTELLIGENCE RUN</p>
      <h1>Start a functional workflow.</h1>
      <p>Create a run to upload source documents, review real findings and retain the decisions and Markdown learning record from every stage.</p>
      <div className="workspace-status"><span>01</span><div><b>Workspace ready</b><small>Run creation and document processing are being connected in the next setup step.</small></div></div>
      <Link className="workspace-back" href="/">← Back to workspace selection</Link>
    </section>
  </main>;
}
