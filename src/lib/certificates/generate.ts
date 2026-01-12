/**
 * X.509 Certificate Chain Generator
 *
 * Generates a self-signed certificate chain for document signing:
 * - Root CA (100-year validity)
 * - Sub-CA (signed by Root)
 * - Signing Certificate (signed by Sub-CA)
 * - PKCS12 bundle for use with node-signpdf
 *
 * For production, replace with certificates from a trusted CA
 * (like GlobalSign, DigiCert) for Adobe Reader validation.
 */

import forge from "node-forge";

export interface CertificateChain {
  rootCa: { cert: string; key: string };
  subCa: { cert: string; key: string };
  signingCert: { cert: string; key: string };
  pkcs12: Buffer;
}

/**
 * Generate a complete X.509 certificate chain
 *
 * @param orgName - Organization name to use in certificates
 * @param password - Password for the PKCS12 bundle (optional, defaults to empty)
 * @returns Certificate chain with PEM strings and PKCS12 buffer
 */
export function generateCertificateChain(orgName: string, password = ""): CertificateChain {
  const now = new Date();
  const later = new Date();
  later.setFullYear(now.getFullYear() + 100); // 100-year validity

  // ═══════════════════════════════════════════════════════════════
  // 1. Generate Root CA
  // ═══════════════════════════════════════════════════════════════
  const rootKeys = forge.pki.rsa.generateKeyPair(2048);
  const rootCert = forge.pki.createCertificate();

  rootCert.publicKey = rootKeys.publicKey;
  rootCert.serialNumber = "01";
  rootCert.validity.notBefore = now;
  rootCert.validity.notAfter = later;

  const rootAttrs: forge.pki.CertificateField[] = [
    { name: "countryName", value: "US" },
    { shortName: "ST", value: "California" },
    { name: "organizationName", value: orgName },
    { name: "commonName", value: `${orgName} Root CA` },
  ];

  rootCert.setSubject(rootAttrs);
  rootCert.setIssuer(rootAttrs); // Self-signed

  rootCert.setExtensions([
    {
      name: "basicConstraints",
      cA: true,
      critical: true,
    },
    {
      name: "keyUsage",
      keyCertSign: true,
      cRLSign: true,
      critical: true,
    },
    {
      name: "subjectKeyIdentifier",
    },
  ]);

  rootCert.sign(rootKeys.privateKey, forge.md.sha256.create());

  // ═══════════════════════════════════════════════════════════════
  // 2. Generate Sub-CA (signed by Root)
  // ═══════════════════════════════════════════════════════════════
  const subKeys = forge.pki.rsa.generateKeyPair(2048);
  const subCert = forge.pki.createCertificate();

  subCert.publicKey = subKeys.publicKey;
  subCert.serialNumber = "02";
  subCert.validity.notBefore = now;
  subCert.validity.notAfter = later;

  const subAttrs: forge.pki.CertificateField[] = [
    { name: "countryName", value: "US" },
    { shortName: "ST", value: "California" },
    { name: "organizationName", value: orgName },
    { name: "commonName", value: `${orgName} Sub-CA` },
  ];

  subCert.setSubject(subAttrs);
  subCert.setIssuer(rootAttrs); // Issued by Root

  subCert.setExtensions([
    {
      name: "basicConstraints",
      cA: true,
      pathLenConstraint: 0, // Can only issue end-entity certs
      critical: true,
    },
    {
      name: "keyUsage",
      keyCertSign: true,
      cRLSign: true,
      critical: true,
    },
    {
      name: "subjectKeyIdentifier",
    },
    {
      name: "authorityKeyIdentifier",
      keyIdentifier: true,
    },
  ]);

  subCert.sign(rootKeys.privateKey, forge.md.sha256.create());

  // ═══════════════════════════════════════════════════════════════
  // 3. Generate Signing Certificate (signed by Sub-CA)
  // ═══════════════════════════════════════════════════════════════
  const signKeys = forge.pki.rsa.generateKeyPair(2048);
  const signCert = forge.pki.createCertificate();

  signCert.publicKey = signKeys.publicKey;
  signCert.serialNumber = "03";
  signCert.validity.notBefore = now;
  signCert.validity.notAfter = later;

  const signAttrs: forge.pki.CertificateField[] = [
    { name: "countryName", value: "US" },
    { shortName: "ST", value: "California" },
    { name: "organizationName", value: orgName },
    { name: "commonName", value: orgName },
  ];

  signCert.setSubject(signAttrs);
  signCert.setIssuer(subAttrs); // Issued by Sub-CA

  signCert.setExtensions([
    {
      name: "basicConstraints",
      cA: false,
      critical: true,
    },
    {
      name: "keyUsage",
      digitalSignature: true,
      nonRepudiation: true,
      critical: true,
    },
    {
      name: "extKeyUsage",
      emailProtection: true,
      clientAuth: true,
    },
    {
      name: "subjectKeyIdentifier",
    },
    {
      name: "authorityKeyIdentifier",
      keyIdentifier: true,
    },
  ]);

  signCert.sign(subKeys.privateKey, forge.md.sha256.create());

  // ═══════════════════════════════════════════════════════════════
  // 4. Create PKCS12 bundle
  // ═══════════════════════════════════════════════════════════════
  const pkcs12Asn1 = forge.pkcs12.toPkcs12Asn1(
    signKeys.privateKey,
    [signCert, subCert, rootCert],
    password,
    { algorithm: "3des" } // For compatibility
  );

  const pkcs12Der = forge.asn1.toDer(pkcs12Asn1).getBytes();
  const pkcs12Buffer = Buffer.from(pkcs12Der, "binary");

  return {
    rootCa: {
      cert: forge.pki.certificateToPem(rootCert),
      key: forge.pki.privateKeyToPem(rootKeys.privateKey),
    },
    subCa: {
      cert: forge.pki.certificateToPem(subCert),
      key: forge.pki.privateKeyToPem(subKeys.privateKey),
    },
    signingCert: {
      cert: forge.pki.certificateToPem(signCert),
      key: forge.pki.privateKeyToPem(signKeys.privateKey),
    },
    pkcs12: pkcs12Buffer,
  };
}

/**
 * Load a PKCS12 certificate from base64-encoded environment variable
 *
 * @param base64P12 - Base64-encoded PKCS12 file
 * @param password - Password for the PKCS12 file
 * @returns Extracted certificate and private key
 */
export function loadPkcs12(
  base64P12: string,
  password: string
): { cert: forge.pki.Certificate; key: forge.pki.PrivateKey; chain: forge.pki.Certificate[] } {
  const der = Buffer.from(base64P12, "base64").toString("binary");
  const asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

  // Extract bags
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

  const certs = certBags[forge.pki.oids.certBag] || [];
  const keys = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [];

  if (certs.length === 0 || keys.length === 0) {
    throw new Error("Invalid PKCS12: No certificates or keys found");
  }

  // Find the end-entity certificate (the one for signing)
  // It's typically the one with a matching key
  const privateKey = keys[0].key as forge.pki.PrivateKey;

  // Find cert that matches the private key
  let signingCert: forge.pki.Certificate | null = null;
  const chain: forge.pki.Certificate[] = [];

  for (const bag of certs) {
    const cert = bag.cert as forge.pki.Certificate;
    if (cert) {
      // Check if this cert's public key matches our private key
      const certPublicKeyPem = forge.pki.publicKeyToPem(cert.publicKey);
      const derivedPublicKey = forge.pki.rsa.setPublicKey(
        (privateKey as any).n,
        (privateKey as any).e
      );
      const derivedPem = forge.pki.publicKeyToPem(derivedPublicKey);

      if (certPublicKeyPem === derivedPem) {
        signingCert = cert;
      } else {
        chain.push(cert);
      }
    }
  }

  if (!signingCert) {
    // Fallback: use first cert
    signingCert = certs[0].cert as forge.pki.Certificate;
  }

  return {
    cert: signingCert,
    key: privateKey,
    chain,
  };
}

/**
 * Generate and save a test certificate for development
 *
 * @param orgName - Organization name
 * @returns Base64-encoded PKCS12 for use in env variables
 */
export function generateTestCertificate(orgName = "HyprDoc"): string {
  const chain = generateCertificateChain(orgName, "");
  return chain.pkcs12.toString("base64");
}
