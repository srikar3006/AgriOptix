"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function VehicleOptimization() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [route, setRoute] = useState<any>(wf.route);

  useEffect(() => {
    if (wf.route) return;
    api("/api/routes/calculate", { method: "POST" }).then((res) => {
      setRoute(res);
      setWf({ route: res });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opt = wf.optimization;

  return (
    <StepShell eyebrow="PERISHABILITY-AWARE VEHICLE OPTIMIZATION" title={opt?.vehicle || "2 × 1-Ton Truck"} step={11} totalSteps={19} backHref="/farmer/aggregation" wide>
      <div className="map-placeholder">
        <svg viewBox="0 0 400 230" xmlns="http://www.w3.org/2000/svg">
          <path d="M40,190 C120,60 260,200 360,50" stroke="#8fc94c" strokeWidth="3" fill="none" strokeDasharray="7 5" />
          <circle cx="40" cy="190" r="7" fill="#173221" /><circle cx="360" cy="50" r="7" fill="#3d6c1e" />
        </svg>
      </div>
      <div className="agg-stats">
        <div><small>Total Distance</small><strong>{route?.distance_km ?? 78} km</strong></div>
        <div><small>Estimated Time</small><strong>{Math.round((route?.travel_time_min ?? 155) / 60)}h {(route?.travel_time_min ?? 155) % 60}m</strong></div>
        <div><small>Vehicle</small><strong>{opt?.vehicle || "2 × 1-ton"}</strong></div>
        <div><small>Cost</small><strong>₹{opt?.transport_cost ?? 4185}</strong></div>
      </div>
      <p className="step-subtitle" style={{ marginTop: 4 }}>
        Route: {(route?.route || ["Farm", "Aggregation Point", opt?.selected_buyer || "Buyer"]).join(" → ")}. Pickup is sequenced to prioritize the most perishable loads first.
      </p>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/farmer/order")}>Confirm Order</button>
      </div>
    </StepShell>
  );
}
