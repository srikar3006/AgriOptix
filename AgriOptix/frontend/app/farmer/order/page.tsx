"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function OrderConfirmation() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [order, setOrder] = useState<any>(wf.order);

  useEffect(() => {
    if (wf.order) return;
    api("/api/orders", { method: "POST" }).then((res) => {
      setOrder(res);
      setWf({ order: res, orderStatus: "PLANNED" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opt = wf.optimization;

  return (
    <StepShell eyebrow="ORDER CONFIRMATION" title="Your order is confirmed" step={12} totalSteps={19} backHref="/farmer/optimization">
      <div className="order-id">Order #ORD-2025-{String(order?.id ?? 1).padStart(3, "0")}</div>
      <div className="buyer-grid" style={{ marginBottom: 20 }}>
        <span>Status: PLANNED</span>
        <span>Buyer: {order?.buyer || opt?.selected_buyer}</span>
        <span>Quantity: {order?.quantity_kg} kg</span>
        <span>Vehicle: {opt?.vehicle}</span>
        <span>Pickup: Tomorrow, 8:00 AM</span>
        <span>Route: {opt?.route}</span>
      </div>
      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/farmer/tracking")}>Track Shipment</button>
      </div>
    </StepShell>
  );
}
