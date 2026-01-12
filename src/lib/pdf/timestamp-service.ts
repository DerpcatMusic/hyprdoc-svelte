/**
 * RFC 3161 Timestamp Service
 *
 * Provides cryptographic timestamps from trusted Timestamp Authorities (TSAs)
 * to prove that a signature existed at a specific point in time.
 *
 * Uses free TSA services (DigiCert, FreeTSA) for compliance without cost.
 */

import crypto from "node:crypto";

// Known free TSA endpoints
export const TSA_ENDPOINTS = {
  digicert: "http://timestamp.digicert.com",
  freetsa: "https://freetsa.org/tsr",
  sectigo: "http://timestamp.sectigo.com",
  apple: "http://timestamp.apple.com/ts01",
} as const;

export type TSAProvider = keyof typeof TSA_ENDPOINTS;

export interface TimestampResult {
  /** The timestamp token (DER encoded) */
  token: Uint8Array;
  /** ISO timestamp string */
  timestamp: string;
  /** TSA provider used */
  provider: TSAProvider;
  /** Hash of the data that was timestamped */
  dataHash: string;
}

/**
 * Create an RFC 3161 timestamp request
 *
 * @param hash - SHA-256 hash of the data to timestamp (as hex string or Buffer)
 * @returns ASN.1 DER encoded timestamp request
 */
function createTimestampRequest(hash: Uint8Array): Uint8Array {
  // SHA-256 OID: 2.16.840.1.101.3.4.2.1
  const sha256Oid = new Uint8Array([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01]);

  // AlgorithmIdentifier SEQUENCE (SHA-256 with NULL parameters)
  const algorithmIdentifier = Buffer.concat([
    new Uint8Array([0x30, sha256Oid.length + 2]), // SEQUENCE tag + length
    sha256Oid,
    new Uint8Array([0x05, 0x00]), // NULL
  ]);

  // hashedMessage OCTET STRING
  const hashedMessage = Buffer.concat([
    new Uint8Array([0x04, hash.length]), // OCTET STRING tag + length
    hash,
  ]);

  // messageImprint SEQUENCE
  const messageImprint = new Uint8Array(Buffer.concat([
    new Uint8Array([0x30, algorithmIdentifier.length + hashedMessage.length]),
    new Uint8Array(algorithmIdentifier),
    new Uint8Array(hashedMessage),
  ]) as any);

  // version INTEGER (1)
  const version = new Uint8Array([0x02, 0x01, 0x01]);

  // certReq BOOLEAN (true)
  const certReq = new Uint8Array([0x01, 0x01, 0xff]);

  // Final TimeStampReq SEQUENCE
  const innerLength = version.length + messageImprint.length + certReq.length;
  const request = Buffer.concat([
    new Uint8Array([0x30, innerLength]),
    version,
    messageImprint,
    certReq,
  ]);

  return new Uint8Array(request);
}

/**
 * Get an RFC 3161 timestamp from a Timestamp Authority
 *
 * @param data - The data to timestamp (will be hashed with SHA-256)
 * @param provider - TSA provider to use (defaults to digicert)
 * @returns Timestamp result with token and metadata
 */
export async function getTimestamp(
  data: Buffer | Uint8Array,
  provider: TSAProvider = "digicert"
): Promise<TimestampResult> {
  const tsaUrl = TSA_ENDPOINTS[provider];

  // Hash the data with SHA-256
  const hash = new Uint8Array(crypto.createHash("sha256").update(data as unknown as Uint8Array).digest());
  const hashHex = Buffer.from(hash).toString("hex");

  // Create the timestamp request
  const request = createTimestampRequest(hash);

  try {
    // Send request to TSA
    const response = await fetch(tsaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/timestamp-query",
      },
      body: request as any,
    });

    if (!response.ok) {
      throw new Error(`TSA request failed: ${response.status} ${response.statusText}`);
    }

    const tokenBuffer = new Uint8Array(await response.arrayBuffer());

    // Verify we got a valid response (should start with SEQUENCE tag 0x30)
    if (tokenBuffer[0] !== 0x30) {
      throw new Error("Invalid timestamp response format");
    }

    return {
      token: tokenBuffer,
      timestamp: new Date().toISOString(),
      provider,
      dataHash: hashHex,
    };
  } catch (error) {
    console.error(`[RFC3161] Failed to get timestamp from ${provider}:`, error);

    // Fallback to next provider
    const providers = Object.keys(TSA_ENDPOINTS) as TSAProvider[];
    const currentIndex = providers.indexOf(provider);
    const nextProvider = providers[(currentIndex + 1) % providers.length];

    if (nextProvider !== provider) {
      console.log(`[RFC3161] Falling back to ${nextProvider}`);
      return getTimestamp(data, nextProvider);
    }

    throw new Error(`All TSA providers failed: ${error}`);
  }
}

/**
 * Get timestamp for a PDF signature hash
 *
 * @param signatureHash - SHA-256 hash of the signature (hex string)
 * @param provider - TSA provider
 * @returns Timestamp token
 */
export async function timestampSignature(
  signatureHash: string,
  provider: TSAProvider = "digicert"
): Promise<TimestampResult> {
  const hashBuffer = Buffer.from(signatureHash, "hex");
  return getTimestamp(hashBuffer, provider);
}

/**
 * Embed timestamp into signed PDF
 * Note: This is a simplified implementation. Full PAdES-LTV requires
 * embedding the timestamp token into the PDF's signature dictionary.
 *
 * @param pdfBytes - The signed PDF
 * @param timestamp - The timestamp result
 * @returns PDF with embedded timestamp metadata
 */
export async function embedTimestampMetadata(
  pdfBytes: Uint8Array,
  timestamp: TimestampResult
): Promise<{ pdfBytes: Uint8Array; timestampInfo: Record<string, string> }> {
  // For now, we return the timestamp info as metadata
  // Full PAdES-LTV embedding requires modifying the PDF signature dictionary
  // which is complex and typically handled by node-signpdf with proper configuration

  return {
    pdfBytes,
    timestampInfo: {
      provider: timestamp.provider,
      timestamp: timestamp.timestamp,
      dataHash: timestamp.dataHash,
      tokenLength: timestamp.token.length.toString(),
    },
  };
}
