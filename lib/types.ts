// ONECHAIN twin ontology. Every object carries a stable id and twin versioning.

export const TWIN_VERSION = "twin.v41.3";

export type NodeKind = "PLANT" | "DC" | "CUSTOMER_DC" | "SUPPLIER";
export type Temp = "DRY" | "TEMP";
export type Ownership = "OWNED" | "3PL" | "CUSTOMER" | "SUPPLIER";
export type LaneMode = "TRUCKLOAD" | "INTERMODAL" | "RAIL" | "LTL";
export type BusinessUnit = "PET" | "CEREAL" | "SNACKS";

export type RiskKind =
  | "age"
  | "service"
  | "fefo"
  | "lane"
  | "line";

export interface RiskDriver {
  label: string;
  contribution: number; // signed, sums toward the score
}

export interface RiskScore {
  kind: RiskKind;
  label: string;
  value: number; // 0..1 probability
  drivers: RiskDriver[];
  threshold: number; // crossing this flips the verdict
  thresholdNote: string;
}

export interface StateTransition {
  week: number; // index into the 39-week clock, 0..38 (26 history + 13 fwd)
  label: string;
  detail: string;
}

export interface TwinNode {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  kind: NodeKind;
  ownership: Ownership;
  temp: Temp;
  lon: number;
  lat: number;
  throughput: number; // cases/week capacity, drives size
  lines?: string[]; // plant production lines
  customerCode?: string; // for customer DCs
  businessUnits: BusinessUnit[];
  onHandCases: number;
  daysOfSupply: number;
  composite: number; // 0..1 composite risk, drives fill color
  risks: RiskScore[];
  sparkline: number[]; // 12-week throughput trend
  transitions: StateTransition[];
  validFrom: string;
  validTo: string;
  twinVersion: string;
}

export interface Lane {
  id: string;
  from: string; // node id
  to: string; // node id
  mode: LaneMode;
  transitDays: number;
  costPerCwt: number;
  reliability: number; // 0..1
  volume: number; // cases/week, drives arc height
  utilization: number; // 0..1, drives color
  risk: number; // lane risk 0..1
  severed?: boolean;
  stressed?: boolean;
  twinVersion: string;
}

export interface Material {
  code: string;
  desc: string;
  bu: BusinessUnit;
  shelfLifeDays: number;
  customerFreshnessDays: number; // customer freshness-day requirement
  minRemainingShipDays: number; // min remaining shelf life to ship
  casesPerPallet: number;
}

export interface Batch {
  id: string;
  materialCode: string;
  nodeId: string;
  productionDate: string;
  isd: string; // in-store date
  expiry: string;
  lastShipDate: string;
  qtyCases: number;
  remainingShelfDays: number;
  ageRisk: number; // 0..1
  fefoFlag: boolean;
  twinVersion: string;
}

export interface ForecastPoint {
  week: number; // 0..38
  p10: number;
  p50: number;
  p90: number;
  actual?: number; // present for history weeks
}

export interface ForecastSeries {
  nodeId: string;
  materialCode: string;
  points: ForecastPoint[];
}

export interface Scenario {
  id: string;
  name: string;
  epicenter: string; // node id
  caption: string;
  severedLanes: string[];
  stressedLanes: string[];
  impactedNodes: { nodeId: string; deltaRisk: number }[];
  kpiBefore: KpiSet;
  kpiAfter: KpiSet; // immediately after disruption, before solve
  blastHops: string[][]; // ordered rings of node ids
}

export interface KpiSet {
  fillRate: number; // %
  projectedWasteCases: number;
  projectedWasteDollars: number;
  freightCost: number; // $
  workingCapital: number; // $
  expediteCost: number; // $
}

export interface OptimizerClaim {
  optimizer: string;
  nodeId: string;
  pallets: number;
  contested: boolean;
}

export interface SolveFlow {
  laneId: string;
  from: string;
  to: string;
  cases: number;
  isNew: boolean; // re-routed by the solve
}

export interface SolvePlan {
  id: string;
  scenarioId: string;
  label: string;
  claims: OptimizerClaim[];
  flows: SolveFlow[];
  kpi: KpiSet;
  objective: { cost: number; service: number; waste: number; gap: number }[];
  tradeoffs: string[];
}

export type DecisionStatus =
  | "recommended"
  | "approved"
  | "overridden"
  | "executed";

export interface LedgerEntry {
  id: string;
  objectId: string; // batch / node / lane this concerns
  objectLabel: string;
  title: string;
  status: DecisionStatus;
  expectedValue: number; // $
  realizedValue: number | null; // $ once closed
  actor: string;
  week: number;
  rationale: string;
}

export interface AttributionBand {
  cause: string;
  cases: number;
  dollars: number;
  color: string;
}

export interface ExplanationCard {
  query: string;
  decision: string;
  expectedValue: number;
  drivers: RiskDriver[];
  constraints: { name: string; slack: string; binding: boolean }[];
  nextBest: { label: string; costDelta: number; whyLost: string };
  highlightNodeIds: string[];
  highlightLaneIds: string[];
}
