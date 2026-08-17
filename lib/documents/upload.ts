import {
  extractDocument,
  validateDocumentFormat,
  type SourceBlock,
} from "./extraction.ts";

type UploadFile = Pick<File, "arrayBuffer" | "name" | "size" | "type">;

export type StoredDocument = {
  id: string;
  filename: string;
  status: "uploaded" | "extracting" | "extracted" | "failed";
  sourceBlockCount: number;
  message: string;
};

type StorageClient = {
  put: (
    key: string,
    body: Blob,
    options: { access: "private"; contentType: string },
  ) => Promise<unknown>;
};

type DocumentRecord = {
  id: string;
  runId: string;
  blobKey: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  status: "uploaded" | "extracting" | "extracted" | "failed";
  metadata: Record<string, unknown>;
};

type SourceBlockRecord = {
  documentId: string;
  locator: string;
  ordinal: number;
  text: string;
  metadata: Record<string, unknown>;
};

type PersistenceClient = {
  insertDocument: (document: DocumentRecord) => Promise<unknown>;
  updateDocument: (
    id: string,
    patch: Pick<DocumentRecord, "status"> & { errorMessage?: string | null },
  ) => Promise<unknown>;
  insertSourceBlocks: (blocks: SourceBlockRecord[]) => Promise<unknown>;
};

export type UploadDocumentsRequest = {
  runId: string;
  files: UploadFile[];
  storage: StorageClient;
  persistence: PersistenceClient;
  createDocumentId?: () => string;
};

/**
 * Stores upload originals privately, then persists extraction results that can
 * be traced back to their document and exact source location.
 */
export async function uploadDocuments(
  request: UploadDocumentsRequest,
): Promise<StoredDocument[]> {
  if (request.files.length === 0) {
    throw new Error("At least one file is required.");
  }

  for (const file of request.files) {
    const validation = validateDocumentFormat(file.name);
    if (!validation.ok) {
      throw new Error(validation.reason);
    }
  }

  return Promise.all(
    request.files.map((file) => uploadDocument(request, file)),
  );
}

async function uploadDocument(
  request: UploadDocumentsRequest,
  file: UploadFile,
): Promise<StoredDocument> {
  const id = request.createDocumentId?.() ?? crypto.randomUUID();
  const blobKey = buildBlobKey(request.runId, id, file.name);
  const content = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  await request.storage.put(blobKey, new Blob([content], { type: mimeType }), {
    access: "private",
    contentType: mimeType,
  });

  await request.persistence.insertDocument({
    id,
    runId: request.runId,
    blobKey,
    filename: file.name,
    mimeType,
    byteSize: file.size,
    status: "extracting",
    metadata: {},
  });

  const extraction = await extractDocument({
    documentId: id,
    filename: file.name,
    content,
    mimeType,
  });
  const status = toDocumentStatus(extraction.status);

  await request.persistence.updateDocument(id, {
    status,
    errorMessage: extraction.status === "failed" ? extraction.message : null,
  });

  if (extraction.sourceBlocks.length > 0) {
    await request.persistence.insertSourceBlocks(
      extraction.sourceBlocks.map(toSourceBlockRecord),
    );
  }

  return {
    id,
    filename: file.name,
    status,
    sourceBlockCount: extraction.sourceBlocks.length,
    message: extraction.message,
  };
}

function buildBlobKey(runId: string, documentId: string, filename: string): string {
  return `runs/${runId}/documents/${documentId}/${encodeURIComponent(filename)}`;
}

function toDocumentStatus(status: "completed" | "queued" | "failed"): StoredDocument["status"] {
  if (status === "completed") return "extracted";
  if (status === "failed") return "failed";
  return "uploaded";
}

function toSourceBlockRecord(block: SourceBlock, index: number): SourceBlockRecord {
  return {
    documentId: block.documentId,
    locator: JSON.stringify(block.locator),
    ordinal: index + 1,
    text: block.text,
    metadata: { kind: block.kind },
  };
}
