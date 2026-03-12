import {
  parseRuntimeMutationEnvelope,
  parseRuntimeProjectionEnvelope,
  type RuntimeMutationEnvelope,
  type RuntimeMutationRequest,
  type RuntimeProjectionEnvelope,
} from "@hyprdoc/domain-types";

export async function getRuntimeProjection(documentId: string) {
  const response = await fetch(`/api/runtime/contracts/${documentId}`);
  if (!response.ok) {
    throw new Error(`Failed to load runtime projection (${response.status})`);
  }

  return parseRuntimeProjectionEnvelope(await response.json());
}

export async function postRuntimeMutation(
  documentId: string,
  mutation: RuntimeMutationRequest
) {
  const response = await fetch(`/api/runtime/contracts/${documentId}/mutations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(mutation),
  });

  if (!response.ok) {
    throw new Error(`Failed to apply runtime mutation (${response.status})`);
  }

  return parseRuntimeMutationEnvelope(await response.json());
}
