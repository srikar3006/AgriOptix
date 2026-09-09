"use client";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function BuyerOrders() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();

  async function place() {
    const order = await api("/api/orders", { method: "POST" }).catch(() => ({ id: 1, status: "PLANNED" }));
    setWf({ order, orderStatus: "PLANNED" });
  }

  return (
    <StepShell eyebrow="PROCUREMENT" title="Your Orders" step={5} totalSteps={7} backHref="/buyer/produce">
      {!wf.order ? (
        <>
          <p className="step-subtitle">No active orders yet. Place an order from the recommended supplier match.</p>
          <div className="step-actions"><button className="primary" onClick={place}>Place Order</button></div>
        </>
      ) : (
        <>
          <div className="order-id">Order #ORD-2025-{String(wf.order.id).padStart(3, "0")}</div>
          <div className="buyer-grid" style={{ marginBottom: 20 }}>
            <span>Status: {wf.orderStatus}</span>
            <span>Quantity: {wf.order.quantity_kg} kg</span>
          </div>
          <div className="step-actions">
            <button className="primary" onClick={() => router.push("/farmer/tracking")}>Track Shipment</button>
          </div>
        </>
      )}
    </StepShell>
  );
}
