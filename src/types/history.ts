// Outfit history types mirroring the public.outfit_history table.
// Database uses snake_case; TypeScript uses camelCase properties.

export interface OutfitHistory {
  lookId: string;
  userId: string;
  garmentIds: string[];
  wornDate: string;
  createdAt: string;
}
