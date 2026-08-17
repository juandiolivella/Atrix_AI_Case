import PptxGenJS from "pptxgenjs";

import type { PrioritizedInsight } from "./priorities";

const COLORS = {
  ink: "101014",
  muted: "6F6C78",
  purple: "6D28F5",
  purplePale: "F1ECFF",
  mint: "B9F4D0",
  panel: "F8F7FA",
  line: "E7E4EB",
  white: "FFFFFF",
  p3: "DF3B56",
  p2: "D78B16",
  p1: "5D8A6F",
} as const;

export type ExecutiveReadoutInput = {
  runId: string;
  runName: string;
  insights: PrioritizedInsight[];
};

function clip(value: string, max = 180) {
  const compact = value.replaceAll(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1)}…`;
}

function priorityColor(priority: PrioritizedInsight["priority"]) {
  return priority === "P3" ? COLORS.p3 : priority === "P2" ? COLORS.p2 : COLORS.p1;
}

function addFooter(slide: PptxGenJS.Slide, page: number) {
  slide.addText("ATRiX  /  EXECUTIVE READOUT", { x: 0.55, y: 7.08, w: 4.8, h: 0.18, fontFace: "Aptos", fontSize: 8, color: COLORS.muted, charSpacing: 1.2, margin: 0 });
  slide.addText(String(page).padStart(2, "0"), { x: 12.05, y: 7.04, w: 0.7, h: 0.2, fontFace: "Aptos", fontSize: 8, color: COLORS.muted, align: "right", margin: 0 });
}

function addTitle(slide: PptxGenJS.Slide, title: string, eyebrow: string) {
  slide.addText(eyebrow.toUpperCase(), { x: 0.55, y: 0.42, w: 5.9, h: 0.22, fontFace: "Aptos", fontSize: 10, bold: true, color: COLORS.purple, charSpacing: 1.1, margin: 0 });
  slide.addText(title, { x: 0.55, y: 0.78, w: 12, h: 0.56, fontFace: "Aptos Display", fontSize: 28, bold: true, color: COLORS.ink, breakLine: false, margin: 0 });
}

function addInsightCard(slide: PptxGenJS.Slide, insight: PrioritizedInsight, x: number, y: number, w: number, h: number) {
  slide.addShape("roundRect", { x, y, w, h, rectRadius: 0.08, fill: { color: COLORS.panel }, line: { color: COLORS.line, pt: 1 } });
  slide.addShape("roundRect", { x: x + 0.22, y: y + 0.22, w: 0.62, h: 0.3, rectRadius: 0.06, fill: { color: priorityColor(insight.priority) }, line: { color: priorityColor(insight.priority) } });
  slide.addText(insight.priority, { x: x + 0.22, y: y + 0.27, w: 0.62, h: 0.12, align: "center", fontFace: "Aptos", fontSize: 8, bold: true, color: COLORS.white, margin: 0 });
  slide.addText(clip(insight.title, 70), { x: x + 0.22, y: y + 0.7, w: w - 0.44, h: 0.62, fontFace: "Aptos", fontSize: 16, bold: true, color: COLORS.ink, fit: "shrink", valign: "middle", margin: 0 });
  slide.addText(`ACTION  ${clip(insight.action, 120)}`, { x: x + 0.22, y: y + 1.42, w: w - 0.44, h: 0.55, fontFace: "Aptos", fontSize: 10, color: COLORS.ink, breakLine: false, fit: "shrink", margin: 0 });
  slide.addText(`OWNER  ${clip(insight.owner, 42)}   ·   ${insight.confidence.toUpperCase()} CONFIDENCE`, { x: x + 0.22, y: y + h - 0.36, w: w - 0.44, h: 0.15, fontFace: "Aptos", fontSize: 8, bold: true, color: COLORS.muted, charSpacing: 0.4, margin: 0 });
}

export function executiveReadoutFilename(runName: string) {
  const stem = runName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || "atrix";
  return `${stem.slice(0, 80)}-executive-readout.pptx`;
}

/** Builds a self-contained, generic deck from persisted priority outputs only. */
export async function buildExecutiveReadoutDeck(input: ExecutiveReadoutInput): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Atrix AI";
  pptx.company = "Atrix AI";
  pptx.subject = "Executive intelligence readout";
  pptx.title = `${input.runName} — Executive Readout`;
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
  };

  const generated = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date());
  const sources = [...new Set(input.insights.flatMap((insight) => insight.evidence.map((evidence) => evidence.fileName)))];

  const title = pptx.addSlide();
  title.background = { color: COLORS.ink };
  title.addShape("arc", { x: 9.2, y: -0.9, w: 5.0, h: 5.0, rotate: 23, line: { color: COLORS.purple, pt: 2, transparency: 25 } });
  title.addShape("ellipse", { x: 10.92, y: 4.9, w: 0.18, h: 0.18, fill: { color: COLORS.mint }, line: { color: COLORS.mint } });
  title.addText("atrix", { x: 0.58, y: 0.5, w: 2.0, h: 0.35, fontFace: "Aptos Display", fontSize: 20, bold: true, color: COLORS.white, margin: 0 });
  title.addText("EXECUTIVE READOUT", { x: 0.6, y: 2.0, w: 5.2, h: 0.3, fontFace: "Aptos", fontSize: 12, bold: true, color: COLORS.mint, charSpacing: 1.4, margin: 0 });
  title.addText(clip(input.runName, 78), { x: 0.56, y: 2.45, w: 8.1, h: 1.3, fontFace: "Aptos Display", fontSize: 36, bold: true, color: COLORS.white, fit: "shrink", margin: 0 });
  title.addText(`${input.insights.length} prioritized insights  ·  ${sources.length} source file${sources.length === 1 ? "" : "s"}  ·  ${generated}`, { x: 0.6, y: 4.22, w: 7.4, h: 0.3, fontFace: "Aptos", fontSize: 14, color: "D9D5E5", margin: 0 });
  title.addText("Decision-ready intelligence, with every recommendation traceable to its source.", { x: 0.6, y: 5.73, w: 6.4, h: 0.45, fontFace: "Aptos", fontSize: 14, color: "D9D5E5", margin: 0 });
  title.addText("01", { x: 12.1, y: 7.04, w: 0.65, h: 0.18, fontFace: "Aptos", fontSize: 8, color: "D9D5E5", align: "right", margin: 0 });

  const counts = { P3: 0, P2: 0, P1: 0 };
  input.insights.forEach((insight) => { counts[insight.priority] += 1; });
  const overview = pptx.addSlide();
  addTitle(overview, "Priority overview", "Decision landscape");
  overview.addText("Recommendations are ordered by action horizon: P3 is immediate, P2 is near-term and P1 is monitored.", { x: 0.55, y: 1.55, w: 8.9, h: 0.3, fontFace: "Aptos", fontSize: 14, color: COLORS.muted, margin: 0 });
  (["P3", "P2", "P1"] as const).forEach((priority, index) => {
    const x = 0.55 + index * 4.18;
    overview.addShape("roundRect", { x, y: 2.28, w: 3.72, h: 2.62, rectRadius: 0.08, fill: { color: COLORS.panel }, line: { color: COLORS.line, pt: 1 } });
    overview.addShape("rect", { x, y: 2.28, w: 3.72, h: 0.1, fill: { color: priorityColor(priority) }, line: { color: priorityColor(priority) } });
    overview.addText(priority, { x: x + 0.28, y: 2.66, w: 0.7, h: 0.34, fontFace: "Aptos", fontSize: 18, bold: true, color: priorityColor(priority), margin: 0 });
    overview.addText(String(counts[priority]), { x: x + 0.28, y: 3.14, w: 1.4, h: 0.68, fontFace: "Aptos Display", fontSize: 42, bold: true, color: COLORS.ink, margin: 0 });
    overview.addText(priority === "P3" ? "Critical / immediate\nAct within days" : priority === "P2" ? "Important / near-term\nAct within weeks" : "Monitor / lower priority\nTrack and revisit", { x: x + 0.28, y: 4.13, w: 2.9, h: 0.48, fontFace: "Aptos", fontSize: 12, color: COLORS.muted, breakLine: false, margin: 0 });
  });
  addFooter(overview, 2);

  const detail = pptx.addSlide();
  addTitle(detail, "Key insights and next actions", "What requires attention");
  const featured = input.insights.slice(0, 4);
  featured.forEach((insight, index) => addInsightCard(detail, insight, 0.55 + (index % 2) * 6.3, 1.62 + Math.floor(index / 2) * 2.45, 5.95, 2.12));
  if (featured.length === 0) detail.addText("No priorities were available for this readout.", { x: 0.55, y: 2.1, w: 8, h: 0.4, fontFace: "Aptos", fontSize: 18, color: COLORS.muted });
  addFooter(detail, 3);

  const traceability = pptx.addSlide();
  addTitle(traceability, "Traceability and source coverage", "Evidence base");
  traceability.addText("Every priority in this readout is retained with its supporting source record, locator and original excerpt in the intelligence run.", { x: 0.55, y: 1.55, w: 11.6, h: 0.36, fontFace: "Aptos", fontSize: 14, color: COLORS.muted, margin: 0 });
  traceability.addShape("roundRect", { x: 0.55, y: 2.28, w: 4.05, h: 3.72, rectRadius: 0.08, fill: { color: COLORS.purplePale }, line: { color: "DED4FF", pt: 1 } });
  traceability.addText(String(input.insights.length), { x: 0.88, y: 2.74, w: 2.5, h: 0.78, fontFace: "Aptos Display", fontSize: 48, bold: true, color: COLORS.purple, margin: 0 });
  traceability.addText("prioritized insights\nwith retained evidence", { x: 0.9, y: 3.73, w: 2.7, h: 0.5, fontFace: "Aptos", fontSize: 15, bold: true, color: COLORS.ink, margin: 0 });
  traceability.addText("Source evidence is retained privately in the workflow run for review and audit.", { x: 0.9, y: 5.2, w: 3.0, h: 0.42, fontFace: "Aptos", fontSize: 10, color: COLORS.muted, margin: 0 });
  traceability.addText("SOURCE FILES", { x: 5.05, y: 2.42, w: 3.3, h: 0.2, fontFace: "Aptos", fontSize: 10, bold: true, color: COLORS.purple, charSpacing: 1.0, margin: 0 });
  sources.slice(0, 8).forEach((source, index) => {
    const y = 2.9 + index * 0.38;
    traceability.addShape("ellipse", { x: 5.08, y: y + 0.07, w: 0.1, h: 0.1, fill: { color: COLORS.mint }, line: { color: COLORS.mint } });
    traceability.addText(clip(source, 64), { x: 5.35, y, w: 6.6, h: 0.22, fontFace: "Aptos", fontSize: 12, color: COLORS.ink, margin: 0 });
  });
  if (sources.length > 8) traceability.addText(`+ ${sources.length - 8} additional source files`, { x: 5.35, y: 5.98, w: 4.2, h: 0.2, fontFace: "Aptos", fontSize: 11, italic: true, color: COLORS.muted, margin: 0 });
  addFooter(traceability, 4);

  const output = await pptx.write({ outputType: "nodebuffer", compression: true });
  if (output instanceof Uint8Array) return Buffer.from(output);
  if (output instanceof ArrayBuffer) return Buffer.from(new Uint8Array(output));
  throw new Error("PptxGenJS did not return binary PowerPoint content.");
}
