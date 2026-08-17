export type DocumentFormat = "csv" | "pdf" | "docx" | "pptx" | "xlsx";
export type ExtractionStatus = "completed" | "queued" | "failed";

export type SourceBlock = {
  id: string;
  documentId: string;
  kind: "table-row" | "text";
  locator: { row?: number; page?: number; slide?: number; sheet?: string };
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

  if (validation.format !== "csv") {
    return {
      status: "queued",
      format: validation.format,
      sourceBlocks: [],
      message: `${validation.format.toUpperCase()} extraction is queued because its extractor is not available yet.`,
    };
  }

  try {
    const sourceBlocks = extractCsvSourceBlocks(request);
    return {
      status: "completed",
      format: "csv",
      sourceBlocks,
      message: `Extracted ${sourceBlocks.length} traceable CSV row${sourceBlocks.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      status: "failed",
      format: "csv",
      sourceBlocks: [],
      message: error instanceof Error ? error.message : "CSV extraction failed.",
    };
  }
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
