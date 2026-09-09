"use client";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow } from "../../../lib/store";

export default function Earnings() {
  const router = useRouter();
  const { wf } = useWorkflow();
  const net = wf.settlement?.net_settlement ?? 34385;

  return (
    <StepShell eyebrow="EARNINGS" title="Your Earnings" step={16} totalSteps={19} backHref="/farmer/settlement">
      <div className="earn-total">
        <small>Total earnings</small>
        <strong>₹{net.toLocaleString("en-IN")}</strong>
      </div>
      <div className="earn-list">
        <div className="earn-row"><span>{wf.harvest?.crop || "Tomato"} · {wf.order?.quantity_kg || 1550} kg</span><b>₹{net.toLocaleString("en-IN")}</b></div>
        <div className="earn-row"><span>Buyer</span><b>{wf.order?.buyer || wf.optimization?.selected_buyer || "Buyer B"}</b></div>
        <div className="earn-row"><span>Status</span><b>Completed</b></div>
      </div>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/farmer/learning")}>View Learning Loop</button>
        <button className="secondary" onClick={() => router.push("/farmer/home")}>Back to Home</button>
      </div>
    </StepShell>
  );
}
