/**
 * Party Store
 * 
 * Module-level singleton for managing document parties.
 * Parties are assignable entities (signers) that blocks can be assigned to.
 */

export interface Party {
  id: string;
  name: string;
  color: string;
  email?: string;
  phone?: string;
}

/** Default party color palette */
export const PARTY_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#0ea5e9", // Sky
] as const;

class PartyStore {
  /** List of parties in the document */
  parties = $state<Party[]>([]);

  /** Get next available color */
  get nextColor(): string {
    const usedColors = new Set(this.parties.map((p) => p.color));
    for (const color of PARTY_COLORS) {
      if (!usedColors.has(color)) return color;
    }
    // Fallback to cycling through colors
    return PARTY_COLORS[this.parties.length % PARTY_COLORS.length];
  }

  /** Add a new party */
  addParty(name?: string): Party {
    const id = crypto.randomUUID();
    const color = this.nextColor;
    const partyNumber = this.parties.length + 1;
    
    const party: Party = {
      id,
      name: name || `Signer ${partyNumber}`,
      color,
    };
    
    this.parties = [...this.parties, party];
    return party;
  }

  /** Update a party */
  updateParty(id: string, updates: Partial<Omit<Party, "id">>): void {
    this.parties = this.parties.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
  }

  /** Remove a party */
  removeParty(id: string): void {
    this.parties = this.parties.filter((p) => p.id !== id);
  }

  /** Get party by ID */
  get(id: string): Party | undefined {
    return this.parties.find((p) => p.id === id);
  }

  /** Get party color (returns neutral if not found) */
  getColor(partyId: string | null | undefined): string {
    if (!partyId) return "#a1a1aa"; // zinc-400 neutral
    return this.get(partyId)?.color ?? "#a1a1aa";
  }

  /** Get party name */
  getName(partyId: string | null | undefined): string | null {
    if (!partyId) return null;
    return this.get(partyId)?.name ?? null;
  }

  /** Set parties from external source (e.g., Convex) */
  setParties(parties: Party[]): void {
    this.parties = parties;
  }

  /** Clear all parties */
  clear(): void {
    this.parties = [];
  }
}

/** Global party store singleton */
export const partyStore = new PartyStore();
