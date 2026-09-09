"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function MarketIntelligence() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [buyers, setBuyers] = useState<any[]>(wf.buyers?.length ? wf.buyers : []);

  useEffect(() => {
    if (wf.buyers?.length) return;
    api("/api/markets").then((b) => {
      setBuyers(b);
      setWf({ buyers: b });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crop = wf.harvest?.crop || "Tomato";
  const prices = buyers.map((b) => b.price);
  const min = prices.length ? Math.min(...prices) : 24;
  const max = prices.length ? Math.max(...prices) : 28;

  return (
    <StepShell eyebrow="MARKET INTELLIGENCE" title="Market Overview" step={6} totalSteps={19} backHref="/farmer/perishability" wide>
      <div className="card" style={{ maxWidth: 700, marginBottom: 24 }}>
        <div className="card-head"><span>{crop}</span><span className="pill green">+5% this week</span></div>
        <div className="price">₹{min}–{max}<small>/kg current market range</small></div>
        <div className="buyer-grid" style={{ marginTop: 14 }}>
          <span>{buyers.length} available buyers</span>
          <span>Demand: High</span>
        </div>
      </div>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/farmer/buyers")}>Compare Buyers</button>
      </div>
    </StepShell>
  );
}
