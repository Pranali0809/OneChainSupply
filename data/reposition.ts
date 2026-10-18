// Canonical numbers for the Joliet → Reed City repositioning of 1,840 cs.
// Single source of truth shared by the dock screen, the Beat 6 explanation
// card, the ledger (DEC-00417) and the Beat 5 solve tradeoff — so every screen
// agrees to the case, pallet and dollar.
import { LANES } from "./network";
import { HERO_MATERIAL } from "./materials";
import { CASE_VALUE } from "@/lib/constants";

export const CASES = 1840;
export const CASES_PER_PALLET = 48; // hero material 4471188
export const WEIGHT_PER_CASE = 24; // lb (PET DRY ADULT CHKN 24LB)

export const FULL_PALLETS = Math.floor(CASES / CASES_PER_PALLET); // 38
export const PARTIAL_CASES = CASES - FULL_PALLETS * CASES_PER_PALLET; // 16
export const PALLET_COUNT = FULL_PALLETS + (PARTIAL_CASES > 0 ? 1 : 0); // 39

export const TOTAL_WEIGHT = CASES * WEIGHT_PER_CASE; // 44,160 lb

// 53 ft dry van
export const TRAILER = {
  lengthFt: 53,
  floorPositions: 26, // single-stack
  palletCapacity: 52, // double-stacked
  weightLimitLb: 48000, // max gross payload
};

// Truckload economics
export const TL_MIN_PALLETS = 20;
export const TL_MIN_WEIGHT = 20000;
export const FREIGHT_LEG = 4200; // $ for this one truckload (also shown in Beat 5)
export const EXPECTED_VALUE = 169280; // $ — unchanged across Beat 6 / ledger / here

export const CUBE_UTIL = PALLET_COUNT / TRAILER.palletCapacity; // ~0.75
export const WEIGHT_UTIL = TOTAL_WEIGHT / TRAILER.weightLimitLb; // ~0.92 — weight is the tighter constraint

// Load-levelling: a second drop co-loads a lighter SKU into the weight headroom.
export const SECOND_STOP = {
  dcId: "DC-KC",
  dcName: "Kansas City",
  pallets: 8,
  casesPerPallet: 48,
  cases: 384,
  weightPerCase: 9, // light co-load (packaging)
  accessorial: 650, // $ multi-stop charge
};
export const SECOND_STOP_WEIGHT = SECOND_STOP.cases * SECOND_STOP.weightPerCase; // 3,456 lb

export const FROM_ID = "DC-JOL";
export const TO_ID = "DC-RED";
export const LANE_ID =
  LANES.find((l) => l.from === FROM_ID && l.to === TO_ID)?.id ?? "LN-JOL-RED-TR";

export interface PalletTile {
  idx: number;
  cases: number;
  weightLb: number;
  daysToExpiry: number; // colored by this
  partial: boolean;
}

// 39 pallet tiles. Anchored on the hero batch (41d), with deterministic sub-lot
// variance so FEFO ordering is meaningful on the floor.
export function buildPallets(): PalletTile[] {
  const out: PalletTile[] = [];
  for (let i = 0; i < PALLET_COUNT; i++) {
    const partial = i === PALLET_COUNT - 1 && PARTIAL_CASES > 0;
    const cases = partial ? PARTIAL_CASES : CASES_PER_PALLET;
    // sub-lot days-to-expiry 38..44 around the 41d hero batch (deterministic)
    const daysToExpiry = 38 + ((i * 7 + 3) % 7);
    out.push({ idx: i, cases, weightLb: cases * WEIGHT_PER_CASE, daysToExpiry, partial });
  }
  return out;
}

// FEFO-correct load order: soonest-expiring first.
export function fefoOrder(pallets: PalletTile[]): number[] {
  return [...pallets].sort((a, b) => a.daysToExpiry - b.daysToExpiry || a.idx - b.idx).map((p) => p.idx);
}

export function freightPerCase(freight: number, cases: number): number {
  return +(freight / cases).toFixed(2);
}

export const HERO = HERO_MATERIAL;
void CASE_VALUE;
