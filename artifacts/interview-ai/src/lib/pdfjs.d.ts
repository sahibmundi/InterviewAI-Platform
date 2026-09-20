declare module "pdfjs-dist/build/pdf.mjs" {
  type PdfTextItem = { str?: string };

  type PdfPage = {
    getTextContent: () => Promise<{ items: PdfTextItem[] }>;
  };

  type PdfDocument = {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PdfPage>;
    destroy: () => Promise<void>;
  };

  export function getDocument(options: {
    data: Uint8Array;
    disableWorker: boolean;
  }): { promise: Promise<PdfDocument> };
}