import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Downloads a Tiptap document as a PDF.
 * 
 * Simple implementation for now, primarily handling text paragraphs.
 * In a real-world scenario, this would handle complex layouts, styles, and images.
 */
export async function downloadTiptapAsPdf(
  doc: any, // Tiptap JSON
  filename = "document.pdf"
) {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 12;
  const margin = 50;
  let yPosition = height - margin;

  const content = doc.content || [];

  for (const block of content) {
    if (block.type === "paragraph" || block.type === "heading") {
      const text = block.content?.map((c: any) => c.text).join("") || "";
      
      if (text.trim()) {
        const lines = wrapText(text, width - 2 * margin, fontSize, timesRomanFont);
        
        for (const line of lines) {
          if (yPosition < margin + fontSize) {
            page = pdfDoc.addPage();
            yPosition = height - margin;
          }
          
          page.drawText(line, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
          });
          
          yPosition -= fontSize * 1.5;
        }
        
        yPosition -= fontSize; // Gap between blocks
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = font.widthOfTextAtSize(`${currentLine} ${word}`, fontSize);
    if (width < maxWidth) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}
