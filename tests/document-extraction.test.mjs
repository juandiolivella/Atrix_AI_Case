import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";

import {
  extractDocument,
  validateDocumentFormat,
} from "../lib/documents/extraction.ts";

const PDF_WITH_TWO_PAGES = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Length 47 >>
stream
BT /F1 18 Tf 72 720 Td (First page evidence) Tj ET
endstream
endobj
7 0 obj
<< /Length 48 >>
stream
BT /F1 18 Tf 72 720 Td (Second page evidence) Tj ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

test("extractDocument creates traceable source blocks from CSV rows", async () => {
  const result = await extractDocument({
    documentId: "meeting-notes",
    filename: "meeting-notes.csv",
    content: "asset,hcp,note\nOVT-209,Dr. Martinez,ILD protocol requested\n",
  });

  assert.equal(result.status, "completed");
  assert.equal(result.sourceBlocks.length, 1);
  assert.deepEqual(result.sourceBlocks[0], {
    id: "meeting-notes:row-2",
    documentId: "meeting-notes",
    kind: "table-row",
    locator: { row: 2 },
    text: "asset: OVT-209\nhcp: Dr. Martinez\nnote: ILD protocol requested",
  });
});

test("a malformed Office document fails without creating untraceable evidence", async () => {
  const result = await extractDocument({
    documentId: "field-notes",
    filename: "field-notes.docx",
    content: new Uint8Array([1, 2, 3]),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.format, "docx");
  assert.equal(result.sourceBlocks.length, 0);
  assert.match(result.message, /valid Office Open XML archive/i);
});

test("unknown formats fail validation with a clear reason", () => {
  assert.deepEqual(validateDocumentFormat("notes.txt"), {
    ok: false,
    reason: "Unsupported file format: .txt. Supported formats are CSV, PDF, DOCX, PPTX, and XLSX.",
  });
});

test("extractDocument creates traceable paragraphs from a DOCX document", async () => {
  const result = await extractDocument({
    documentId: "field-notes",
    filename: "field-notes.docx",
    content: await zipContent({
      "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="urn:w"><w:body><w:p><w:r><w:t>ILD safety signal</w:t></w:r></w:p><w:p><w:r><w:t>Follow up with Dr. Martinez</w:t></w:r></w:p></w:body></w:document>`,
    }),
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.sourceBlocks.map(({ id, kind, locator, text }) => ({ id, kind, locator, text })), [
    {
      id: "field-notes:paragraph-1",
      kind: "text",
      locator: { paragraph: 1 },
      text: "ILD safety signal",
    },
    {
      id: "field-notes:paragraph-2",
      kind: "text",
      locator: { paragraph: 2 },
      text: "Follow up with Dr. Martinez",
    },
  ]);
});

test("extractDocument creates one traceable block for each PPTX slide", async () => {
  const result = await extractDocument({
    documentId: "training",
    filename: "training.pptx",
    content: await zipContent({
      "ppt/slides/slide2.xml": `<?xml version="1.0"?><p:sld xmlns:a="urn:a"><a:t>Second slide</a:t></p:sld>`,
      "ppt/slides/slide1.xml": `<?xml version="1.0"?><p:sld xmlns:a="urn:a"><a:t>Safety</a:t><a:t>discussion</a:t></p:sld>`,
    }),
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.sourceBlocks.map(({ id, kind, locator, text }) => ({ id, kind, locator, text })), [
    { id: "training:slide-1", kind: "text", locator: { slide: 1 }, text: "Safety discussion" },
    { id: "training:slide-2", kind: "text", locator: { slide: 2 }, text: "Second slide" },
  ]);
});

test("extractDocument creates traceable data rows from each XLSX sheet", async () => {
  const result = await extractDocument({
    documentId: "crm",
    filename: "crm.xlsx",
    content: await zipContent({
      "xl/workbook.xml": `<?xml version="1.0"?><workbook xmlns:r="urn:r"><sheets><sheet name="CRM" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
      "xl/sharedStrings.xml": `<?xml version="1.0"?><sst><si><t>Asset</t></si><si><t>Note</t></si><si><t>OVT-209</t></si><si><t>ILD protocol requested</t></si></sst>`,
      "xl/worksheets/sheet1.xml": `<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row></sheetData></worksheet>`,
    }),
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.sourceBlocks.map(({ id, kind, locator, text }) => ({ id, kind, locator, text })), [
    {
      id: "crm:sheet-CRM:row-2",
      kind: "table-row",
      locator: { sheet: "CRM", row: 2 },
      text: "Asset: OVT-209\nNote: ILD protocol requested",
    },
  ]);
});

test("a malformed PDF fails without creating untraceable evidence", async () => {
  const result = await extractDocument({
    documentId: "report",
    filename: "report.pdf",
    content: new Uint8Array([37, 80, 68, 70]),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.sourceBlocks.length, 0);
});

test("extractDocument creates a traceable text block for every non-empty PDF page", async () => {
  const result = await extractDocument({
    documentId: "pdf-1",
    filename: "field-notes.pdf",
    content: new TextEncoder().encode(PDF_WITH_TWO_PAGES),
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(result.sourceBlocks.map((block) => block.locator.page), [1, 2]);
  assert.match(result.sourceBlocks[0].text, /First page evidence/);
  assert.match(result.sourceBlocks[1].text, /Second page evidence/);
});

async function zipContent(entries) {
  const zip = new JSZip();
  for (const [path, value] of Object.entries(entries)) {
    zip.file(path, value);
  }
  return zip.generateAsync({ type: "uint8array" });
}
