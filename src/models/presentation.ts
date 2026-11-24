import type { VendorSlot } from '../api/client';

/** The colour token of each placeholder vendor slot, shared by the model badges and the landing page. */
export const VENDOR_SLOT_COLORS: Record<VendorSlot, string> = {
  A: '--series-openai',
  B: '--series-anthropic',
  C: '--series-google',
  D: '--series-moonshot',
};
