"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function Settlement() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [s, setS] = useState<any>(wf.settlement);

  useEffect(() => {
    if (wf.settlement) return;
    api("/api/settlements/1").then((res) => {
      setS(res);
      setWf({ settlement: res, orderStatus: "SETTLED" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepShell eyebrow="SETTLEMENT" title="Settlement Details" step={15} totalSteps={19} backHref="/farmer/verification">
      <div className="ledger">
        <span>Sale Value</span><b>₹{(s?.sale_value ?? 40300).toLocaleString("en-IN")}</b>
        <span>Transport Cost</span><b>− ₹{(s?.logistics_cost ?? 4185).toLocaleString("en-IN")}</b>
        <span>Handling Cost</span><b>− ₹{(s?.handling_cost ?? 700).toLocaleString("en-IN")}</b>
        <hr />
        <span>Farmer Net Settlement</span><strong>₹{(s?.net_settlement ?? 35400).toLocaleString("en-IN")}</strong>
      </div>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/farmer/earnings")}>Settlement Completed</button>
      </div>
    </StepShell>
  );
}
