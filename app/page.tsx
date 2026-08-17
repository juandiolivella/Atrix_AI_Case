const choices = [
  {
    href: "/demo",
    eyebrow: "DEMO",
    title: "Explore the ASCO 2025 demo.",
    description: "Walk through the completed Orivus intelligence workflow using the six case files.",
    action: "Explore demo",
    detail: "Pre-populated · no account required",
  },
  {
    href: "/workspace",
    eyebrow: "FUNCTIONAL WORKFLOW",
    title: "Analyse your own documents.",
    description: "Create a persistent intelligence run. Your files, decisions, evidence and learning records stay connected.",
    action: "Start functional workflow",
    detail: "Persistent runs · traceable sources",
  },
];

export default function Home() {
  return <main className="entry-shell">
    <header className="entry-header"><div className="brand"><span className="brand-dot" /><span>atrix</span></div><span>INTELLIGENCE WORKSPACE</span></header>
    <section className="entry-page">
      <p className="entry-eyebrow">WELCOME TO ATRIX</p>
      <h1>Choose your workspace.</h1>
      <p className="entry-intro">Explore the completed case study or start a persistent workflow with your own source materials.</p>
      <div className="entry-choices">
        {choices.map((choice) => <Link className="entry-card" href={choice.href} key={choice.href}>
          <span className="entry-card-eyebrow">{choice.eyebrow}</span>
          <h2>{choice.title}</h2>
          <p>{choice.description}</p>
          <span className="entry-card-detail">{choice.detail}</span>
          <strong>{choice.action} <span>→</span></strong>
        </Link>)}
      </div>
    </section>
  </main>;
}
import Link from "next/link";
