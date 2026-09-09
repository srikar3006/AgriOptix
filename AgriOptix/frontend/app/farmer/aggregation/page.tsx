"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function SmartAggregation() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [agg, setAgg] = useState<any>(wf.aggregation);

  useEffect(() => {
    if (wf.aggregation) return;
    api("/api/aggregation/cluster", { method: "POST" }).then((res) => {
      setAgg(res);
      setWf({ aggregation: res });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepShell eyebrow="SMART AGGREGATION" title="Nearby Farmers Aggregated" step={10} totalSteps={19} backHref="/farmer/why-plan" wide>
      <div className="map-placeholder">
        <svg viewBox="0 0 400 230" xmlns="http://www.w3.org/2000/svg">
          <circle cx="70" cy="60" r="6" fill="#3d6c1e" /><circle cx="140" cy="110" r="6" fill="#3d6c1e" />
          <circle cx="90" cy="170" r="6" fill="#3d6c1e" /><circle cx="230" cy="115" r="10" fill="#173221" />
          <path d="M70,60 L230,115 M140,110 L230,115 M90,170 L230,115" stroke="#8fc94c" strokeWidth="2" strokeDasharray="5 4" fill="none" />
          <text x="245" y="120" fontSize="11" fill="#173221" fontFamily="Manrope" fontWeight="700">{agg?.aggregation_point || "Aggregation Point"}</text>
        </svg>
      </div>
      <div className="agg-stats">
        <div><small>Farmers</small><strong>{agg?.farmers?.length ?? 3}</strong></div>
        <div><small>Total Quantity</small><strong>{(agg?.total_kg ?? 1100).toLocaleString("en-IN")} kg</strong></div>
        <div><small>Aggregation Point</small><strong>{agg?.aggregation_point || "Kothur"}</strong></div>
        <div><small>Reduced Transport Cost</small><strong>-28%</strong></div>
      </div>
      <div className="farmer-chip-list">
        {(agg?.farmers || []).map((f: any) => (
          <span className="farmer-chip" key={f.name}>{f.name} · {f.quantity_kg} kg</span>
        ))}
      </div>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/farmer/optimization")}>Confirm Aggregation</button>
      </div>
    </StepShell>
  );
}
