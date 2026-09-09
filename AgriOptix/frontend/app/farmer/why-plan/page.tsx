"use client";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import StepShell from "../../../components/StepShell";
import { useWorkflow } from "../../../lib/store";

export default function WhyPlan() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const opt = wf.optimization;
  const why = opt?.why || [
    "Better price-to-cost balance",
    "Lower transport cost",
    "Lower expected value loss",
    "Matches crop quality",
    "Matches buyer demand",
    "Within shelf-life window",
    "Reliable buyer",
  ];

  function accept() {
    setWf({ acceptedPlan: true });
    router.push("/farmer/aggregation");
  }

  return (
    <StepShell eyebrow="EXPLAINABILITY" title="Why this plan?" step={9} totalSteps={19} backHref="/farmer/selling-plan">
      <div className="indicator-list">
        {why.map((x: string) => (
          <div className="indicator" key={x}><CheckCircle2 size={16} /> {x}</div>
        ))}
      </div>
      {opt?.rejected_reason && (
        <div className="rejected" style={{ marginTop: 10 }}><b>Why not the other buyers?</b> {opt.rejected_reason}</div>
      )}
      <div className="step-actions">
        <button className="primary" onClick={accept}>Accept Plan</button>
      </div>
    </StepShell>
  );
}
