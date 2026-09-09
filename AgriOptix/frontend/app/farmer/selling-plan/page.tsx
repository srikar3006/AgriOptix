"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function SellingPlan() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [opt, setOpt] = useState<any>(wf.optimization);
  const [loading, setLoading] = useState(!wf.optimization);

  useEffect(() => {
    if (wf.optimization) return;
    api("/api/optimization/run", { method: "POST" }).then((res) => {
      setOpt(res);
      setWf({ optimization: res });
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepShell eyebrow="OPTIMAL SELLING PLAN" title={loading ? "Building your plan…" : opt?.selected_buyer} step={8} totalSteps={19} backHref="/farmer/buyers">
      {!loading && opt && (
        <>
          <div className="net"><small>Expected Net Realization</small><strong>₹{opt.net_realized_return?.toLocaleString("en-IN")}</strong></div>
          <div className="plan-row" style={{ marginBottom: 6 }}><b>{opt.quantity_kg} kg</b><span>•</span><span>{opt.vehicle}</span></div>
          <div className="route">
            <span>Farm</span><ArrowRight size={14} /><span>Aggregation</span><ArrowRight size={14} /><span>{opt.selected_buyer}</span>
          </div>
          <div className="buyer-grid" style={{ marginBottom: 20 }}>
            <span>Delivery: {opt.delivery}</span>
            <span>Expected value loss: ₹{opt.expected_value_loss}</span>
          </div>
          <div className="step-actions">
            <button className="secondary" onClick={() => router.push("/farmer/why-plan")}>Why This Plan?</button>
            <button className="primary" onClick={() => router.push("/farmer/why-plan")}>Continue</button>
          </div>
        </>
      )}
    </StepShell>
  );
}
