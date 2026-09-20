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

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(options: {
    data: Uint8Array;
  }): { promise: Promise<PdfDocument> };
}

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const workerUrl: string;
  export default workerUrl;
}