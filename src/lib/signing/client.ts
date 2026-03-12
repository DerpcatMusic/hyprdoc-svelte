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
  type CompleteSignerSessionResponse,
  type CreateSigningSessionRequest,
  type RecordSignatureRequest,
  type RecordSignerViewRequest,
  type SaveFieldValueRequest,
  type SendAuthChallengeRequest,
  type SignerPortalExpired,
  type SignerPortalView,
  type SigningSessionSummary,
  type VerifyAuthChallengeRequest,
} from "@hyprdoc/domain-types";

async function requestJson<T>(
  path: string,
  init: RequestInit,
  parser: (value: unknown) => T
) {
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new Error(`Signing request failed (${response.status})`);
  }

  return parser(await response.json());
}

export async function createSigningSession(request: CreateSigningSessionRequest) {
  return requestJson(
    "/api/signing/sessions",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parseCreateSigningSessionRequest(request)),
    },
    parseCreateSigningSessionResponse
  );
}

export async function assignSigner(sessionId: string, request: AssignSignerRequest) {
  return requestJson(
    `/api/signing/sessions/${encodeURIComponent(sessionId)}/assignments`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parseAssignSignerRequest(request)),
    },
    parseAssignSignerResponse
  );
}

export async function startSigningSession(sessionId: string) {
  return requestJson(
    `/api/signing/sessions/${encodeURIComponent(sessionId)}/start`,
    { method: "POST" },
    parseStartSigningSessionResponse
  );
}

export async function getSigningSession(sessionId: string): Promise<SigningSessionSummary> {
  return requestJson(
    `/api/signing/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
    parseSigningSessionSummary
  );
}

export async function getSignerPortal(
  accessToken: string
): Promise<SignerPortalView | SignerPortalExpired> {
  return requestJson(
    `/api/signing/portal/${encodeURIComponent(accessToken)}`,
    { method: "GET" },
    parseSignerPortalResponse
  );
}

export async function recordSignerPortalView(
  accessToken: string,
  request: RecordSignerViewRequest
) {
  return requestJson(
    `/api/signing/portal/${encodeURIComponent(accessToken)}/view`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parseRecordSignerViewRequest(request)),
    },
    parseRecordSignerViewResponse
  );
}

export async function sendSignerAuthChallenge(
  accessToken: string,
  request: SendAuthChallengeRequest
) {
  return requestJson(
    `/api/signing/portal/${encodeURIComponent(accessToken)}/challenges`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parseSendAuthChallengeRequest(request)),
    },
    parseSendAuthChallengeResponse
  );
}

export async function verifySignerAuthChallenge(
  accessToken: string,
  challengeId: string,
  request: VerifyAuthChallengeRequest
) {
  return requestJson(
    `/api/signing/portal/${encodeURIComponent(accessToken)}/challenges/${encodeURIComponent(challengeId)}/verify`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parseVerifyAuthChallengeRequest(request)),
    },
    parseVerifyAuthChallengeResponse
  );
}

export async function saveSignerFieldValue(
  accessToken: string,
  request: SaveFieldValueRequest
) {
  return requestJson(
    `/api/signing/portal/${encodeURIComponent(accessToken)}/field-values`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parseSaveFieldValueRequest(request)),
    },
    parseSaveFieldValueResponse
  );
}

export async function recordSignerSignature(
  accessToken: string,
  request: RecordSignatureRequest
) {
  return requestJson(
    `/api/signing/portal/${encodeURIComponent(accessToken)}/signatures`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parseRecordSignatureRequest(request)),
    },
    parseRecordSignatureResponse
  );
}

export async function completeSignerPortalSession(
  accessToken: string
): Promise<CompleteSignerSessionResponse> {
  return requestJson(
    `/api/signing/portal/${encodeURIComponent(accessToken)}/complete`,
    { method: "POST" },
    parseCompleteSignerSessionResponse
  );
}
