import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFParseResult, TiptapDocument } from "./pdf-types";
import { extractTextFromPage, groupIntoLines, mergeLineToString } from "./text-extractor";

/**
 * Configure PDF.js worker path.
 */
export function configurePDFWorker(workerSrc: string) {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
}

/**
 * Parse a PDF file and convert it to a Tiptap document.
 */
export async function parsePDFToTiptap(file: File): Promise<PDFParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const document: TiptapDocument = {
      type: "doc",
      content: [],
    };

    let textBlockCount = 0;
    const slots: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textItems = await extractTextFromPage(page, pageNum);
      const lines = groupIntoLines(textItems);

      for (const line of lines) {
        const text = mergeLineToString(line);
        if (text.trim()) {
          document.content.push({
            type: "paragraph",
            content: [{ type: "text", text }],
          });
          textBlockCount++;

          // Detection of slots like {{name}}
          const matches = text.match(/{{([^}]+)}}/g);
          if (matches) {
            matches.forEach(m => {
              const slot = m.replace(/[{}]/g, "").trim();
              if (!slots.includes(slot)) slots.push(slot);
            });
          }
        }
      }
    }

    return {
      success: true,
      document,
      metadata: {
        pageCount: pdf.numPages,
        fieldCount: 0, // AcroForm detection could be added here
        textBlockCount,
        slots,
      },
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      document: { type: "doc", content: [] },
      metadata: { pageCount: 0, fieldCount: 0, textBlockCount: 0, slots: [] },
      errors: [error.message],
    };
  }
}
