export type ContractEventType =
  | "init"
  | "block_created"
  | "block_updated"
  | "block_deleted"
  | "sealed"
  | "signed"
  | "completed";

export interface ContractEventActor {
  workosId?: string;
  memberId?: string;
  displayName?: string;
}

export interface ContractEvent<TPayload = Record<string, unknown>> {
  type: ContractEventType;
  at: number;
  actor: ContractEventActor;
  reason?: string;
  how?: string;
  payload: TPayload;
}

export interface BlockLineageLink {
  blockId: string;
  parentBlockId?: string;
  previousHash?: string;
  hash: string;
}