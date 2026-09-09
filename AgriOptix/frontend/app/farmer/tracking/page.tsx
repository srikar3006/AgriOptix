"use client";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

const STAGES = ["PLANNED", "PICKUP_ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];

export default function Tracking() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const idx = STAGES.indexOf(wf.orderStatus);

  async function advance() {
    const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
    try {
      await api("/api/orders/1/status", { method: "PATCH", body: JSON.stringify({ status: next }) });
    } catch {}
    setWf({ orderStatus: next });
    if (next === "DELIVERED") router.push("/farmer/verification");
  }

  return (
    <StepShell eyebrow="LIVE TRACKING" title="Shipment Tracking" step={13} totalSteps={19} backHref="/farmer/order">
      <div className="map-placeholder">
        <svg viewBox="0 0 400 230" xmlns="http://www.w3.org/2000/svg">
          <path d="M30,190 C130,80 270,190 370,60" stroke="#8fc94c" strokeWidth="3" fill="none" strokeDasharray="7 5" />
          <circle cx={30 + (idx / (STAGES.length - 1)) * 340} cy={190 - (idx / (STAGES.length - 1)) * 130} r="8" fill="#173221" />
        </svg>
      </div>
      <div className="status-list">
        {STAGES.map((s, i) => (
          <div key={s} className={"status-row " + (i < idx ? "done" : i === idx ? "current" : "")}>
            {s.replaceAll("_", " ")}
          </div>
        ))}
      </div>
      <div className="step-actions">
        <button className="primary" disabled={idx >= STAGES.length - 1} onClick={advance}>
          {idx >= STAGES.length - 1 ? "Arrived — proceed to verification" : "Simulate: Advance Shipment"}
        </button>
        {idx >= STAGES.length - 1 && (
          <button className="secondary" onClick={() => router.push("/farmer/verification")}>Continue</button>
        )}
      </div>
    </StepShell>
  );
}
