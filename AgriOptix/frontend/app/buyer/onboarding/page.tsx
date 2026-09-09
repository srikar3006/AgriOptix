"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow } from "../../../lib/store";

export default function BuyerOnboarding() {
  const router = useRouter();
  const { setWf } = useWorkflow();
  const [form, setForm] = useState({ business: "", location: "", crops: "" });

  function next() {
    setWf({ farmer: { name: form.business, mobile: "", language: "", village: form.location, crops: form.crops } });
    router.push("/buyer/home");
  }

  return (
    <StepShell eyebrow="BUYER REGISTRATION" title="Tell us about your business" step={1} totalSteps={7} backHref="/role-selection">
      <div className="form-card">
        <label>Business Name<input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder="Hyderabad Fresh Mart" /></label>
        <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Hyderabad, Telangana" /></label>
        <label>Crops You Procure<input value={form.crops} onChange={(e) => setForm({ ...form, crops: e.target.value })} placeholder="Tomato, Onion" /></label>
      </div>
      <div className="step-actions">
        <button className="primary" disabled={!form.business} onClick={next}>Continue</button>
      </div>
    </StepShell>
  );
}
