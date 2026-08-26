import Dexie, { type EntityTable } from 'dexie';
import type { Location, Movement, Pallet, Parcel, PendingOperation, Reception } from './types';

export class PalletFlowDB extends Dexie {
  receptions!: EntityTable<Reception, 'id'>;
  pallets!: EntityTable<Pallet, 'id'>;
  parcels!: EntityTable<Parcel, 'id'>;
  locations!: EntityTable<Location, 'id'>;
  movements!: EntityTable<Movement, 'id'>;
  operations!: EntityTable<PendingOperation, 'id'>;

  constructor(name = 'palletflow-warehouse') {
    super(name);
    this.version(1).stores({
      receptions: 'id, reference, status, updatedAt, demo',
      pallets: 'id, &code, receptionId, status, locationId, article, updatedAt, demo',
      parcels: 'id, &code, palletId, article, updatedAt, demo',
      locations: 'id, &code, status, zone, updatedAt, demo',
      movements: 'id, palletId, type, createdAt, demo',
      operations: 'id, entityId, entityType, createdAt, attempts',
    });
  }
}

export const db = new PalletFlowDB();

export function deviceId(): string {
  if (typeof window === 'undefined') return 'server-device';
  const key = 'palletflow-device-id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}
