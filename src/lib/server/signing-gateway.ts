import { env } from "$env/dynamic/private";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  parseAssignSignerRequest,
  parseAssignSignerResponse,
  parseCompleteSignerSessionResponse,
  parseCreateSigningSessionRequest,
  parseCreateSigningSessionResponse,
  parseRecordSignatureRequest,
  parseRecordSignatureResponse,
  parseRecordSignerViewRequest,
  parseRecordSignerViewResponse,
  parseSaveFieldValueRequest,
  parseSaveFieldValueResponse,
  parseSendAuthChallengeRequest,
  parseSendAuthChallengeResponse,
  parseSignerPortalResponse,
  parseSigningSessionSummary,
  parseStartSigningSessionResponse,
  parseVerifyAuthChallengeRequest,
  parseVerifyAuthChallengeResponse,
  type AssignSignerRequest,
  type AssignSignerResponse,
  type CompleteSignerSessionResponse,
  type CreateSigningSessionRequest,
  type CreateSigningSessionResponse,
  type RecordSignatureRequest,
  type RecordSignatureResponse,
  type RecordSignerViewRequest,
  type RecordSignerViewResponse,
  type SaveFieldValueRequest,
  type SaveFieldValueResponse,
  type SendAuthChallengeRequest,
  type SendAuthChallengeResponse,
  type SignerPortalExpired,
  type SignerPortalView,
  type SigningSessionSummary,
  type StartSigningSessionResponse,
  type VerifyAuthChallengeRequest,
  type VerifyAuthChallengeResponse,
} from "@hyprdoc/domain-types";

type SigningGatewayInput = {
  accessToken?: string | null;
  fetch: typeof globalThis.fetch;
};

function getSigningApiBaseUrl() {
  return (
    env.SIGNING_API_BASE_URL ||
    env.RUNTIME_API_BASE_URL ||
    env.PUBLIC_SIGNING_API_BASE_URL ||
    env.PUBLIC_RUNTIME_API_BASE_URL ||
    null
  );
}

function createConvex(accessToken?: string | null) {
  const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
  if (accessToken) {
    client.setAuth(accessToken);
  }
  return client;
}

async function requestSigningApi<T>(
  input: SigningGatewayInput,
  path: string,
  init: RequestInit,
  parser: (value: unknown) => T
) {
  const signingBaseUrl = getSigningApiBaseUrl();
  if (!signingBaseUrl) {
    throw new Error("Signing API base URL is not configured");
  }

  const response = await input.fetch(`${signingBaseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(input.accessToken ? { Authorization: `Bearer ${input.accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Signing API returned ${response.status}`);
  }

  return parser(await response.json());
}

export async function createSigningSessionInConvex(
  input: SigningGatewayInput & { request: CreateSigningSessionRequest }
): Promise<CreateSigningSessionResponse> {
  const request = parseCreateSigningSessionRequest(input.request);
  const convex = createConvex(input.accessToken);
  return parseCreateSigningSessionResponse(
    await convex.mutation(api.signing.createSigningSession, {
      documentId: request.documentId as never,
      signingOrder: request.signingOrder,
      expiresAt: request.expiresAt,
      reminderIntervalHours: request.reminderIntervalHours,
      settings: request.settings,
    })
  );
}

export async function createSigningSession(
  input: SigningGatewayInput & { request: CreateSigningSessionRequest }
): Promise<CreateSigningSessionResponse> {
  const request = parseCreateSigningSessionRequest(input.request);
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      "/api/signing/sessions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
      parseCreateSigningSessionResponse
    );
  }

  return createSigningSessionInConvex({ ...input, request });
}

export async function assignSignerInConvex(
  input: SigningGatewayInput & { sessionId: string; request: AssignSignerRequest }
): Promise<AssignSignerResponse> {
  const request = parseAssignSignerRequest(input.request);
  const convex = createConvex(input.accessToken);
  return parseAssignSignerResponse(
    await convex.mutation(api.signing.assignSigner, {
      sessionId: input.sessionId as never,
      ...request,
    })
  );
}

export async function assignSigner(
  input: SigningGatewayInput & { sessionId: string; request: AssignSignerRequest }
): Promise<AssignSignerResponse> {
  const request = parseAssignSignerRequest(input.request);
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/sessions/${encodeURIComponent(input.sessionId)}/assignments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
      parseAssignSignerResponse
    );
  }

  return assignSignerInConvex({ ...input, request });
}

export async function startSigningSessionInConvex(
  input: SigningGatewayInput & { sessionId: string }
): Promise<StartSigningSessionResponse> {
  const convex = createConvex(input.accessToken);
  return parseStartSigningSessionResponse(
    await convex.mutation(api.signing.startSigningSession, {
      sessionId: input.sessionId as never,
    })
  );
}

export async function startSigningSession(
  input: SigningGatewayInput & { sessionId: string }
): Promise<StartSigningSessionResponse> {
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/sessions/${encodeURIComponent(input.sessionId)}/start`,
      {
        method: "POST",
      },
      parseStartSigningSessionResponse
    );
  }

  return startSigningSessionInConvex(input);
}

export async function loadSigningSessionFromConvex(
  input: SigningGatewayInput & { sessionId: string }
): Promise<SigningSessionSummary> {
  const convex = createConvex(input.accessToken);
  const response = await convex.query(api.signing.getSigningSession, {
    sessionId: input.sessionId as never,
  });

  if (!response) {
    throw new Error("Signing session not found");
  }

  return parseSigningSessionSummary(response);
}

export async function loadSigningSession(
  input: SigningGatewayInput & { sessionId: string }
): Promise<SigningSessionSummary> {
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/sessions/${encodeURIComponent(input.sessionId)}`,
      { method: "GET" },
      parseSigningSessionSummary
    );
  }

  return loadSigningSessionFromConvex(input);
}

export async function loadSignerPortalFromConvex(
  input: SigningGatewayInput & { portalAccessToken: string }
): Promise<SignerPortalView | SignerPortalExpired> {
  const convex = createConvex(input.accessToken);
  const response = await convex.query(api.signing.getSignerView, {
    accessToken: input.portalAccessToken,
  });

  if (!response) {
    throw new Error("Signer portal not found");
  }

  return parseSignerPortalResponse(response);
}

export async function loadSignerPortal(
  input: SigningGatewayInput & { portalAccessToken: string }
): Promise<SignerPortalView | SignerPortalExpired> {
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/portal/${encodeURIComponent(input.portalAccessToken)}`,
      { method: "GET" },
      parseSignerPortalResponse
    );
  }

  return loadSignerPortalFromConvex(input);
}

export async function recordSignerViewInConvex(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    request: RecordSignerViewRequest;
  }
): Promise<RecordSignerViewResponse> {
  const request = parseRecordSignerViewRequest(input.request);
  const convex = createConvex(input.accessToken);
  return parseRecordSignerViewResponse(
    await convex.mutation(api.signing.recordSignerView, {
      accessToken: input.portalAccessToken,
      ...request,
    })
  );
}

export async function recordSignerView(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    request: RecordSignerViewRequest;
  }
): Promise<RecordSignerViewResponse> {
  const request = parseRecordSignerViewRequest(input.request);
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/portal/${encodeURIComponent(input.portalAccessToken)}/view`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
      parseRecordSignerViewResponse
    );
  }

  return recordSignerViewInConvex({ ...input, request });
}

export async function sendAuthChallengeInConvex(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    request: SendAuthChallengeRequest;
  }
): Promise<SendAuthChallengeResponse> {
  const request = parseSendAuthChallengeRequest(input.request);
  const convex = createConvex(input.accessToken);
  return parseSendAuthChallengeResponse(
    await convex.mutation(api.signing.sendAuthChallenge, {
      accessToken: input.portalAccessToken,
      ...request,
    })
  );
}

export async function sendAuthChallenge(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    request: SendAuthChallengeRequest;
  }
): Promise<SendAuthChallengeResponse> {
  const request = parseSendAuthChallengeRequest(input.request);
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/portal/${encodeURIComponent(input.portalAccessToken)}/challenges`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
      parseSendAuthChallengeResponse
    );
  }

  return sendAuthChallengeInConvex({ ...input, request });
}

export async function verifyAuthChallengeInConvex(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    challengeId: string;
    request: VerifyAuthChallengeRequest;
  }
): Promise<VerifyAuthChallengeResponse> {
  const request = parseVerifyAuthChallengeRequest(input.request);
  const convex = createConvex(input.accessToken);
  return parseVerifyAuthChallengeResponse(
    await convex.mutation(api.signing.verifyAuthChallenge, {
      accessToken: input.portalAccessToken,
      challengeId: input.challengeId as never,
      ...request,
    })
  );
}

export async function verifyAuthChallenge(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    challengeId: string;
    request: VerifyAuthChallengeRequest;
  }
): Promise<VerifyAuthChallengeResponse> {
  const request = parseVerifyAuthChallengeRequest(input.request);
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/portal/${encodeURIComponent(input.portalAccessToken)}/challenges/${encodeURIComponent(input.challengeId)}/verify`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
      parseVerifyAuthChallengeResponse
    );
  }

  return verifyAuthChallengeInConvex({ ...input, request });
}

export async function saveFieldValueInConvex(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    request: SaveFieldValueRequest;
  }
): Promise<SaveFieldValueResponse> {
  const request = parseSaveFieldValueRequest(input.request);
  const convex = createConvex(input.accessToken);
  return parseSaveFieldValueResponse(
    await convex.mutation(api.signing.saveFieldValue, {
      accessToken: input.portalAccessToken,
      ...request,
    })
  );
}

export async function saveFieldValue(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    request: SaveFieldValueRequest;
  }
): Promise<SaveFieldValueResponse> {
  const request = parseSaveFieldValueRequest(input.request);
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/portal/${encodeURIComponent(input.portalAccessToken)}/field-values`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
      parseSaveFieldValueResponse
    );
  }

  return saveFieldValueInConvex({ ...input, request });
}

export async function recordSignatureInConvex(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    request: RecordSignatureRequest;
  }
): Promise<RecordSignatureResponse> {
  const request = parseRecordSignatureRequest(input.request);
  const convex = createConvex(input.accessToken);
  return parseRecordSignatureResponse(
    await convex.mutation(api.signing.recordSignature, {
      accessToken: input.portalAccessToken,
      ...request,
    })
  );
}

export async function recordSignature(
  input: SigningGatewayInput & {
    portalAccessToken: string;
    request: RecordSignatureRequest;
  }
): Promise<RecordSignatureResponse> {
  const request = parseRecordSignatureRequest(input.request);
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/portal/${encodeURIComponent(input.portalAccessToken)}/signatures`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
      parseRecordSignatureResponse
    );
  }

  return recordSignatureInConvex({ ...input, request });
}

export async function completeSignerSessionInConvex(
  input: SigningGatewayInput & { portalAccessToken: string }
): Promise<CompleteSignerSessionResponse> {
  const convex = createConvex(input.accessToken);
  return parseCompleteSignerSessionResponse(
    await convex.mutation(api.signing.completeSignerSession, {
      accessToken: input.portalAccessToken,
    })
  );
}

export async function completeSignerSession(
  input: SigningGatewayInput & { portalAccessToken: string }
): Promise<CompleteSignerSessionResponse> {
  const signingBaseUrl = getSigningApiBaseUrl();
  if (signingBaseUrl) {
    return requestSigningApi(
      input,
      `/api/signing/portal/${encodeURIComponent(input.portalAccessToken)}/complete`,
      {
        method: "POST",
      },
      parseCompleteSignerSessionResponse
    );
  }

  return completeSignerSessionInConvex(input);
}
