// Living Contract Extensions - Integration Example
// How to use the living contract extensions in your Tiptap editor

import { useEditor } from 'svelte-tiptap';
import StarterKit from '@tiptap/starter-kit';
import { LiveBlockNode } from './extensions/LiveBlockNode';
import { MerkleTreeExtension } from './extensions/MerkleTreeExtension';
import { AuditTrailExtension } from './extensions/AuditTrailExtension';
import { get } from 'svelte/store';
import { convexQuery } from 'convex-svelte';
import { api } from '$lib/convex/_generated/api';

/**
 * Create a living contract editor with all extensions
 */
export function createLivingContractEditor(options: {
  envelopeId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: 'author' | 'reviewer' | 'signer' | 'approver' | 'viewer';
  initialContent?: any;
  onMerkleRootChanged?: (rootHash: string) => void;
}) {
  const { envelopeId, userId, userEmail, userRole, initialContent, onMerkleRootChanged } = options;

  const editor = useEditor({
    extensions: [
      StarterKit,
      
      // Live Block Extension (API-driven data)
      LiveBlockNode,

      // Merkle Tree Extension (cryptographic integrity)
      MerkleTreeExtension.configure({
        onMerkleRootChanged: (rootHash: string) => {
          console.log('🔐 Merkle root updated:', rootHash);
          onMerkleRootChanged?.(rootHash);
        },
      }),

      // Audit Trail Extension (compliance logging)
      AuditTrailExtension.configure({
        envelopeId,
        userId,
        userEmail,
        userRole,
        enabled: !!envelopeId && !!userId,
      }),
    ],

    content: initialContent || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Start typing your living contract...' }],
        },
      ],
    },

    editorProps: {
      attributes: {
        class: 'living-contract-editor',
        'data-envelope-id': envelopeId || '',
      },
    },
  });

  return editor;
}

/**
 * Example: Insert a live block (e.g., gold price)
 */
export function insertGoldPriceLiveBlock(editor: any) {
  if (!editor) return;

  editor.commands.setLiveBlock({
    blockId: crypto.randomUUID(),
    isLive: true,
    apiSource: {
      endpoint: 'https://api.metals.live/v1/spot/gold',
      method: 'GET',
      authentication: 'none',
      headers: {},
      transform: 'data.price', // Extract price from response
      fallback: 1850.50, // Fallback if API fails
    },
    syncInterval: 300000, // 5 minutes
  });

  // Log action
  editor.commands.logAction('live_block_inserted', {
    blockType: 'gold_price',
    apiEndpoint: 'metals.live',
  });
}

/**
 * Example: Insert a live block (e.g., exchange rate)
 */
export function insertExchangeRateLiveBlock(editor: any, fromCurrency: string, toCurrency: string) {
  if (!editor) return;

  editor.commands.setLiveBlock({
    blockId: crypto.randomUUID(),
    isLive: true,
    apiSource: {
      endpoint: `https://api.exchangerate.host/latest?base=${fromCurrency}&symbols=${toCurrency}`,
      method: 'GET',
      authentication: 'none',
      headers: {},
      transform: `data.rates.${toCurrency}`,
      fallback: 1.0,
    },
    dataSchema: 'z.number().positive()', // Zod schema
    syncInterval: 600000, // 10 minutes
  });

  editor.commands.logAction('live_block_inserted', {
    blockType: 'exchange_rate',
    fromCurrency,
    toCurrency,
  });
}

/**
 * Example: Get current Merkle root
 */
export function getCurrentMerkleRoot(editor: any): string | null {
  if (!editor) return null;
  return editor.commands.getMerkleRoot();
}

/**
 * Example: Verify document integrity
 */
export async function verifyDocumentIntegrity(
  editor: any,
  signedMerkleRoot: string
): Promise<boolean> {
  if (!editor) return false;

  const currentRoot = editor.commands.getMerkleRoot();
  const isValid = currentRoot === signedMerkleRoot;

  if (!isValid) {
    console.error('🚨 DOCUMENT TAMPERED! Merkle roots do not match!');
    console.error(`Signed: ${signedMerkleRoot}`);
    console.error(`Current: ${currentRoot}`);
  } else {
    console.log('✅ Document integrity verified');
  }

  return isValid;
}

/**
 * Example: Sign document workflow
 */
export async function signDocumentWorkflow(
  editor: any,
  envelopeId: string,
  partyId: string,
  signatureType: 'SES' | 'AES' | 'QES' | 'US_ESIGN'
) {
  if (!editor) throw new Error('Editor not initialized');

  // 1. Get current Merkle root
  const merkleRoot = getCurrentMerkleRoot(editor);
  if (!merkleRoot) throw new Error('Failed to compute Merkle root');

  console.log('📝 Signing document with Merkle root:', merkleRoot);

  // 2. Mark document as signed (reset dirty flag)
  editor.commands.markDocumentSigned();

  // 3. Log signature action
  editor.commands.logAction('signed', {
    merkleRoot,
    signatureType,
  });

  // 4. Call backend mutation (would integrate with actual signing flow)
  console.log('✍️ Document signed successfully');

  return merkleRoot;
}

/**
 * Example: Real-time collaboration with Yjs
 */
export function setupYjsCollaboration(editor: any, envelopeId: string) {
  // This would integrate with Hocuspocus for real-time collaboration
  // See: https://tiptap.dev/hocuspocus

  console.log('🔄 Setting up Yjs collaboration for envelope:', envelopeId);

  // Monitor for changes and update Merkle root
  editor.on('update', () => {
    const merkleRoot = getCurrentMerkleRoot(editor);
    console.log('📊 Document updated, new Merkle root:', merkleRoot);
  });
}

/**
 * Example: Export compliance report
 */
export async function exportComplianceReport(envelopeId: string) {
  // Fetch audit logs from Convex
  const logs = await convexQuery(api.contracts.mutations.getEnvelopeAuditTrail, {
    envelopeId,
    limit: 1000,
  });

  const report = {
    envelopeId,
    exportedAt: new Date().toISOString(),
    totalActions: logs.length,
    actions: logs.map((log) => ({
      timestamp: new Date(log.timestamp).toISOString(),
      user: log.userEmail,
      action: log.action,
      ipAddress: log.metadata.ipAddress,
      location: log.metadata.geolocation
        ? `${log.metadata.geolocation.city}, ${log.metadata.geolocation.region}, ${log.metadata.geolocation.country}`
        : 'Unknown',
    })),
  };

  // Download as JSON
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `compliance-report-${envelopeId}.json`;
  a.click();
  URL.revokeObjectURL(url);

  console.log('📄 Compliance report exported');
}

/**
 * Example: Trigger manual sync for all live blocks
 */
export function syncAllLiveBlocks(editor: any) {
  if (!editor) return;

  const { doc } = editor.state;
  const liveBlockIds: string[] = [];

  doc.descendants((node: any) => {
    if (node.type.name === 'liveBlock' && node.attrs.isLive) {
      liveBlockIds.push(node.attrs.blockId);
    }
  });

  console.log(`🔄 Triggering sync for ${liveBlockIds.length} live blocks`);

  liveBlockIds.forEach((blockId) => {
    editor.commands.triggerLiveBlockSync(blockId);
  });
}

/**
 * Example: Listen to Merkle root changes
 */
export function listenToMerkleChanges(editorElement: HTMLElement) {
  editorElement.addEventListener('merkle-root-changed', ((e: CustomEvent) => {
    console.log('🔐 Merkle root changed:', e.detail);
    
    // Update UI indicator
    const indicator = document.getElementById('merkle-indicator');
    if (indicator) {
      indicator.textContent = e.detail.rootHash?.substring(0, 8) + '...';
      indicator.className = e.detail.isDirty ? 'dirty' : 'clean';
    }
  }) as EventListener);
}
