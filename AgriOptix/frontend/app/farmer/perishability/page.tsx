"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

function lossTier(loss: number) {
  if (loss < 1) return "low";
  if (loss < 3) return "medium";
  return "high";
}

export default function Perishability() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [p, setP] = useState<any>(wf.perishability);

  useEffect(() => {
    if (wf.perishability) return;
    api("/api/perishability/predict", { method: "POST" }).then((res) => {
      setP(res);
      setWf({ perishability: res });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const curve = p?.decay_curve || [
    { day: 0, loss_per_kg: 0 },
    { day: 1, loss_per_kg: 0.8 },
    { day: 2, loss_per_kg: 2.1 },
    { day: 3, loss_per_kg: 4.8 },
  ];

  return (
    <StepShell eyebrow="SHELF-LIFE / PERISHABILITY" title="Remaining Shelf Life" step={5} totalSteps={19} backHref="/farmer/quality">
      <div className="grade-badge" style={{ background: "#173221" }}>{p?.remaining_shelf_life_days ?? 3.2} days</div>
      <div className="urgency-banner">
        <AlertTriangle size={16} /> Urgency: {p?.urgency || "HIGH"} — selling sooner reduces expected value loss.
      </div>
      <div className="loss-curve">
        {curve.map((c: any) => (
          <div key={c.day} className={lossTier(c.loss_per_kg)}>
            <small>{c.day === 0 ? "Today" : `${c.day} day${c.day > 1 ? "s" : ""}`}</small>
            <b>{lossTier(c.loss_per_kg).toUpperCase()}</b>
          </div>
        ))}
      </div>
      <p className="step-subtitle" style={{ marginTop: 4 }}>
        Expected value loss: ₹{p?.expected_value_loss ?? 1100}. Selling within the recommended window keeps more of this value in your pocket.
      </p>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/farmer/market")}>Continue</button>
      </div>
    </StepShell>
  );
}
