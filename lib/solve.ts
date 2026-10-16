// Reads pre-computed solve results and exposes them behind a promise that
// resolves on a choreographed timeline, so the animation has room to breathe.
// The numbers are fixed; only the reveal is timed.
import { SOLVE_BY_SCENARIO, BASELINE_PLAN } from "@/data/solves";
import { SolvePlan } from "./types";

export type SolveStage = "idle" | "claim" | "coordinate" | "reveal" | "done";

export const STAGE_TIMING: Record<Exclude<SolveStage, "idle">, number> = {
  claim: 2000,
  coordinate: 2200,
  reveal: 2600,
  done: 0,
};

export function getPlan(scenarioId: string): SolvePlan {
  return SOLVE_BY_SCENARIO[scenarioId] ?? BASELINE_PLAN;
}

// Drive the three visible stages with callbacks; returns a cancel fn.
export function runSolve(
  scenarioId: string,
  onStage: (stage: SolveStage, plan: SolvePlan) => void
): () => void {
  const plan = getPlan(scenarioId);
  const timers: ReturnType<typeof setTimeout>[] = [];
  onStage("claim", plan);
  timers.push(
    setTimeout(() => onStage("coordinate", plan), STAGE_TIMING.claim)
  );
  timers.push(
    setTimeout(
      () => onStage("reveal", plan),
      STAGE_TIMING.claim + STAGE_TIMING.coordinate
    )
  );
  timers.push(
    setTimeout(
      () => onStage("done", plan),
      STAGE_TIMING.claim + STAGE_TIMING.coordinate + STAGE_TIMING.reveal
    )
  );
  return () => timers.forEach(clearTimeout);
}
