# ONECHAIN — Demo Runbook

A living, spatial, interactive model of a packaged-foods supply chain (fictional
**Northfield Foods**). This is not a dashboard — it is a digital twin you can
interrogate, break, and repair in real time.

> One sentence: **ONECHAIN is a digital twin of the supply chain that predicts
> what will go wrong, decides what to do about it across every function at once,
> proves why, and learns from the outcome.**

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
```

Everything is local, deterministic dummy data — no backend, no API keys, no
network calls at runtime. Identical every run. Built for 1280px (projector),
1920px, and 2560px.

## Keyboard (press `?` in-app for the full sheet)

| Key | Action |
| --- | --- |
| `P` | Enter / exit **Presenter mode** |
| `→` / `←` | Advance / reverse beats |
| `Esc` | Close the top overlay / exit presenter |
| `⌘/Ctrl + K` | Command bar — fuzzy search every object (`4471188`, `Joliet`, `LN-`, `DEC-`) |
| `1`–`9` | Toggle a layer (flows, age, service, FEFO, lane, line, inventory, uncertainty, cost) |
| `O` | Toggle geographic ↔ ontology view |
| `D` | Inject a disruption scenario |
| `S` | Run the coordinated solve |
| `N` | Natural-language query bar |
| `L` | Loop view (attribution + learning) |
| `?` | Shortcut sheet |

Bottom-left **legend** isolates a risk tier. Bottom-right **twin clock** scrubs
39 weeks (26 history + 13 forecast) and re-renders the whole canvas.

## Presenter mode — the 8 beats (~7:20)

Press `P`, then `→` to advance. You can go off-script at any beat (click, scrub,
toggle layers) and return with `→`. Each beat sets camera, layers, panels, and a
lower-third caption automatically.

| # | Beat | ~Time | What the judge sees |
| - | ---- | ----- | ------------------- |
| 1 | **Cold open** | 0:00–0:35 | Network fades in west→east, lanes draw, flow particles start. "9 plants, 14 DCs, 2,400 live batches. One twin." |
| 2 | **The problem** | 0:35–1:20 | Three misaligned legacy tools show three different "answers" for one batch, then collapse into one unified object card. |
| 3 | **Interrogate the twin** | 1:20–2:40 | Fly to Joliet, age-risk layer, red batch cluster. Inspector opens on Risk with drivers + 41d-vs-60d freshness. Toggle ontology (`O`) to show the semantic model. |
| 4 | **Break it** | 2:40–3:40 | Inject *Carrier capacity shortfall, Midwest, 48h*. Lanes sever, downstream DCs climb the risk ramp, blast halo expands, KPI strip moves. |
| 5 | **Coordinated solve** | 3:40–5:00 | Press `S`. Stage 1 four optimizers contest the same pallets; Stage 2 claims resolve, objective ticks, gap→0; Stage 3 new plan draws itself + before/after reconciling KPIs. |
| 6 | **Ask why** | 5:00–6:00 | NLQ auto-types the reposition question → structured card: decision, driver waterfall, binding constraints, next-best alternative, "show me on the twin". |
| 7 | **Close the loop** | 6:00–6:50 | Attribution Sankey of last quarter's waste → bias-correction card now live, with the measured accuracy gain. |
| 8 | **The close** | 6:50–7:20 | Pull back to a calm green network. Mark + one-sentence pitch + three numbers. |

## Free-exploration cheat sheet (off-script)

- **Click any node or lane** → four-tab Inspector (State / Risk / Decisions / Simulate). The Simulate tab previews a KPI delta before you commit.
- **`D`** opens the scenario rail — three disruptions (carrier shortfall, cold-chain failure, line-down). **`S`** solves the active one.
- **`N`** opens NLQ. Try: *which batches are at risk at Joliet?* · *what is driving waste for PET DRY ADULT CHKN 24LB?* · *who approved decision DEC-00417?* · *what is our exposure to Walcott Stores?*
- **`⌘K`** then type `4471188` to jump to inventory of the hero material.
- **Capability Atlas** (top-bar link, `/atlas`): 28 capabilities across 5 pillars with hover micro-visuals, the 8-layer platform architecture, and the Industry 4.0 edge strip.

## Numbers that reconcile

The headline figures are a single source of truth (`lib/constants.ts`,
`data/solves.ts`, `data/attribution.ts`). Case value is `$92`. The carrier
scenario's solve avoids **3,120 cases** of waste (24,960 → 21,840), +4.9 pt fill
rate — and the KPI strip, solve reveal, and ledger all agree.
