import JSZip from "jszip";

export type DocumentFormat = "csv" | "pdf" | "docx" | "pptx" | "xlsx";
export type ExtractionStatus = "completed" | "queued" | "failed";

export type SourceBlock = {
  id: string;
  documentId: string;
  kind: "table-row" | "text";
  locator: { row?: number; page?: number; slide?: number; sheet?: string; paragraph?: number };
  text: string;
};

export type ExtractionRequest = {
  documentId: string;
  filename: string;
  content: string | Uint8Array;
  mimeType?: string;
};

export type ExtractionResult = {
  status: ExtractionStatus;
  format: DocumentFormat | null;
  sourceBlocks: SourceBlock[];
  message: string;
};

export type FormatValidation =
  | { ok: true; format: DocumentFormat }
  | { ok: false; reason: string };

const SUPPORTED_FORMATS: Record<string, DocumentFormat> = {
  csv: "csv",
  pdf: "pdf",
  docx: "docx",
  pptx: "pptx",
  xlsx: "xlsx",
};

const SUPPORTED_FORMAT_LIST = "CSV, PDF, DOCX, PPTX, and XLSX";

export function validateDocumentFormat(filename: string): FormatValidation {
  const extension = filename.split(".").pop()?.trim().toLowerCase();
  const format = extension ? SUPPORTED_FORMATS[extension] : undefined;

  if (format) {
    return { ok: true, format };
  }

  const reportedExtension = extension ? `.${extension}` : "no file extension";
  return {
    ok: false,
    reason: `Unsupported file format: ${reportedExtension}. Supported formats are ${SUPPORTED_FORMAT_LIST}.`,
  };
}

export async function extractDocument(
  request: ExtractionRequest,
): Promise<ExtractionResult> {
  const validation = validateDocumentFormat(request.filename);

  if (!validation.ok) {
    return {
      status: "failed",
      format: null,
      sourceBlocks: [],
      message: validation.reason,
    };
  }

  try {
    const sourceBlocks = await extractSourceBlocks(validation.format, request);
    return {
      status: "completed",
      format: validation.format,
      sourceBlocks,
      message: `Extracted ${sourceBlocks.length} traceable ${validation.format.toUpperCase()} source block${sourceBlocks.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      status: "failed",
      format: validation.format,
      sourceBlocks: [],
      message: error instanceof Error ? error.message : `${validation.format.toUpperCase()} extraction failed.`,
    };
  }
}

async function extractSourceBlocks(
  format: DocumentFormat,
  request: ExtractionRequest,
): Promise<SourceBlock[]> {
  switch (format) {
    case "csv":
      return extractCsvSourceBlocks(request);
    case "docx":
      return extractDocxSourceBlocks(request);
    case "pptx":
      return extractPptxSourceBlocks(request);
    case "xlsx":
      return extractXlsxSourceBlocks(request);
    case "pdf":
      return extractPdfSourceBlocks(request);
  }
}

async function extractPdfSourceBlocks(request: ExtractionRequest): Promise<SourceBlock[]> {
  const data = typeof request.content === "string"
    ? new TextEncoder().encode(request.content)
    : request.content;
  const canvas = await import("@napi-rs/canvas");
  Object.assign(globalThis, {
    DOMMatrix: canvas.DOMMatrix,
    ImageData: canvas.ImageData,
    Path2D: canvas.Path2D,
  });
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await getDocument({ data }).promise;
  const blocks: SourceBlock[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .flatMap((item) => "str" in item && typeof item.str === "string" ? [item.str.trim()] : [])
      .filter(Boolean)
      .join(" ");
    if (text) {
      blocks.push({
        id: `${request.documentId}:page-${pageNumber}`,
        documentId: request.documentId,
        kind: "text",
        locator: { page: pageNumber },
        text,
      });
    }
  }
  return blocks;
}

async function extractDocxSourceBlocks(request: ExtractionRequest): Promise<SourceBlock[]> {
  const zip = await openOfficeZip(request, "DOCX");
  const documentXml = await readZipText(zip, "word/document.xml", "DOCX");
  const paragraphs = findXmlElements(documentXml, "w:p")
    .map((paragraph) => extractTextElements(paragraph.content))
    .filter(Boolean);

  return paragraphs.map((text, index) => ({
    id: `${request.documentId}:paragraph-${index + 1}`,
    documentId: request.documentId,
    kind: "text",
    locator: { paragraph: index + 1 },
    text,
  }));
}

async function extractPptxSourceBlocks(request: ExtractionRequest): Promise<SourceBlock[]> {
  const zip = await openOfficeZip(request, "PPTX");
  const slidePaths = Object.keys(zip.files)
    .map((path) => ({ path, match: /^ppt\/slides\/slide(\d+)\.xml$/i.exec(path) }))
    .filter((entry): entry is { path: string; match: RegExpExecArray } => entry.match !== null)
    .sort((left, right) => Number(left.match[1]) - Number(right.match[1]));

  const blocks = await Promise.all(slidePaths.map(async ({ path, match }) => {
    const slide = Number(match[1]);
    const text = extractTextElements(await readZipText(zip, path, "PPTX"));
    return text ? {
      id: `${request.documentId}:slide-${slide}`,
      documentId: request.documentId,
      kind: "text" as const,
      locator: { slide },
      text,
    } : null;
  }));

  return blocks.filter((block): block is NonNullable<typeof block> => block !== null);
}

async function extractXlsxSourceBlocks(request: ExtractionRequest): Promise<SourceBlock[]> {
  const zip = await openOfficeZip(request, "XLSX");
  const workbook = await readZipText(zip, "xl/workbook.xml", "XLSX");
  const relationships = await readZipText(zip, "xl/_rels/workbook.xml.rels", "XLSX");
  const sharedStrings = zip.file("xl/sharedStrings.xml")
    ? findXmlElements(await readZipText(zip, "xl/sharedStrings.xml", "XLSX"), "si").map((item) => extractTextElements(item.content))
    : [];
  const targets = new Map(
    findOpeningTags(relationships, "Relationship").map((openingTag) => {
      const attributes = parseXmlAttributes(openingTag);
      return [attributes.Id, attributes.Target];
    }),
  );
  const sheets = findOpeningTags(workbook, "sheet").map(parseXmlAttributes);
  const sourceBlocks: SourceBlock[] = [];

  for (const sheet of sheets) {
    const name = sheet.name;
    const relationshipId = sheet["r:id"];
    const target = relationshipId ? targets.get(relationshipId) : undefined;
    if (!name || !target) {
      continue;
    }
    const worksheetPath = normaliseWorksheetPath(target);
    const rows = parseXlsxRows(await readZipText(zip, worksheetPath, "XLSX"), sharedStrings);
    if (rows.length < 2) {
      continue;
    }
    const headers = rows[0].values;
    for (const row of rows.slice(1)) {
      if (row.values.every((value) => value === "")) {
        continue;
      }
      const text = row.values.map((value, index) => `${headers[index] || `column_${index + 1}`}: ${value}`).join("\n");
      sourceBlocks.push({
        id: `${request.documentId}:sheet-${safeId(name)}:row-${row.row}`,
        documentId: request.documentId,
        kind: "table-row",
        locator: { sheet: name, row: row.row },
        text,
      });
    }
  }
  return sourceBlocks;
}

function extractCsvSourceBlocks(request: ExtractionRequest): SourceBlock[] {
  const raw = typeof request.content === "string"
    ? request.content
    : new TextDecoder("utf-8", { fatal: true }).decode(request.content);
  const rows = parseCsv(raw.replace(/^\uFEFF/, ""));

  if (rows.length === 0) {
    return [];
  }

  const [headers, ...records] = rows;
  if (headers.length === 0 || headers.every((header) => header.trim() === "")) {
    throw new Error("CSV extraction failed: the header row is empty.");
  }

  return records
    .filter((record) => record.some((value) => value.trim() !== ""))
    .map((record, index) => {
      const row = index + 2;
      const text = headers
        .map((header, columnIndex) => `${header.trim() || `column_${columnIndex + 1}`}: ${record[columnIndex] ?? ""}`)
        .join("\n");

      return {
        id: `${request.documentId}:row-${row}`,
        documentId: request.documentId,
        kind: "table-row" as const,
        locator: { row },
        text,
      };
    });
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && character === ",") {
      row.push(value);
      value = "";
      continue;
    }

    if (!inQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += character;
  }

  if (inQuotes) {
    throw new Error("CSV extraction failed: an unterminated quoted value was found.");
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

async function openOfficeZip(request: ExtractionRequest, format: "DOCX" | "PPTX" | "XLSX"): Promise<JSZip> {
  if (typeof request.content === "string") {
    throw new Error(`${format} extraction failed: expected binary file content.`);
  }
  try {
    return await JSZip.loadAsync(request.content);
  } catch {
    throw new Error(`${format} extraction failed: file is not a valid Office Open XML archive.`);
  }
}

async function readZipText(zip: JSZip, path: string, format: "DOCX" | "PPTX" | "XLSX"): Promise<string> {
  const file = zip.file(path);
  if (!file) {
    throw new Error(`${format} extraction failed: missing required file ${path}.`);
  }
  return file.async("text");
}

type XmlElement = { openingTag: string; content: string };

function findXmlElements(xml: string, localName: string): XmlElement[] {
  const escapedName = localName.replace(/:/g, "\\:");
  const expression = new RegExp(`<${escapedName}\\b([^>]*)>([\\s\\S]*?)<\\/${escapedName}>`, "g");
  return Array.from(xml.matchAll(expression), (match) => ({
    openingTag: `<${localName}${match[1]}>`,
    content: match[2],
  }));
}

function findOpeningTags(xml: string, localName: string): string[] {
  const escapedName = localName.replace(/:/g, "\\:");
  const expression = new RegExp(`<${escapedName}\\b[^>]*\\/?\\s*>`, "g");
  return Array.from(xml.matchAll(expression), (match) => match[0]);
}

function extractTextElements(xml: string): string {
  const texts = findXmlElements(xml, "w:t").concat(findXmlElements(xml, "a:t"));
  const genericTexts = texts.length > 0 ? texts : findXmlElements(xml, "t");
  return genericTexts.map((element) => decodeXml(element.content).trim()).filter(Boolean).join(" ").trim();
}

function parseXmlAttributes(openingTag: string): Record<string, string> {
  return Object.fromEntries(
    Array.from(openingTag.matchAll(/([:\w-]+)=(?:"([^"]*)"|'([^']*)')/g), (match) => [match[1], decodeXml(match[2] ?? match[3] ?? "")]),
  );
}

function parseXlsxRows(xml: string, sharedStrings: string[]): Array<{ row: number; values: string[] }> {
  return findXmlElements(xml, "row").map((rowElement, rowIndex) => {
    const attributes = parseXmlAttributes(rowElement.openingTag);
    const values: string[] = [];
    const cells = findXmlElements(rowElement.content, "c");
    for (const cell of cells) {
      const cellAttributes = parseXmlAttributes(cell.openingTag);
      const column = columnIndex(cellAttributes.r);
      const rawValue = extractTextElements(cell.content) || findXmlElements(cell.content, "v").map((value) => decodeXml(value.content)).join("");
      values[column] = cellAttributes.t === "s" ? (sharedStrings[Number(rawValue)] ?? "") : rawValue;
    }
    return {
      row: Number(attributes.r) || rowIndex + 1,
      values: Array.from({ length: Math.max(values.length, 1) }, (_, index) => values[index] ?? ""),
    };
  });
}

function columnIndex(reference: string | undefined): number {
  const letters = reference?.match(/[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) {
    return 0;
  }
  return [...letters].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function normaliseWorksheetPath(target: string): string {
  return `xl/${target.replace(/^\/+/, "").replace(/^\.\//, "")}`;
}

function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, "-");
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
