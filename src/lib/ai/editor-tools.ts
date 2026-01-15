/**
 * Editor Tool Definitions for Gemini Function Calling
 *
 * SELF-POPULATING: All block types derive from SmartBlockType enum.
 * No hardcoded type references - add a new .block.tsx and it's automatically included.
 */

import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";

// Allowed SmartBlock types for AI to insert
// export const AI_ALLOWED_BLOCK_TYPES = [] as const;

export const EDITOR_TOOLS: FunctionDeclaration[] = [
  {
    name: "addParty",
    description:
      "Create a slot (e.g., 'Landlord', 'Tenant', 'Client'). CALL THIS FIRST before creating fields for this slot.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "The display name of the slot",
        },
        color: {
          type: SchemaType.STRING,
          description: "Optional hex color for the slot.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "setPartyColor",
    description: "Update the color of an existing slot.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Name of the slot to update",
        },
        color: { type: SchemaType.STRING, description: "New hex color" },
      },
      required: ["name", "color"],
    },
  },
  {
    name: "assignSelectedBlockToParty",
    description: "Assign the currently selected SmartBlock to a slot.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slotName: { type: SchemaType.STRING, description: "Name of the slot" },
      },
      required: ["slotName"],
    },
  },
  {
    name: "insertHeading",
    description: "Insert a heading. Level 1=title, 2=section, 3=subsection.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        level: { type: SchemaType.INTEGER, description: "Heading level (1-3)" },
        text: { type: SchemaType.STRING, description: "The heading text" },
      },
      required: ["level", "text"],
    },
  },
  {
    name: "insertParagraph",
    description: "Insert a paragraph of text.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        text: { type: SchemaType.STRING, description: "The paragraph text" },
      },
      required: ["text"],
    },
  },
  {
    name: "insertList",
    description: "Insert a bullet or numbered list.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listType: {
          type: SchemaType.STRING,
          enum: ["bullet", "ordered"],
        } as any,
        items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      },
      required: ["listType", "items"],
    },
  },
  {
    name: "insertDivider",
    description: "Insert a horizontal divider.",
    parameters: { type: SchemaType.OBJECT, properties: {} as any },
  },
  {
    name: "insertBlockquote",
    description: "Insert a blockquote.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        text: { type: SchemaType.STRING, description: "Quotetext" },
      },
      required: ["text"],
    },
  },
  {
    name: "insertTable",
    description: "Insert a table.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        headers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        rows: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
      },
      required: ["headers", "rows"],
    },
  },
];

/**
 * System prompt for AI document generation
 */
export const DOCUMENT_GENERATION_SYSTEM_PROMPT = `You are HyprDoc AI, an expert legal document architect.

Your job is to generate professional documents by calling editor commands (tools).

## Document Building Tools:
1. insertHeading(level, text) - Insert headings (1=title, 2=section, 3=subsection)
2. insertParagraph(text) - Insert regular text paragraphs
3. insertList(listType, items) - Insert bullet/numbered lists
4. insertDivider() - Insert a horizontal separator
5. insertBlockquote(text) - Insert emphasized/quoted text
6. insertTable(headers, rows) - Insert data tables

## Party Management (IMPORTANT):
7. addParty(name, color?) - Create a signing slot BEFORE creating their fields
8. setPartyColor(name, color) - Change a slot's color
9. assignSelectedBlockToParty(slotName) - Assign the selected block to a slot

### Party Assignment Workflow:
1. FIRST: Call addParty for each distinct slot (e.g., "Landlord", "Tenant")

## Document Structure Guidelines:
1. Start with a level 1 heading for the document title
2. Create ALL slots FIRST before any content

Generate the document by calling the appropriate tools in sequence.`;
