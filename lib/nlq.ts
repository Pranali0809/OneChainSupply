import { ExplanationCard } from "./types";
import { NODES } from "@/data/network";
import { MATERIALS, MATERIAL_BY_CODE } from "@/data/materials";
import { CUSTOMERS } from "@/data/network";
import { LANES } from "@/data/network";
import { ledgerForObject, LEDGER } from "@/data/ledger";
import {
  explainReposition,
  explainRiskAtNode,
  explainWasteDriver,
  explainLaneFailure,
  explainForecastAccuracy,
  explainCustomerExposure,
} from "./explain";

export type IntentId =
  | "why-decision"
  | "what-if"
  | "risk-at-node"
  | "waste-driver"
  | "lane-failure"
  | "who-approved"
  | "forecast-accuracy"
  | "customer-exposure";

export interface NlqResult {
  intent: IntentId;
  card?: ExplanationCard;
  // who-approved returns a decision summary instead of a full card
  decisionSummary?: {
    id: string;
    title: string;
    actor: string;
    status: string;
    expectedValue: number;
    realizedValue: number | null;
    rationale: string;
    objectLabel: string;
  };
}

export const SUGGESTED_QUERIES = [
  "why did we reposition 1,840 cases from Joliet to Reed City instead of donating them?",
  "which batches are at risk at Joliet?",
  "what is driving waste for PET DRY ADULT CHKN 24LB?",
  "what happens if the Joliet lane fails?",
  "who approved decision DEC-00417?",
  "how accurate was our forecast for 4471188 at Joliet?",
  "what is our exposure to Walcott Stores?",
  "what if I donate instead of reposition?",
];

function findNode(q: string) {
  const lq = q.toLowerCase();
  return (
    NODES.find((n) => lq.includes(n.name.toLowerCase())) ||
    NODES.find((n) => lq.includes(n.city.toLowerCase())) ||
    NODES.find((n) => lq.includes(n.code.toLowerCase()))
  );
}

function findMaterial(q: string) {
  const lq = q.toLowerCase();
  const byCode = MATERIALS.find((m) => q.includes(m.code));
  if (byCode) return byCode;
  return MATERIALS.find((m) => lq.includes(m.desc.toLowerCase()));
}

function findCustomer(q: string) {
  const lq = q.toLowerCase();
  return CUSTOMERS.find(
    (c) => lq.includes(c.name.toLowerCase()) || lq.includes(c.name.split(" ")[0].toLowerCase())
  );
}

function findDecisionId(q: string) {
  const m = q.match(/DEC-\d{5}/i);
  return m ? m[0].toUpperCase() : null;
}

// Intent matcher: keyword scoring + entity extraction over the twin.
export function runQuery(raw: string): NlqResult {
  const q = raw.trim();
  const lq = q.toLowerCase();

  // who approved D ----------------------------------------------------------
  const decId = findDecisionId(q);
  if (decId || /\bwho\b.*(approv|sign|action|own)/.test(lq)) {
    const id = decId || "DEC-00417";
    const entry = LEDGER.find((e) => e.id === id) || LEDGER.find((e) => e.id === "DEC-00417")!;
    return {
      intent: "who-approved",
      decisionSummary: {
        id: entry.id,
        title: entry.title,
        actor: entry.actor,
        status: entry.status,
        expectedValue: entry.expectedValue,
        realizedValue: entry.realizedValue,
        rationale: entry.rationale,
        objectLabel: entry.objectLabel,
      },
    };
  }

  // forecast accuracy -------------------------------------------------------
  if (/(accurate|accuracy|forecast error|mape|bias)/.test(lq) && /(forecast|how)/.test(lq)) {
    const node = findNode(q) || NODES.find((n) => n.id === "DC-JOL")!;
    const mat = findMaterial(q) || MATERIAL_BY_CODE["4471188"];
    return { intent: "forecast-accuracy", card: explainForecastAccuracy(node.id, mat.code) };
  }

  // customer exposure -------------------------------------------------------
  const cust = findCustomer(q);
  if (cust && /(exposure|risk|serve|service)/.test(lq)) {
    const dcs = NODES.filter((n) => n.customerCode === cust.code).map((n) => n.id);
    return { intent: "customer-exposure", card: explainCustomerExposure(cust.name, dcs) };
  }

  // lane failure / what-if lane --------------------------------------------
  if (/(lane|carrier|transit).*(fail|down|sever|break)/.test(lq) || /(fail|down).*(lane)/.test(lq)) {
    const node = findNode(q);
    let lane = LANES.find((l) => node && (l.from === node.id || l.to === node.id));
    if (!lane) lane = LANES.find((l) => l.from === "DC-JOL" || l.to === "DC-JOL") || LANES[0];
    return { intent: "lane-failure", card: explainLaneFailure(lane.id, lane.from, lane.to) };
  }

  // waste driver ------------------------------------------------------------
  if (/(driv|cause|why).*(waste)/.test(lq) || /waste.*(driv|cause)/.test(lq)) {
    const mat = findMaterial(q) || MATERIAL_BY_CODE["4471188"];
    return { intent: "waste-driver", card: explainWasteDriver(mat.desc) };
  }

  // batches at risk at node N ----------------------------------------------
  if (/(at risk|at-risk|risk).*(at|node|dc)/.test(lq) || /which batch/.test(lq)) {
    const node = findNode(q) || NODES.find((n) => n.id === "DC-JOL")!;
    return { intent: "risk-at-node", card: explainRiskAtNode(node) };
  }

  // what-if (donate instead of reposition, or generic alternative) ---------
  if (/what if|instead|alternativ|donate/.test(lq)) {
    const card = explainReposition();
    // reframe as the what-if branch
    return {
      intent: "what-if",
      card: {
        ...card,
        query: q,
        decision:
          "Donating instead of repositioning forfeits $112.4k of recoverable value and the open Walcott demand; the twin keeps repositioning as the dominant plan.",
      },
    };
  }

  // default: why this decision (hero reposition) ---------------------------
  void ledgerForObject;
  return { intent: "why-decision", card: explainReposition() };
}
