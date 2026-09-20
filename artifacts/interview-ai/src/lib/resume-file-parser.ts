import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MAX_RESUME_FILE_BYTES = 10 * 1024 * 1024;

export const RESUME_FILE_ACCEPT =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function normalizeResumeText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractResumeText(file: File): Promise<string> {
  if (file.size > MAX_RESUME_FILE_BYTES) {
    throw new Error("That file is larger than 10 MB. Choose a smaller resume file.");
  }

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".txt") || file.type === "text/plain") {
    return normalizeResumeText(await file.text());
  }

  if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const document = await pdfjs
      .getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
      })
      .promise;

    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str ?? "").join(" ");
        pages.push(pageText);
      }
      return normalizeResumeText(pages.join("\n\n"));
    } finally {
      await document.destroy();
    }
  }

  if (
    fileName.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    return normalizeResumeText(result.value);
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT resume.");
}
