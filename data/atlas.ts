export type Pillar = "Plan" | "Source" | "Make" | "Deliver" | "Customer" | "End to end";
export type AtlasStatus = "Live in demo" | "Modelled" | "Designed";
export type ModelFamily =
  | "Probabilistic forecasting"
  | "Risk & classification"
  | "Causal attribution"
  | "Prescriptive optimization"
  | "Generative explanation";

export interface Capability {
  id: string;
  pillar: Pillar;
  name: string;
  outcome: string;
  status: AtlasStatus;
  family: ModelFamily;
  inputs: string[]; // twin objects consumed
  decision: string; // decision produced
  micro: "forecast" | "flow" | "risk" | "sankey" | "route" | "line" | "stack" | "pulse";
}

export const CAPABILITIES: Capability[] = [
  // ── Plan ──
  { id: "cap-demand", pillar: "Plan", name: "Hierarchical probabilistic demand forecasting", outcome: "p10/p50/p90 demand at every material-node-week.", status: "Live in demo", family: "Probabilistic forecasting", inputs: ["Material", "Node", "Order history"], decision: "Base demand distribution feeding every downstream solve.", micro: "forecast" },
  { id: "cap-service", pillar: "Plan", name: "Service & cuts projection", outcome: "Forward fill-rate and projected cuts by customer.", status: "Live in demo", family: "Risk & classification", inputs: ["Forecast", "Inventory", "Lane"], decision: "Service risk score per node and customer.", micro: "risk" },
  { id: "cap-safety", pillar: "Plan", name: "Inventory & safety-stock optimization", outcome: "Right-sized buffers against demand variance.", status: "Modelled", family: "Prescriptive optimization", inputs: ["Forecast", "Node", "Service target"], decision: "Safety-stock targets by node-SKU.", micro: "stack" },
  { id: "cap-sop", pillar: "Plan", name: "S&OP scenario balancing", outcome: "Supply/demand balanced across the quarter.", status: "Modelled", family: "Prescriptive optimization", inputs: ["Forecast", "Capacity", "Inventory"], decision: "Balanced S&OP plan with declared priorities.", micro: "flow" },

  // ── Source ──
  { id: "cap-rawmat", pillar: "Source", name: "Raw-material order optimization", outcome: "Order quantities timed to production need.", status: "Live in demo", family: "Prescriptive optimization", inputs: ["Supplier", "BOM", "Production plan"], decision: "Purchase order schedule by supplier.", micro: "route" },
  { id: "cap-vendor", pillar: "Source", name: "Vendor allocation & incoterm-aware lane cost", outcome: "Lowest landed cost across the vendor pool.", status: "Modelled", family: "Prescriptive optimization", inputs: ["Supplier", "Lane", "Incoterm"], decision: "Allocation split across vendors.", micro: "route" },
  { id: "cap-suprisk", pillar: "Source", name: "Supplier risk sensing", outcome: "Early warning on supplier disruption.", status: "Modelled", family: "Risk & classification", inputs: ["Supplier", "Signal feed"], decision: "Supplier risk index and watchlist.", micro: "risk" },
  { id: "cap-commodity", pillar: "Source", name: "Commodity signal monitoring", outcome: "Price-signal-aware buy timing.", status: "Designed", family: "Probabilistic forecasting", inputs: ["Commodity index", "BOM"], decision: "Buy/defer recommendation per commodity.", micro: "forecast" },

  // ── Make ──
  { id: "cap-sequence", pillar: "Make", name: "Production sequencing & changeover minimization", outcome: "Fewer changeovers, more sellable hours.", status: "Modelled", family: "Prescriptive optimization", inputs: ["Line", "Production plan", "SKU"], decision: "Optimal run sequence per line.", micro: "line" },
  { id: "cap-oee", pillar: "Make", name: "Line-rate & OEE prediction", outcome: "Predicts lines running below committed rate.", status: "Modelled", family: "Risk & classification", inputs: ["Line", "Telemetry"], decision: "Line risk score and expected rate.", micro: "pulse" },
  { id: "cap-pdm", pillar: "Make", name: "Predictive maintenance & remaining useful life", outcome: "Intervene before unplanned downtime.", status: "Designed", family: "Risk & classification", inputs: ["Asset twin", "Telemetry"], decision: "Maintenance window recommendation.", micro: "pulse" },
  { id: "cap-vision", pillar: "Make", name: "Vision-based quality inspection", outcome: "Defects caught at the line, not the DC.", status: "Designed", family: "Risk & classification", inputs: ["Line camera", "Batch"], decision: "Accept/reject + defect class per unit.", micro: "risk" },
  { id: "cap-yield", pillar: "Make", name: "Yield & energy optimization", outcome: "More output per unit input and kWh.", status: "Designed", family: "Prescriptive optimization", inputs: ["Line", "Telemetry", "Recipe"], decision: "Setpoint recommendations per line.", micro: "line" },

  // ── Deliver ──
  { id: "cap-deploy", pillar: "Deliver", name: "Deployment & push recommendations", outcome: "Cover placed where demand will land.", status: "Live in demo", family: "Prescriptive optimization", inputs: ["Forecast", "Inventory", "Lane"], decision: "Deployment push plan plant→DC.", micro: "flow" },
  { id: "cap-repo", pillar: "Deliver", name: "Repositioning", outcome: "At-risk stock moved before it ages out.", status: "Live in demo", family: "Prescriptive optimization", inputs: ["Batch", "Node", "Lane"], decision: "DC→DC repositioning moves.", micro: "route" },
  { id: "cap-truck", pillar: "Deliver", name: "Truck build & load levelling", outcome: "Full trucks, fewer partials, level docks.", status: "Live in demo", family: "Prescriptive optimization", inputs: ["Order", "Pallet", "Lane"], decision: "Truck build + load plan.", micro: "stack" },
  { id: "cap-network", pillar: "Deliver", name: "Network & lane design", outcome: "Structurally lower cost-to-serve.", status: "Modelled", family: "Prescriptive optimization", inputs: ["Node", "Lane", "Demand"], decision: "Lane add/drop + flow-path design.", micro: "route" },
  { id: "cap-cts", pillar: "Deliver", name: "Cost to serve", outcome: "True margin by customer, lane, and SKU.", status: "Modelled", family: "Causal attribution", inputs: ["Lane", "Order", "Cost"], decision: "Cost-to-serve decomposition.", micro: "sankey" },
  { id: "cap-dock", pillar: "Deliver", name: "Dock & door scheduling", outcome: "Smoothed arrivals, less detention.", status: "Designed", family: "Prescriptive optimization", inputs: ["Shipment", "Node", "Dock"], decision: "Appointment schedule per door.", micro: "line" },

  // ── Customer ──
  { id: "cap-scenario", pillar: "Customer", name: "Customer scenario modelling", outcome: "Answer customer what-ifs in seconds.", status: "Live in demo", family: "Generative explanation", inputs: ["Customer", "Forecast", "Plan"], decision: "Scenario comparison with trade-offs.", micro: "forecast" },
  { id: "cap-freshness", pillar: "Customer", name: "Customer-specific shelf-life logic", outcome: "Ship only inside each customer's freshness window.", status: "Live in demo", family: "Risk & classification", inputs: ["Batch", "Material", "Customer"], decision: "Ship/hold per customer freshness rule.", micro: "risk" },
  { id: "cap-fill", pillar: "Customer", name: "Fill-rate protection", outcome: "SLA breaches prevented, not explained after.", status: "Modelled", family: "Prescriptive optimization", inputs: ["Order", "Inventory", "Service target"], decision: "Protective allocation to at-risk orders.", micro: "flow" },
  { id: "cap-promo", pillar: "Customer", name: "Promotion readiness", outcome: "Enough cover, fresh enough, for every promo.", status: "Modelled", family: "Probabilistic forecasting", inputs: ["Promo calendar", "Forecast", "Inventory"], decision: "Promo build + placement plan.", micro: "stack" },

  // ── End to end ──
  { id: "cap-batchrisk", pillar: "End to end", name: "Batch risk & waste mitigation", outcome: "Every batch scored, worst ones actioned.", status: "Live in demo", family: "Risk & classification", inputs: ["Batch", "Material", "Node"], decision: "Mitigation action per at-risk batch.", micro: "risk" },
  { id: "cap-attrib", pillar: "End to end", name: "Waste driver attribution", outcome: "Waste traced to its true cause.", status: "Live in demo", family: "Causal attribution", inputs: ["Ledger", "Forecast", "Batch"], decision: "Attributed waste by driver.", micro: "sankey" },
  { id: "cap-fefo", pillar: "End to end", name: "FEFO compliance", outcome: "First-expiry-first-out, enforced.", status: "Live in demo", family: "Risk & classification", inputs: ["Batch", "Node", "Pick plan"], decision: "FEFO-correct pick order + re-slots.", micro: "stack" },
  { id: "cap-resilience", pillar: "End to end", name: "Resilience & disruption simulation", outcome: "Feel any disruption before it happens.", status: "Live in demo", family: "Prescriptive optimization", inputs: ["Node", "Lane", "Scenario"], decision: "Blast radius + recovery plan.", micro: "pulse" },
  { id: "cap-ledger", pillar: "End to end", name: "Decision ledger & value measurement", outcome: "Every decision's expected vs realized value.", status: "Live in demo", family: "Causal attribution", inputs: ["Recommendation", "Outcome"], decision: "Closed-loop value measurement + bias feedback.", micro: "sankey" },
];

export const PILLARS: Pillar[] = ["Plan", "Source", "Make", "Deliver", "Customer", "End to end"];

export interface ArchLayer {
  id: string;
  name: string;
  blurb: string;
  beats: number[]; // demo beats that depended on this layer
}

export const ARCH_LAYERS: ArchLayer[] = [
  { id: "sensing", name: "Sensing & telemetry", blurb: "Edge signals from lines, warehouses, and lanes.", beats: [4] },
  { id: "twin", name: "Supply chain digital twin", blurb: "Time-phased, versioned, queryable network model.", beats: [1, 3, 7] },
  { id: "data", name: "Data products & features", blurb: "Governed features: distributions, risks, costs.", beats: [3] },
  { id: "ai", name: "AI factory", blurb: "Five model families over the twin.", beats: [3, 6] },
  { id: "coord", name: "Decision coordination", blurb: "One coordinated solve, declared priorities.", beats: [5] },
  { id: "agents", name: "Agents", blurb: "Autonomous recommend / approve / execute loops.", beats: [5, 7] },
  { id: "experience", name: "Experience", blurb: "The twin canvas, inspector, and NLQ you see.", beats: [1, 2, 3, 6] },
  { id: "platform", name: "Platform services", blurb: "Identity, ledger, versioning, observability.", beats: [7, 8] },
];
