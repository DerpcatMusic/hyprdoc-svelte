# PDF Generation Guide (src/lib/pdf/)

This directory contains the custom PDF layout engine for HyprDoc, converting Tiptap JSON to interactive PDFs.

## Core Engine: export-tiptap.ts
The engine performs a top-down linear pass over Tiptap nodes.

### Coordinate Management
- **Bottom-Up**: PDF coordinates start at (0,0) (bottom-left).
- **Cursor Tracking**: The `y` variable tracks the current vertical position, starting from `PAGE_HEIGHT - margin`.
- **ensureSpace(neededHeight)**: Validates if the next block fits.
  ```typescript
  if (y - neededHeight < margin) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - margin;
  }
  ```

## RTL & Hebrew Handling
`pdf-lib` lacks native RTL support. We implement visual reordering:
1. **Detection**: `containsRTL()` uses regex `[\u0590-\u05FF...]`.
2. **Reordering**: `visualReorderForPdfLib()` reverses character order in RTL segments.
3. **Alignment**: `isPredominantlyRTL()` triggers right-alignment via `xPos = PAGE_WIDTH - margin - lineWidth`.

## AcroForm Injection
Interactive fields are injected using `pdf-lib`'s Form API.
- **Naming**: `getFieldName()` prefixes labels with sanitized slot names (`SignerA.Field_1`) for multi-signer uniqueness.
- **Backgrounds**: Slots drive field background colors with `HIGHLIGHT_OPACITY` (0.2).
- **Complex Blocks**:
  - `ADDRESS`: Multi-field mapping to sub-AcroForm fields.
  - `DATA_GRID`: Fillable grid cells (TextFields).
  - `SIGNATURE`: Placeholder boxes (Flattened later if needed).

## Best Practices
- **Font Embedding**: Always embed fonts with Unicode support for RTL.
- **Flattening**: Use `flatten-pdf.ts` to convert forms to static content after signing.
- **Validation**: Test coordinate math on multi-page documents to avoid text overlap.
