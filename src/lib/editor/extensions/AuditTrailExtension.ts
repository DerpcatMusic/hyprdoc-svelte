// Living Contract - Audit Trail Tiptap Extension (ENHANCED)
// Block-level immutable logging with full metadata for compliance

import { Extension } from '@tiptap/core';
import type { Transaction } from '@tiptap/pm/state';
import { useConvexMutation } from 'convex-svelte';
import { api } from '$lib/convex/_generated/api';

export interface AuditTrailOptions {
  envelopeId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: 'author' | 'reviewer' | 'signer' | 'approver' | 'viewer';
  enabled?: boolean;
}

export interface BlockChange {
  blockId: string;
  blockType: string;
  before: any;
  after: any;
  changeType: 'content' | 'attrs' | 'created' | 'deleted';
}

export const AuditTrailExtension = Extension.create<AuditTrailOptions>({
  name: 'auditTrail',

  addOptions() {
    return {
      envelopeId: undefined,
      userId: undefined,
      userEmail: undefined,
      userRole: 'author',
      enabled: true,
    };
  },

  onCreate() {
    if (!this.options.enabled) return;

    this.logAction('created', {
      documentTitle: this.editor.options.editorProps?.attributes?.title,
      totalBlocks: countBlocks(this.editor.state.doc),
    });
  },

  onUpdate({ transaction }) {
    if (!this.options.enabled) return;
    if (!transaction.docChanged) return;

    // Extract BLOCK-LEVEL changes from transaction
    const blockChanges = extractBlockLevelChanges(transaction);
    
    // Log each block change separately for granular audit trail
    blockChanges.forEach(change => {
      this.logBlockChange(change);
    });
  },

  addCommands() {
    return {
      logAction:
        (action: string, details?: any) =>
        () => {
          if (!this.options.enabled) return true;
          this.logAction(action, details);
          return true;
        },

      logBlockFilled:
        (blockId: string, blockType: string, content: any) =>
        ({ editor }) => {
          if (!this.options.enabled) return true;

          // Find the block in the document
          let blockBefore: any = null;
          editor.state.doc.descendants((node, pos) => {
            if (node.attrs.blockId === blockId) {
              blockBefore = {
                content: node.textContent,
                attrs: node.attrs,
              };
              return false;
            }
          });

          // Log the block filling action
          this.logBlockChange({
            blockId,
            blockType,
            before: blockBefore,
            after: { content },
            changeType: 'content',
          });

          return true;
        },

      logSignatureBlockFilled:
        (blockId: string, signatureData: any) =>
        () => {
          if (!this.options.enabled) return true;

          this.logBlockChange({
            blockId,
            blockType: 'signature',
            before: null,
            after: {
              signatureType: signatureData.type,
              signedAt: Date.now(),
              // Don't log the actual signature value for privacy
              hasSignature: true,
            },
            changeType: 'content',
          });

          return true;
        },

      logComment:
        (blockId: string, comment: string) =>
        () => {
          this.logAction('commented', {
            blockId,
            comment: comment.substring(0, 200),
          });
          return true;
        },

      logApproval:
        () =>
        () => {
          this.logAction('approved', {
            timestamp: Date.now(),
          });
          return true;
        },

      logRejection:
        (reason: string) =>
        () => {
          this.logAction('rejected', {
            reason: reason.substring(0, 500),
          });
          return true;
        },

      logDownload:
        (format: 'pdf' | 'docx' | 'json') =>
        () => {
          this.logAction('downloaded', {
            format,
            fileSize: this.editor.getText().length,
          });
          return true;
        },
    };
  },

  /**
   * Log a block-level change to Convex backend
   * This captures EXACTLY what was changed in which block
   */
  async logBlockChange(change: BlockChange) {
    if (!this.options.envelopeId || !this.options.userId) {
      console.warn('AuditTrail: Missing envelopeId or userId');
      return;
    }

    try {
      // Collect metadata
      const metadata = await collectMetadata();

      // Create detailed change record
      const changeDetails = {
        blockId: change.blockId,
        blockType: change.blockType,
        changeType: change.changeType,
        before: change.before,
        after: change.after,
        // Calculate diff for text content
        diff: calculateDiff(change.before, change.after),
      };

      // Log to Convex (fire and forget)
      const convexMutation = useConvexMutation(api.contracts.mutations.createAuditLog);
      
      await convexMutation({
        envelopeId: this.options.envelopeId,
        blockId: change.blockId,
        userId: this.options.userId,
        userEmail: this.options.userEmail!,
        userRole: this.options.userRole!,
        action: 'edited',
        changeDetails,
        metadata,
        timestamp: Date.now(),
      }).catch((err) => {
        console.error('Failed to log block change:', err);
      });

      console.log(`📝 Audit log: Block ${change.blockId} changed by ${this.options.userEmail}`);
    } catch (error) {
      console.error('AuditTrail error:', error);
    }
  },

  /**
   * Log a general action to Convex backend
   */
  async logAction(action: string, details?: any) {
    if (!this.options.envelopeId || !this.options.userId) {
      console.warn('AuditTrail: Missing envelopeId or userId');
      return;
    }

    try {
      const metadata = await collectMetadata();

      const convexMutation = useConvexMutation(api.contracts.mutations.createAuditLog);
      
      await convexMutation({
        envelopeId: this.options.envelopeId,
        userId: this.options.userId,
        userEmail: this.options.userEmail!,
        userRole: this.options.userRole!,
        action,
        changeDetails: details ? { after: details } : undefined,
        metadata,
        timestamp: Date.now(),
      }).catch((err) => {
        console.error('Failed to log audit trail:', err);
      });
    } catch (error) {
      console.error('AuditTrail error:', error);
    }
  },
});

// ============================================================================
// BLOCK-LEVEL CHANGE EXTRACTION
// ============================================================================

/**
 * Extract block-level changes from ProseMirror transaction
 * Returns array of changed blocks with before/after content
 */
function extractBlockLevelChanges(tr: Transaction): BlockChange[] {
  const changes: BlockChange[] = [];
  const oldDoc = tr.before;
  const newDoc = tr.doc;

  // Track which blocks changed
  const changedBlocks = new Map<string, { old: any; new: any }>();

  // Walk through old document
  oldDoc.descendants((node, pos) => {
    if (node.attrs.blockId) {
      changedBlocks.set(node.attrs.blockId, {
        old: {
          content: node.toJSON(),
          text: node.textContent,
          attrs: node.attrs,
          type: node.type.name,
        },
        new: null,
      });
    }
  });

  // Walk through new document
  newDoc.descendants((node, pos) => {
    if (node.attrs.blockId) {
      const blockId = node.attrs.blockId;
      const existing = changedBlocks.get(blockId);

      if (existing) {
        // Block existed before - update new state
        existing.new = {
          content: node.toJSON(),
          text: node.textContent,
          attrs: node.attrs,
          type: node.type.name,
        };
      } else {
        // New block created
        changedBlocks.set(blockId, {
          old: null,
          new: {
            content: node.toJSON(),
            text: node.textContent,
            attrs: node.attrs,
            type: node.type.name,
          },
        });
      }
    }
  });

  // Convert to change records
  changedBlocks.forEach((value, blockId) => {
    const { old, new: newState } = value;

    // Block was created
    if (!old && newState) {
      changes.push({
        blockId,
        blockType: newState.type,
        before: null,
        after: newState,
        changeType: 'created',
      });
    }
    // Block was deleted
    else if (old && !newState) {
      changes.push({
        blockId,
        blockType: old.type,
        before: old,
        after: null,
        changeType: 'deleted',
      });
    }
    // Block content changed
    else if (old && newState && old.text !== newState.text) {
      changes.push({
        blockId,
        blockType: newState.type,
        before: old,
        after: newState,
        changeType: 'content',
      });
    }
    // Block attributes changed
    else if (old && newState && JSON.stringify(old.attrs) !== JSON.stringify(newState.attrs)) {
      changes.push({
        blockId,
        blockType: newState.type,
        before: old,
        after: newState,
        changeType: 'attrs',
      });
    }
  });

  return changes;
}

/**
 * Calculate simple diff between before/after
 */
function calculateDiff(before: any, after: any): string {
  if (!before && after) return 'Block created';
  if (before && !after) return 'Block deleted';
  
  const beforeText = before?.text || '';
  const afterText = after?.text || '';

  if (beforeText === afterText) return 'Attributes changed';

  return `Changed from "${beforeText}" to "${afterText}"`;
}

/**
 * Count total blocks in document
 */
function countBlocks(doc: any): number {
  let count = 0;
  doc.descendants((node: any) => {
    if (node.attrs.blockId) count++;
  });
  return count;
}

// ============================================================================
// METADATA COLLECTION
// ============================================================================

/**
 * Collect device and geolocation metadata
 */
async function collectMetadata(): Promise<{
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
}> {
  // Get IP address
  let ipAddress = '0.0.0.0';
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    ipAddress = ipData.ip;
  } catch (e) {
    console.warn('Failed to get IP address');
  }

  // User agent
  const userAgent = navigator.userAgent;

  // Device fingerprint
  let deviceFingerprint: string | undefined;
  try {
    deviceFingerprint = createSimpleFingerprint();
  } catch (e) {
    console.warn('Failed to generate device fingerprint');
  }

  // Geolocation (using IP geolocation service)
  let geolocation: { country: string; region: string; city: string } | undefined;
  try {
    const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
    const geoData = await geoResponse.json();
    geolocation = {
      country: geoData.country_name || 'Unknown',
      region: geoData.region || 'Unknown',
      city: geoData.city || 'Unknown',
    };
  } catch (e) {
    console.warn('Failed to get geolocation');
  }

  return {
    ipAddress,
    userAgent,
    deviceFingerprint,
    geolocation,
  };
}

/**
 * Create a simple device fingerprint
 */
function createSimpleFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'unknown';

  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Browser fingerprint', 2, 2);

  const dataUrl = canvas.toDataURL();
  let hash = 0;
  for (let i = 0; i < dataUrl.length; i++) {
    const char = dataUrl.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16);
}


export default AuditTrailExtension;
