export const RESERVED_VARIABLE_NAMES = [
  "today",
  "now",
  "document_title",
  "document_created",
  "signer_name",
  "signer_email",
  "signer_role",
] as const;

export type ReservedVariableName = (typeof RESERVED_VARIABLE_NAMES)[number];

export const isReservedVariableName = (name: string): boolean => {
  return (
    RESERVED_VARIABLE_NAMES.includes(name.toLowerCase() as any) ||
    /^signer_\d+_(name|email|role)$/.test(name.toLowerCase())
  );
};
