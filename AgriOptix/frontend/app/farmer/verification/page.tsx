"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function DeliveryVerification() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const expected = wf.harvest?.quantity_kg || 1550;
  const received = wf.order?.quantity_kg || expected;

  function setDigit(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
  }

  async function confirm() {
    setVerifying(true);
    let res;
    try {
      res = await api("/api/delivery/verify", { method: "POST" });
    } catch {
      res = { verified: true, received_quantity: received };
    }
    setWf({ orderStatus: "VERIFIED" });
    setVerifying(false);
    router.push("/farmer/settlement");
  }

  return (
    <StepShell eyebrow="DELIVERY VERIFICATION" title="Confirm the delivery" step={14} totalSteps={19} backHref="/farmer/tracking">
      <div className="verify-grid">
        <div><small>Expected Quantity</small><b>{expected} kg</b></div>
        <div><small>Received Quantity</small><b>{received} kg</b></div>
        <div><small>Difference</small><b>{received - expected} kg</b></div>
        <div><small>Timestamp</small><b>{new Date().toLocaleTimeString()}</b></div>
      </div>
      <label style={{ fontSize: 11, color: "#69766d" }}>OTP Verification</label>
      <div className="otp-row">
        {otp.map((d, i) => (
          <input key={i} value={d} maxLength={1} onChange={(e) => setDigit(i, e.target.value)} />
        ))}
      </div>
      <div className="step-actions">
        <button className="primary" disabled={otp.some((d) => !d) || verifying} onClick={confirm}>
          {verifying ? "Confirming…" : "Confirm Pickup"}
        </button>
      </div>
    </StepShell>
  );
}
