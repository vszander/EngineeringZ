// src/pages/mhsa/SignalsDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SignalsDashboard.css";

const SLA_SEC = 60 * 60; // 1:00:00 per milestone
const WARNING_SEC = 4 * 60; // turns yellow at 4 minutes remaining
const ADVANCE_EVERY_MS = 10_000; // "Normal" demo progression cadence

const MILESTONES = [
  { key: "recv", label: "Recv’d", icon: "assignment" },
  { key: "disp", label: "Dispatch", icon: "add_notes" },
  { key: "pick", label: "Pick", icon: "directions_run" },
  { key: "picked", label: "Picked", icon: "data_check" },
  { key: "stage", label: "Stage", icon: "stacks" },
  { key: "load", label: "Load", icon: "local_shipping" },
  { key: "depart", label: "Depart", icon: "delivery_truck_speed" },
  { key: "arrive", label: "Arrive", icon: "rv_hookup" },
  { key: "pou", label: "POU", icon: "subway_walk" },
];

function pad2(n) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function fmtHMS(totalSeconds) {
  const s = Math.abs(Math.trunc(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randRemainingUnder15m() {
  return randInt(30, 14 * 60 + 59); // 00:00:30 .. 00:14:59
}

function plausibleCompletedRemaining() {
  // completed cells should show "-00:10:xx-ish"
  return randInt(6 * 60, 13 * 60 + 59);
}

function computeTotalElapsedApprox(signal) {
  let total = 0;
  for (let i = 0; i < MILESTONES.length; i++) {
    const step = signal.steps[i];
    if (step.status === "done") {
      total += Math.max(0, SLA_SEC - (step.remainingAtFinishSec ?? 0));
    } else if (step.status === "active") {
      const rem = step.remainingSec ?? 0;
      total += rem >= 0 ? SLA_SEC - rem : SLA_SEC + Math.abs(rem);
    } else {
      break;
    }
  }
  return total;
}

function makeSignal({
  id,
  name,
  owner,
  priority,
  fifoIndex,
  startMilestoneIndex1Based,
}) {
  const activeIdx = Math.max(1, Math.min(9, startMilestoneIndex1Based)) - 1;

  const steps = MILESTONES.map((m, idx) => {
    if (idx < activeIdx) {
      return {
        key: m.key,
        status: "done",
        remainingAtFinishSec: plausibleCompletedRemaining(),
      };
    }
    if (idx === activeIdx) {
      return {
        key: m.key,
        status: "active",
        remainingSec: randRemainingUnder15m(),
        expediteGlow: false,
      };
    }
    return { key: m.key, status: "todo" };
  });

  return {
    id,
    name,
    owner,
    priority, // "NORMAL" | "EXPEDITE"
    fifoIndex,
    steps,
    createdAtMs: Date.now() - fifoIndex * 60_000,
  };
}

function getActiveIndex(signal) {
  return signal.steps.findIndex((s) => s.status === "active");
}

function getActiveRemaining(signal) {
  const idx = getActiveIndex(signal);
  if (idx < 0) return Number.POSITIVE_INFINITY;
  return signal.steps[idx].remainingSec ?? Number.POSITIVE_INFINITY;
}

function isExpedite(signal) {
  return signal.priority === "EXPEDITE";
}

export default function SignalsDashboard() {
  const [signals, setSignals] = useState(() => [
    makeSignal({
      id: "S1",
      name: "Signal A-0142",
      owner: "DC Dispatch",
      priority: "NORMAL",
      fifoIndex: 1,
      startMilestoneIndex1Based: 5,
    }),
    makeSignal({
      id: "S2",
      name: "Signal B-0391",
      owner: "Picker Team",
      priority: "NORMAL",
      fifoIndex: 2,
      startMilestoneIndex1Based: 4,
    }),
    makeSignal({
      id: "S3",
      name: "Signal C-0088",
      owner: "Outbound Dock",
      priority: "NORMAL",
      fifoIndex: 3,
      startMilestoneIndex1Based: 2,
    }),
    makeSignal({
      id: "S4",
      name: "Signal D-0207",
      owner: "ERP Queue",
      priority: "NORMAL",
      fifoIndex: 4,
      startMilestoneIndex1Based: 1,
    }),
  ]);

  const [mode, setMode] = useState("idle"); // "idle" | "normal" | "expedited" | "problem"
  const [running, setRunning] = useState(false);

  const tickRef = useRef(null);
  const normalAdvanceRef = useRef(null);

  const sortedSignals = useMemo(() => {
    // Priority first, then soonest SLA breach (least remaining), then FIFO
    return [...signals].sort((a, b) => {
      const pa = isExpedite(a) ? 0 : 1;
      const pb = isExpedite(b) ? 0 : 1;
      if (pa !== pb) return pa - pb;

      const ra = getActiveRemaining(a);
      const rb = getActiveRemaining(b);
      if (ra !== rb) return ra - rb;

      return a.fifoIndex - b.fifoIndex;
    });
  }, [signals]);

  function stopAllTimers() {
    setRunning(false);
    if (tickRef.current) clearInterval(tickRef.current);
    if (normalAdvanceRef.current) clearInterval(normalAdvanceRef.current);
    tickRef.current = null;
    normalAdvanceRef.current = null;
  }

  function startTicking() {
    if (tickRef.current) return;
    setRunning(true);

    tickRef.current = setInterval(() => {
      setSignals((prev) =>
        prev.map((sig) => {
          const idx = getActiveIndex(sig);
          if (idx < 0) return sig;

          const step = sig.steps[idx];
          const nextRemaining = (step.remainingSec ?? 0) - 1;

          const nextSteps = sig.steps.map((s, i) =>
            i === idx ? { ...s, remainingSec: nextRemaining } : s,
          );
          return { ...sig, steps: nextSteps };
        }),
      );
    }, 1000);
  }

  function advanceOneStep(sig) {
    const idx = getActiveIndex(sig);
    if (idx < 0) return sig;
    if (idx >= MILESTONES.length - 1) return sig;

    const active = sig.steps[idx];
    const remainingAtFinishSec = Math.max(0, active.remainingSec ?? 0);
    const nextActiveRemaining = randRemainingUnder15m();

    const nextSteps = sig.steps.map((s, i) => {
      if (i < idx) return s;
      if (i === idx) {
        return {
          ...s,
          status: "done",
          remainingAtFinishSec,
          remainingSec: undefined,
          expediteGlow: false,
        };
      }
      if (i === idx + 1) {
        return {
          ...s,
          status: "active",
          remainingSec: nextActiveRemaining,
          expediteGlow: false,
        };
      }
      return s;
    });

    const ownerByStep = [
      "ERP Queue",
      "DC Dispatch",
      "Picker Team",
      "Picker Team",
      "Outbound Dock",
      "Outbound Dock",
      "In Transit",
      "Plant Receiving",
      "Mitzo POU",
    ];
    const newOwner = ownerByStep[Math.min(idx + 1, ownerByStep.length - 1)];

    return { ...sig, steps: nextSteps, owner: newOwner };
  }

  function startNormalAutoAdvance() {
    if (normalAdvanceRef.current) return;

    // Weighted random choice helper
    function pickWeightedIndex(weights) {
      const total = weights.reduce((a, b) => a + b, 0);
      if (total <= 0) return -1;
      let r = Math.random() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
      }
      return weights.length - 1;
    }

    normalAdvanceRef.current = setInterval(() => {
      setSignals((prev) => {
        // Optional: sometimes nothing happens (feels less robotic)
        if (Math.random() < 0.2) return prev;

        // Build eligible list
        const candidates = [];
        for (let i = 0; i < prev.length; i++) {
          const sig = prev[i];
          const idx = getActiveIndex(sig);
          if (idx < 0) continue;
          if (idx >= MILESTONES.length - 1) continue; // already at last step
          const rem = sig.steps[idx].remainingSec ?? 0;
          if (rem <= 0) continue; // if late, don't auto-advance in normal

          candidates.push({ listIndex: i, sig, idx, rem });
        }

        if (candidates.length === 0) return prev;

        // Weight them: expedite > nearing breach > FIFO
        const weights = candidates.map(({ sig, idx, rem }) => {
          let w = 1;

          // Expedite feels like it progresses more visibly
          if (isExpedite(sig)) w += 3;

          // Nearing warning/zero should “feel” like it’s moving / being acted on
          // rem: small rem => bigger weight
          if (rem <= WARNING_SEC) w += 4;
          else if (rem <= WARNING_SEC * 3) w += 2;

          // Slight preference for earlier FIFO
          w += Math.max(0, 3 - sig.fifoIndex) * 0.3;

          // Optional: if later steps, slightly more likely to complete (looks satisfying)
          w += idx * 0.15;

          return w;
        });

        const chosen = candidates[pickWeightedIndex(weights)];
        if (!chosen) return prev;

        // Advance only the chosen signal
        const next = prev.map((s, i) =>
          i === chosen.listIndex ? advanceOneStep(s) : s,
        );
        return next;
      });
    }, ADVANCE_EVERY_MS);
  }

  function resetDemoBaseline() {
    stopAllTimers();
    setSignals([
      makeSignal({
        id: "S1",
        name: "Signal A-0142",
        owner: "DC Dispatch",
        priority: "NORMAL",
        fifoIndex: 1,
        startMilestoneIndex1Based: 5,
      }),
      makeSignal({
        id: "S2",
        name: "Signal B-0391",
        owner: "Picker Team",
        priority: "NORMAL",
        fifoIndex: 2,
        startMilestoneIndex1Based: 4,
      }),
      makeSignal({
        id: "S3",
        name: "Signal C-0088",
        owner: "Outbound Dock",
        priority: "NORMAL",
        fifoIndex: 3,
        startMilestoneIndex1Based: 2,
      }),
      makeSignal({
        id: "S4",
        name: "Signal D-0207",
        owner: "ERP Queue",
        priority: "NORMAL",
        fifoIndex: 4,
        startMilestoneIndex1Based: 1,
      }),
    ]);
    setMode("idle");
  }

  function handleNormal() {
    resetDemoBaseline();
    setMode("normal");
    startTicking();
    startNormalAutoAdvance();
  }

  function handleExpedited() {
    stopAllTimers();
    setMode("expedited");

    setSignals((prev) =>
      prev.map((sig) => {
        if (sig.id !== "S3") return sig;
        const idx = getActiveIndex(sig);
        if (idx < 0) return { ...sig, priority: "EXPEDITE" };

        const nextSteps = sig.steps.map((s, i) =>
          i === idx
            ? { ...s, remainingSec: 25 * 60, expediteGlow: true }
            : { ...s, expediteGlow: false },
        );

        return { ...sig, priority: "EXPEDITE", steps: nextSteps };
      }),
    );

    startTicking();
  }

  function handleProblem() {
    stopAllTimers();
    setMode("problem");

    setSignals((prev) =>
      prev.map((sig) => {
        if (sig.id !== "S3") return sig;
        const idx = getActiveIndex(sig);
        if (idx < 0) return sig;

        const nextSteps = sig.steps.map((s, i) =>
          i === idx ? { ...s, remainingSec: 5, expediteGlow: true } : s,
        );
        return { ...sig, steps: nextSteps };
      }),
    );

    startTicking();
  }

  const stats = useMemo(() => {
    let onTime = 0;
    let lateSeconds = 0;

    for (const s of signals) {
      const rem = getActiveRemaining(s);
      if (rem >= 0) onTime += 1;
      if (rem < 0) lateSeconds += Math.abs(rem);
    }

    return {
      onTimeSignals: onTime,
      minutesLate: Math.floor(lateSeconds / 60),
      activeEscalations: signals.filter((s) => getActiveRemaining(s) <= 0)
        .length,
    };
  }, [signals]);

  useEffect(() => () => stopAllTimers(), []);

  return (
    <div className="mhsaSignals mhsa-dark">
      <div className="mhsaSignals__inner">
        <div className="mhsaSignalsTop">
          <div>
            <div className="mhsaSignalsTitleMain">Urgent Signal Workflow</div>
            <div className="mhsaSignalsTitleSub">
              Wall Display • 9 Milestones • SLA {fmtHMS(SLA_SEC)} each • Warning
              at {fmtHMS(WARNING_SEC)}
            </div>
          </div>

          <div className="mhsaSignalsControls">
            <button
              className="mhsaSigBtn mhsaSigBtn--primary"
              onClick={handleNormal}
            >
              Normal Operation
            </button>
            <button
              className="mhsaSigBtn mhsaSigBtn--accent"
              onClick={handleExpedited}
            >
              Expedited
            </button>
            <button
              className="mhsaSigBtn mhsaSigBtn--danger"
              onClick={handleProblem}
            >
              Problem
            </button>
            <button
              className="mhsaSigBtn mhsaSigBtn--ghost"
              onClick={resetDemoBaseline}
              title="Stop + reset demo"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mhsaSignalsTableWrap">
          <table className="mhsaSignalsTable">
            <thead>
              <tr>
                <th className="mhsaThSignal">Signal</th>

                {MILESTONES.map((m, idx) => (
                  <th
                    key={m.key}
                    className={`mhsaThMilestone ${idx === 2 || idx === 5 || idx === 7 ? "mhsaThSectionBreak" : ""}`}
                  >
                    <div className="mhsaMilestoneHead">
                      <span
                        className="material-symbols-outlined mhsaMilestoneIcon"
                        aria-hidden="true"
                      >
                        {m.icon}
                      </span>
                      <div className="mhsaMilestoneLabel">{m.label}</div>
                    </div>
                  </th>
                ))}

                <th className="mhsaThOwner">Owner</th>
                <th className="mhsaThTotal">Total</th>
              </tr>
            </thead>

            <tbody>
              {sortedSignals.map((sig) => {
                const totalElapsed = computeTotalElapsedApprox(sig);

                return (
                  <tr
                    key={sig.id}
                    className={isExpedite(sig) ? "mhsaRowExpedite" : ""}
                  >
                    <td className="mhsaTdSignal">
                      <div className="mhsaSignalNameRow">
                        <span
                          className={`mhsaPrioBadge ${isExpedite(sig) ? "mhsaPrioBadge--expedite" : ""}`}
                        >
                          {isExpedite(sig) ? "EXPEDITE" : "NORMAL"}
                        </span>
                        <span className="mhsaSignalName">{sig.name}</span>
                      </div>
                      <div className="mhsaSignalMeta">
                        FIFO #{sig.fifoIndex}
                      </div>
                    </td>

                    {sig.steps.map((step, idx) => {
                      const isActive = step.status === "active";
                      const isDone = step.status === "done";

                      let cellText = "";
                      let cellClass = "mhsaTdMilestone";

                      if (isDone) {
                        const remFinish =
                          step.remainingAtFinishSec ??
                          plausibleCompletedRemaining();
                        cellText = `-${fmtHMS(remFinish)}`;
                        cellClass += " mhsaCellDone";
                      }

                      if (isActive) {
                        const rem = step.remainingSec ?? 0;

                        if (rem > WARNING_SEC) cellClass += " mhsaCellActive";
                        if (rem <= WARNING_SEC && rem > 0)
                          cellClass += " mhsaCellWarn";
                        if (rem === 0) {
                          cellClass += " mhsaCellZero"; // SLA breach moment
                        } else if (rem < 0) {
                          cellClass += " mhsaCellLate"; // overtime
                          if (rem < 0) cellClass += " mhsaCellPlaque";
                        }

                        if (step.expediteGlow) cellClass += " mhsaCellInverse";

                        cellText =
                          rem > 0
                            ? `-${fmtHMS(rem)}` // counting DOWN
                            : rem === 0
                              ? "0:00:00" // zero moment
                              : `+${fmtHMS(Math.abs(rem))}`; // counting UP (overtime)
                      }

                      if (step.status === "todo") {
                        cellText = "";
                        cellClass += " mhsaCellTodo";
                      }

                      if (idx === 2 || idx === 5 || idx === 7)
                        cellClass += " mhsaCellSectionBreak";

                      return (
                        <td
                          key={step.key}
                          className={cellClass}
                          title={
                            isActive
                              ? "Active milestone"
                              : isDone
                                ? "Completed"
                                : ""
                          }
                        >
                          <span className="mhsaCellTimer">{cellText}</span>
                        </td>
                      );
                    })}

                    <td className="mhsaTdOwner">{sig.owner}</td>
                    <td className="mhsaTdTotal">{fmtHMS(totalElapsed)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mhsaSignalsFooter">
          <div className="mhsaStatCard">
            <div className="mhsaStatLabel">On-Time Signals (demo)</div>
            <div className="mhsaStatValue">{stats.onTimeSignals}</div>
          </div>
          <div className="mhsaStatCard">
            <div className="mhsaStatLabel">Total Minutes Late (demo)</div>
            <div className="mhsaStatValue">{stats.minutesLate}</div>
          </div>
          <div className="mhsaStatCard">
            <div className="mhsaStatLabel">Active Escalations (demo)</div>
            <div className="mhsaStatValue">{stats.activeEscalations}</div>
          </div>

          <div className="mhsaFooterHint">
            Mode: <span className="mhsaFooterMode">{mode}</span> • Timers:{" "}
            <span
              className={`mhsaFooterMode ${running ? "mhsaFooterMode--ok" : "mhsaFooterMode--muted"}`}
            >
              {running ? "running" : "stopped"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
