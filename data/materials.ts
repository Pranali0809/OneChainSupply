import { Rng, round } from "@/lib/rng";
import { Material, BusinessUnit } from "@/lib/types";

const rng = new Rng(0x5eed01);

const PET = [
  "PET DRY ADULT CHKN", "PET DRY ADULT BEEF", "PET DRY PUPPY CHKN",
  "PET DRY SENIOR LAMB", "PET DRY SMALL BREED", "PET WET PATE CHKN",
  "PET WET STEW BEEF", "PET TREATS BISCUIT", "PET TREATS JERKY",
  "PET DRY CAT SALMON", "PET DRY CAT INDOOR", "PET DRY CAT HAIRBALL",
];
const CEREAL = [
  "CRL OAT RINGS", "CRL FROSTED FLAKE", "CRL BRAN SQUARES",
  "CRL HONEY CLUSTER", "CRL CHOC PUFFS", "CRL GRANOLA MAPLE",
  "CRL GRANOLA BERRY", "CRL CORN FLAKE", "CRL MULTIGRAIN O",
  "CRL KIDS FRUIT", "CRL OAT BAR", "CRL PROTEIN CRUNCH",
];
const SNACKS = [
  "SNK POTATO CLASSIC", "SNK POTATO BBQ", "SNK TORTILLA LIME",
  "SNK PRETZEL ROD", "SNK CHEESE PUFF", "SNK POPCORN BUTTER",
  "SNK VEGGIE STRAW", "SNK CRACKER WHEAT", "SNK TRAIL MIX",
  "SNK RICE CAKE", "SNK NUT MIX SALTED", "SNK CHIP MULTIGRAIN",
];

const SIZES = ["6OZ", "12OZ", "16OZ", "24LB", "30LB", "4LB", "10CT", "18OZ"];

function buildFamily(names: string[], bu: BusinessUnit, startCode: number): Material[] {
  const out: Material[] = [];
  let code = startCode;
  for (const base of names) {
    const variants = rng.int(3, 5);
    for (let v = 0; v < variants; v++) {
      const size = rng.pick(SIZES);
      const shelf =
        bu === "PET" ? rng.int(300, 540) : bu === "CEREAL" ? rng.int(240, 365) : rng.int(90, 210);
      out.push({
        code: String(code),
        desc: `${base} ${size}`,
        bu,
        shelfLifeDays: shelf,
        customerFreshnessDays: Math.round(shelf * (bu === "SNACKS" ? 0.55 : 0.45)),
        minRemainingShipDays: Math.round(shelf * 0.25),
        casesPerPallet: rng.pick([40, 48, 55, 60, 72, 80]),
      });
      code += rng.int(11, 97);
    }
  }
  return out;
}

export const MATERIALS: Material[] = [
  ...buildFamily(PET, "PET", 4471000),
  ...buildFamily(CEREAL, "CEREAL", 2238000),
  ...buildFamily(SNACKS, "SNACKS", 6650000),
];

// The hero material referenced throughout the choreography (Beat 3 / Beat 6).
export const HERO_MATERIAL = "4471188";
// Guarantee the hero code + description exist exactly as scripted.
if (!MATERIALS.find((m) => m.code === HERO_MATERIAL)) {
  MATERIALS.unshift({
    code: HERO_MATERIAL,
    desc: "PET DRY ADULT CHKN 24LB",
    bu: "PET",
    shelfLifeDays: 455,
    customerFreshnessDays: 60,
    minRemainingShipDays: 110,
    casesPerPallet: 48,
  });
} else {
  const m = MATERIALS.find((x) => x.code === HERO_MATERIAL)!;
  m.desc = "PET DRY ADULT CHKN 24LB";
  m.shelfLifeDays = 455;
  m.customerFreshnessDays = 60;
  m.minRemainingShipDays = 110;
}

export const MATERIAL_BY_CODE: Record<string, Material> = Object.fromEntries(
  MATERIALS.map((m) => [m.code, m])
);

export const MATERIALS_BY_BU: Record<BusinessUnit, Material[]> = {
  PET: MATERIALS.filter((m) => m.bu === "PET"),
  CEREAL: MATERIALS.filter((m) => m.bu === "CEREAL"),
  SNACKS: MATERIALS.filter((m) => m.bu === "SNACKS"),
};

export const MATERIAL_COUNT = MATERIALS.length;
