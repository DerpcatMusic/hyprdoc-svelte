import { env } from "$env/dynamic/private";

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export function isAuthorizedSigningSourceRequest(request: Request) {
  const secret = env.SIGNING_SOURCE_SECRET || env.RUNTIME_SOURCE_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get("x-hyprdoc-runtime-secret") === secret;
}
