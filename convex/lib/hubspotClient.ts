/**
 * HubSpot API Client using Fetch
 *
 * A lightweight HubSpot client using fetch API to avoid SDK bundling issues with Convex.
 */

// Types
export interface HubSpotContact {
  id: string;
  properties: {
    email?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    phone?: string | null;
    company?: string | null;
  };
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string | null;
    domain?: string | null;
    industry?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    address?: string | null;
    zip?: string | null;
    phone?: string | null;
  };
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string | null;
    amount?: string | null;
    dealstage?: string | null;
    closedate?: string | null;
    pipeline?: string | null;
  };
  associations?: {
    contacts?: { results: { id: string }[] };
    companies?: { results: { id: string }[] };
  };
}

interface HubSpotPageResponse<T> {
  results: T[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

// Base URL for HubSpot API
const HUBSPOT_API_BASE = "https://api.hubapi.com";

/**
 * Create headers for HubSpot API requests
 */
function getHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

/**
 * Generic API request helper
 */
async function hubspotRequest<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${HUBSPOT_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(accessToken),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}

// =====================================
// Contacts API
// =====================================

export async function getContacts(
  accessToken: string,
  limit = 100,
  after?: string
): Promise<HubSpotPageResponse<HubSpotContact>> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    properties: "email,firstname,lastname,phone,company",
  });
  if (after) params.set("after", after);

  return hubspotRequest(accessToken, `/crm/v3/objects/contacts?${params}`);
}

export async function getContactById(
  accessToken: string,
  contactId: string
): Promise<HubSpotContact> {
  const params = new URLSearchParams({
    properties: "email,firstname,lastname,phone,company",
  });
  return hubspotRequest(accessToken, `/crm/v3/objects/contacts/${contactId}?${params}`);
}

export async function updateContact(
  accessToken: string,
  contactId: string,
  properties: Record<string, string>
): Promise<HubSpotContact> {
  return hubspotRequest(accessToken, `/crm/v3/objects/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

// =====================================
// Companies API
// =====================================

export async function getCompanies(
  accessToken: string,
  limit = 100,
  after?: string
): Promise<HubSpotPageResponse<HubSpotCompany>> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    properties: "name,domain,industry,city,state,country,address,zip,phone",
  });
  if (after) params.set("after", after);

  return hubspotRequest(accessToken, `/crm/v3/objects/companies?${params}`);
}

export async function getCompanyById(
  accessToken: string,
  companyId: string
): Promise<HubSpotCompany> {
  const params = new URLSearchParams({
    properties: "name,domain,industry,city,state,country,address,zip,phone",
  });
  return hubspotRequest(accessToken, `/crm/v3/objects/companies/${companyId}?${params}`);
}

// =====================================
// Deals API
// =====================================

export async function getDeals(
  accessToken: string,
  limit = 100,
  after?: string
): Promise<HubSpotPageResponse<HubSpotDeal>> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    properties: "dealname,amount,dealstage,closedate,pipeline",
  });
  if (after) params.set("after", after);

  return hubspotRequest(accessToken, `/crm/v3/objects/deals?${params}`);
}

export async function getDealById(
  accessToken: string,
  dealId: string,
  associations?: string[]
): Promise<HubSpotDeal> {
  const params = new URLSearchParams({
    properties: "dealname,amount,dealstage,closedate,pipeline",
  });
  if (associations?.length) {
    params.set("associations", associations.join(","));
  }

  return hubspotRequest(accessToken, `/crm/v3/objects/deals/${dealId}?${params}`);
}

export async function updateDeal(
  accessToken: string,
  dealId: string,
  properties: Record<string, string>
): Promise<HubSpotDeal> {
  return hubspotRequest(accessToken, `/crm/v3/objects/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

// =====================================
// Notes API (for timeline events)
// =====================================

interface NoteCreateRequest {
  properties: {
    hs_note_body: string;
    hs_timestamp: string;
  };
  associations: {
    to: { id: string };
    types: { associationCategory: string; associationTypeId: number }[];
  }[];
}

export async function createNote(
  accessToken: string,
  noteBody: string,
  dealId: string
): Promise<{ id: string }> {
  const request: NoteCreateRequest = {
    properties: {
      hs_note_body: noteBody,
      hs_timestamp: Date.now().toString(),
    },
    associations: [
      {
        to: { id: dealId },
        types: [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 214, // Note to Deal
          },
        ],
      },
    ],
  };

  return hubspotRequest(accessToken, `/crm/v3/objects/notes`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// =====================================
// OAuth Token Refresh
// =====================================

interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}> {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as TokenRefreshResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}
