"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

const METRICS = [
  { label: "Price Error", value: "4.2%" },
  { label: "Quality Error", value: "3.1%" },
  { label: "Shelf-Life Error", value: "6.8%" },
  { label: "Transport Cost Error", value: "5.5%" },
  { label: "Delivery Time Error", value: "7.2%" },
  { label: "Value Loss Error", value: "8.1%" },
];

export default function LearningLoop() {
  const router = useRouter();
  const { wf } = useWorkflow();

  useEffect(() => {
    if (wf.settlement) {
      api("/api/feedback", { method: "POST" }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepShell eyebrow="CONTINUOUS LEARNING" title="Predict → Transact → Observe → Learn" step={17} totalSteps={19} backHref="/farmer/earnings" wide>
      <p className="step-subtitle">
        This completed transaction feeds actual price, quality, shelf-life, transport and delivery outcomes back into the model so future recommendations improve.
      </p>
      <div className="learning-grid">
        {METRICS.map((m) => (
          <div key={m.label}><b>{m.label}</b><strong>{m.value}</strong></div>
        ))}
      </div>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/farmer/home")}>Done — Back to Home</button>
        <button className="secondary" onClick={() => router.push("/farmer/harvest")}>Sell Another Harvest</button>
      </div>
    </StepShell>
  );
}
