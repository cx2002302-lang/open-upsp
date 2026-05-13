import type { Persona, State } from "../persona/types.js";
import { evolutionLoader } from "../skill/evolution-loader.js";

export interface StateUpdateResult {
  updated: boolean;
  changes: Array<{ axis: string; from: number; to: number }>;
  speedWheelChanged: boolean;
  newRound: boolean;
}

/**
 * StateUpdater — 根据会话蒸馏结果更新位格状态。
 *
 * 规则：
 * - 每次调整限制在 ±5 以内
 * - 值域限制在 0-100
 * - 轮数 +1
 * - 变速轮根据轮数自动判断（每 256 轮一个周期）
 */
export class StateUpdater {
  update(persona: Persona, delta: Partial<State["dynamicAxes"]>): StateUpdateResult {
    const params = evolutionLoader.loadParams();
    const maxDelta = params.limits.stateUpdate.deltaMax;
    const changes: StateUpdateResult["changes"] = [];
    const axes = ["valence", "arousal", "focus", "mood", "humor", "safety"] as const;

    for (const axis of axes) {
      const rawDelta = delta[axis];
      if (rawDelta === undefined) continue;

      // 限制单次调整幅度（读取进化参数）
      const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, rawDelta));

      const current = persona.state.dynamicAxes[axis];
      const next = Math.max(0, Math.min(100, current + clampedDelta));

      if (next !== current) {
        changes.push({ axis, from: current, to: next });
        persona.state.dynamicAxes[axis] = next;
      }
    }

    // 轮数 +1
    const oldRound = persona.state.round;
    persona.state.round += 1;

    // 更新变速轮
    const oldSpeedWheel = persona.state.speedWheel;
    persona.state.speedWheel = this.inferSpeedWheel(persona.state.round);
    const speedWheelChanged = oldSpeedWheel !== persona.state.speedWheel;

    // 更新时间戳
    persona.state.lastUpdated = new Date().toISOString();

    // 更新工化指数（简化公式）
    persona.state.workhoodIndex = this.calculateWorkhoodIndex(persona);

    return {
      updated: changes.length > 0 || oldRound !== persona.state.round,
      changes,
      speedWheelChanged,
      newRound: true,
    };
  }

  private inferSpeedWheel(round: number): State["speedWheel"] {
    const cycle = round % 256;
    if (cycle < 200) return "low";
    if (cycle < 240) return "medium";
    return "high";
  }

  private calculateWorkhoodIndex(persona: Persona): number {
    // 简化公式：基于会话数、STM 条目数、关系数量
    const sessionWeight = Math.min(persona.state.sessionCount / 100, 0.4);
    const stmWeight = Math.min(persona.stm.entries.length / 50, 0.3);
    const relationWeight = Math.min(persona.relation.entries.length / 20, 0.3);
    return Math.min(1, sessionWeight + stmWeight + relationWeight);
  }
}
