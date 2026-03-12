import { env } from "$env/dynamic/private";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type * as envelopeQueries from "@/convex/envelopes/queries";
import type * as liveContracts from "@/convex/liveContracts";
import {
  parseRuntimeMutationEnvelope,
  parseRuntimeMutationRequest,
  parseRuntimeProjectionEnvelope,
  type RuntimeMutationEnvelope,
  type RuntimeMutationRequest,
  type RuntimeProjectionEnvelope,
} from "@hyprdoc/domain-types";

type RuntimeGatewayInput = {
  documentId: string;
  accessToken?: string | null;
  fetch: typeof globalThis.fetch;
};

function getRuntimeApiBaseUrl() {
  return env.RUNTIME_API_BASE_URL || env.PUBLIC_RUNTIME_API_BASE_URL || null;
}

function createConvex(accessToken?: string | null) {
  const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
  if (accessToken) {
    client.setAuth(accessToken);
  }
  return client;
}

export async function loadRuntimeProjection(
  input: RuntimeGatewayInput
): Promise<RuntimeProjectionEnvelope> {
  const runtimeBaseUrl = getRuntimeApiBaseUrl();

  if (runtimeBaseUrl) {
    const response = await input.fetch(
      `${runtimeBaseUrl.replace(/\/$/, "")}/api/live-contracts/${input.documentId}`,
      {
        headers: input.accessToken
          ? { Authorization: `Bearer ${input.accessToken}` }
          : undefined,
      }
    );

    if (!response.ok) {
      throw new Error(`Runtime API returned ${response.status}`);
    }

    return parseRuntimeProjectionEnvelope(await response.json());
  }

  const convex = createConvex(input.accessToken);
  const envelopeApi = (
    api as typeof api & { "envelopes/queries": typeof envelopeQueries }
  )["envelopes/queries"];
  const projection = await convex.query(envelopeApi.getRuntimeProjection, {
    documentId: input.documentId as never,
  });

  if (!projection) {
    throw new Error("Runtime projection not found");
  }

  return parseRuntimeProjectionEnvelope({
    provider: "convex",
    fetchedAt: Date.now(),
    projection,
  });
}

export async function applyRuntimeMutation(
  input: RuntimeGatewayInput & { mutation: RuntimeMutationRequest }
): Promise<RuntimeMutationEnvelope> {
  const mutation = parseRuntimeMutationRequest(input.mutation);
  const runtimeBaseUrl = getRuntimeApiBaseUrl();

  if (runtimeBaseUrl) {
    const response = await input.fetch(
      `${runtimeBaseUrl.replace(/\/$/, "")}/api/live-contracts/${input.documentId}/mutations`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(input.accessToken
            ? { Authorization: `Bearer ${input.accessToken}` }
            : {}),
        },
        body: JSON.stringify(mutation),
      }
    );

    if (!response.ok) {
      throw new Error(`Runtime API returned ${response.status}`);
    }

    return parseRuntimeMutationEnvelope(await response.json());
  }

  const convex = createConvex(input.accessToken);
  const liveContractsApi = api as typeof api & {
    liveContracts: typeof liveContracts;
  };
  const result = await convex.mutation(
    liveContractsApi.liveContracts.applyAuthorizedBlockMutation,
    {
      documentId: input.documentId as never,
      ...mutation,
    }
  );

  return parseRuntimeMutationEnvelope({
    provider: "convex",
    fetchedAt: Date.now(),
    result: {
      documentId: String(result.documentId),
      blockId: result.blockId,
      path: result.path,
      value: result.value,
      eventHash: result.eventHash,
      stateHash: result.stateHash,
    },
  });
}
