/**
 * Stub repository for Accord templates.
 * Recreate/Populate this with actual template data as needed.
 */

export const ACCORD_TEMPLATES: { name: string; title: string }[] = [
  // Example:
  // { name: "my-template", title: "My Template" }
];

export async function fetchTemplateContent(
  name: string
): Promise<string | null> {
  console.warn(`[Stub] Fetching template content for ${name}`);
  return null;
}
