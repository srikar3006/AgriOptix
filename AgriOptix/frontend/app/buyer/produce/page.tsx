"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { api } from "../../../lib/store";

export default function AvailableProduce() {
  const router = useRouter();
  const [farmers, setFarmers] = useState<any[]>([]);

  useEffect(() => {
    api("/api/aggregation/cluster", { method: "POST" }).then((res) => setFarmers(res.farmers || []));
  }, []);

  return (
    <StepShell eyebrow="QUALITY & QUANTITY REVIEW" title="Available Produce Near You" step={3} totalSteps={7} backHref="/buyer/home" wide>
      <div className="buyers">
        {(farmers.length ? farmers : [{ name: "Farmer 1", quantity_kg: 450 }]).map((f: any) => (
          <div className="card buyer" key={f.name}>
            <div className="buyer-top"><b>{f.name}</b><span>Tomato · Grade A</span></div>
            <div className="price">{f.quantity_kg}<small>kg available</small></div>
            <div className="buyer-grid"><span>Expected arrival: Today</span><span>Quality verified</span></div>
          </div>
        ))}
      </div>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/buyer/orders")}>Place Order</button>
      </div>
    </StepShell>
  );
}
