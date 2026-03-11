// Block-Level Audit Logging - Usage Examples
// How signers' actions are tracked with full metadata

import type { Editor } from '@tiptap/core';

/**
 * EXAMPLE 1: Signer fills in a text block
 */
export function handleSignerFillsNameBlock(editor: Editor) {
  // Signer types their name into a block
  // The AuditTrailExtension automatically tracks this change

  // What gets logged:
  const exampleAuditLog = {
    envelopeId: 'envelope_123',
    blockId: 'block_name_field',
    userId: 'signer_party_2',
    userEmail: 'john@company.com',
    userRole: 'signer',
    action: 'edited',
    changeDetails: {
      blockId: 'block_name_field',
      blockType: 'paragraph',
      changeType: 'content',
      before: {
        content: { type: 'paragraph', content: [] },
        text: '', // Empty before
        attrs: { placeholder: 'Enter your name' },
      },
      after: {
        content: { type: 'paragraph', content: [{ type: 'text', text: 'John Smith' }] },
        text: 'John Smith', // Filled in value
        attrs: { placeholder: 'Enter your name' },
      },
      diff: 'Changed from "" to "John Smith"',
    },
    metadata: {
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
      deviceFingerprint: '7a8f9e2b1c3d4e5f',
      geolocation: {
        country: 'United States',
        region: 'California',
        city: 'San Francisco',
      },
    },
    timestamp: 1737318000000, // Unix timestamp
  };

  console.log('Audit log created:', exampleAuditLog);
}

/**
 * EXAMPLE 2: Signer fills in an address block
 */
export function handleSignerFillsAddressBlock(editor: Editor) {
  // What gets logged when signer types address:
  const exampleAuditLog = {
    envelopeId: 'envelope_123',
    blockId: 'block_address_field',
    userId: 'signer_party_2',
    userEmail: 'john@company.com',
    userRole: 'signer',
    action: 'edited',
    changeDetails: {
      blockId: 'block_address_field',
      blockType: 'paragraph',
      changeType: 'content',
      before: {
        text: '',
      },
      after: {
        text: '123 Main Street, San Francisco, CA 94102',
      },
      diff: 'Changed from "" to "123 Main Street, San Francisco, CA 94102"',
    },
    metadata: {
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0...',
      deviceFingerprint: '7a8f9e2b1c3d4e5f',
      geolocation: {
        country: 'United States',
        region: 'California',
        city: 'San Francisco',
      },
    },
    timestamp: 1737318015000, // 15 seconds later
  };
}

/**
 * EXAMPLE 3: Signer places signature
 */
export function handleSignaturePlacement(editor: Editor, blockId: string, signatureData: any) {
  // Explicitly log signature block filling
  editor.commands.logSignatureBlockFilled(blockId, signatureData);

  // What gets logged:
  const exampleAuditLog = {
    envelopeId: 'envelope_123',
    blockId: 'block_signature_party_2',
    userId: 'signer_party_2',
    userEmail: 'john@company.com',
    userRole: 'signer',
    action: 'edited',
    changeDetails: {
      blockId: 'block_signature_party_2',
      blockType: 'signature',
      changeType: 'content',
      before: null, // No signature before
      after: {
        signatureType: 'draw', // or 'type' or 'upload'
        signedAt: 1737318030000,
        hasSignature: true, // Don't log actual signature for privacy
      },
      diff: 'Block created',
    },
    metadata: {
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0...',
      deviceFingerprint: '7a8f9e2b1c3d4e5f',
      geolocation: {
        country: 'United States',
        region: 'California',
        city: 'San Francisco',
      },
    },
    timestamp: 1737318030000,
  };
}

/**
 * EXAMPLE 4: Query audit trail for a specific block
 */
export async function getBlockAuditTrail(envelopeId: string, blockId: string) {
  // Query Convex for all changes to this specific block
  const logs = await fetch(`/api/audit-trail/${envelopeId}/${blockId}`);
  
  // Returns timeline of who changed what and when:
  const timeline = [
    {
      timestamp: '2026-01-19T19:00:00Z',
      user: 'john@company.com',
      action: 'Created empty block',
      ipAddress: '203.0.113.42',
      location: 'San Francisco, CA, US',
    },
    {
      timestamp: '2026-01-19T19:00:15Z',
      user: 'john@company.com',
      action: 'Changed from "" to "John Smith"',
      ipAddress: '203.0.113.42',
      location: 'San Francisco, CA, US',
    },
    {
      timestamp: '2026-01-19T19:00:30Z',
      user: 'john@company.com',
      action: 'Verified content',
      ipAddress: '203.0.113.42',
      location: 'San Francisco, CA, US',
    },
  ];

  return timeline;
}

/**
 * EXAMPLE 5: Generate compliance report for signer actions
 */
export async function generateSignerComplianceReport(envelopeId: string, signerId: string) {
  // Fetch all audit logs for this signer
  const logs = await fetch(`/api/audit-trail/${envelopeId}/signer/${signerId}`);

  const report = {
    signer: {
      id: signerId,
      email: 'john@company.com',
      name: 'John Smith',
    },
    actions: [
      {
        action: 'Viewed document',
        timestamp: '2026-01-19T18:55:00Z',
        ipAddress: '203.0.113.42',
        location: 'San Francisco, CA, US',
        device: 'Chrome 120 on Windows',
      },
      {
        action: 'Filled "Name" block',
        blockId: 'block_name_field',
        before: '',
        after: 'John Smith',
        timestamp: '2026-01-19T19:00:15Z',
        ipAddress: '203.0.113.42',
        location: 'San Francisco, CA, US',
      },
      {
        action: 'Filled "Address" block',
        blockId: 'block_address_field',
        before: '',
        after: '123 Main Street, San Francisco, CA 94102',
        timestamp: '2026-01-19T19:00:30Z',
        ipAddress: '203.0.113.42',
        location: 'San Francisco, CA, US',
      },
      {
        action: 'Placed signature',
        blockId: 'block_signature_party_2',
        signatureType: 'draw',
        timestamp: '2026-01-19T19:01:00Z',
        ipAddress: '203.0.113.42',
        location: 'San Francisco, CA, US',
      },
      {
        action: 'Consented to electronic signature',
        timestamp: '2026-01-19T19:01:05Z',
        ipAddress: '203.0.113.42',
        location: 'San Francisco, CA, US',
      },
    ],
    summary: {
      totalActions: 5,
      blocksFilledCount: 2,
      signatureCount: 1,
      sessionDuration: '6 minutes',
      ipAddress: '203.0.113.42',
      location: 'San Francisco, CA, US',
    },
  };

  return report;
}

/**
 * EXAMPLE 6: Real-time audit log display (for admin view)
 */
export function displayLiveAuditTrail(envelopeId: string) {
  // Subscribe to real-time audit log updates
  // This would use Convex's reactive queries

  const liveAuditFeed = [
    '19:00:00 - john@company.com viewed document from 203.0.113.42 (San Francisco, CA)',
    '19:00:15 - john@company.com filled "Name" block: "John Smith"',
    '19:00:30 - john@company.com filled "Address" block: "123 Main Street..."',
    '19:01:00 - john@company.com placed signature on block_signature_party_2',
    '19:01:05 - john@company.com consented to e-signature',
  ];

  console.table(liveAuditFeed);
}

/**
 * EXAMPLE 7: Verify block hasn't been tampered with
 */
export async function verifyBlockIntegrity(
  envelopeId: string,
  blockId: string,
  signedBlockHash: string
) {
  // Get current block hash
  const currentHash = await fetch(`/api/blocks/${envelopeId}/${blockId}/hash`);

  if (currentHash === signedBlockHash) {
    console.log('✅ Block integrity verified - content unchanged since signature');
    return true;
  } else {
    console.error('🚨 TAMPERING DETECTED - block content modified after signature!');
    
    // Get audit trail to see when it was changed
    const trail = await getBlockAuditTrail(envelopeId, blockId);
    console.error('Unauthorized changes:', trail);
    
    return false;
  }
}
