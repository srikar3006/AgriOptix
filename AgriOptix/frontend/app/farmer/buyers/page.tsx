"use client";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow } from "../../../lib/store";

export default function BuyerComparison() {
  const router = useRouter();
  const { wf } = useWorkflow();
  const buyers = wf.buyers?.length ? wf.buyers : [];
  const best = buyers.length
    ? buyers.reduce((a, b) => ((b.price - b.transport - b.loss) > (a.price - a.transport - a.loss) ? b : a))
    : null;

  return (
    <StepShell eyebrow="BUYER COMPARISON" title="Compare your buyers" step={7} totalSteps={19} backHref="/farmer/market" wide>
      <div className="buyers">
        {buyers.map((b) => {
          const net = (b.price - b.transport - b.loss).toFixed(1);
          const isBest = best && b.name === best.name;
          return (
            <div className={"card buyer" + (isBest ? " selected" : "")} key={b.name}>
              <div className="buyer-top">
                <div><b>{b.name}</b><span>{b.demand} demand · Grade {b.quality}</span></div>
                {isBest && <span className="pill green">RECOMMENDED</span>}
              </div>
              <div className="price">₹{b.price}<small>/kg</small></div>
              <div className="buyer-grid">
                <span>Distance: {b.distance_km} km</span>
                <span>Transport: ₹{b.transport}/kg</span>
                <span>Expected loss: ₹{b.loss}/kg</span>
                <span>{b.reliability}% reliable</span>
              </div>
              <div className="realized"><small>Net realized</small><b>₹{net}/kg</b></div>
            </div>
          );
        })}
      </div>
      <p className="step-subtitle" style={{ marginTop: 20 }}>
        Recommendation is based on net realized return (price minus transport minus expected value loss), not simply the highest quoted price.
      </p>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/farmer/selling-plan")}>See Selling Plan</button>
      </div>
    </StepShell>
  );
}
