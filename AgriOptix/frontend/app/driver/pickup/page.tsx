"use client";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function DriverPickup() {
  const router = useRouter();
  const { setWf } = useWorkflow();

  async function confirmPickup() {
    try {
      await api("/api/orders/1/status", { method: "PATCH", body: JSON.stringify({ status: "PICKED_UP" }) });
    } catch {}
    setWf({ orderStatus: "PICKED_UP" });
    router.push("/driver/tracking");
  }

  return (
    <StepShell eyebrow="PICKUP VERIFICATION" title="Farm A · Tomato" step={3} totalSteps={5} backHref="/driver/home">
      <div className="verify-grid">
        <div><small>Expected Quantity</small><b>800 kg</b></div>
        <div><small>Crop</small><b>Tomato · Grade A</b></div>
      </div>
      <div className="step-actions">
        <button className="secondary" onClick={() => router.push("/driver/home")}>Mark Arrived</button>
        <button className="primary" onClick={confirmPickup}>Confirm Pickup</button>
      </div>
    </StepShell>
  );
}
