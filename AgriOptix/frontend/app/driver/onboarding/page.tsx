"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow } from "../../../lib/store";

export default function DriverOnboarding() {
  const router = useRouter();
  const { setWf } = useWorkflow();
  const [form, setForm] = useState({ name: "", vehicle: "1-Ton Truck", plate: "" });

  function next() {
    setWf({ farmer: { name: form.name, mobile: "", language: "", village: "", crops: form.vehicle } });
    router.push("/driver/home");
  }

  return (
    <StepShell eyebrow="DRIVER REGISTRATION" title="Set up your vehicle" step={1} totalSteps={5} backHref="/role-selection">
      <div className="form-card">
        <label>Full Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Suresh Reddy" /></label>
        <label>Vehicle Type<input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></label>
        <label>Number Plate<input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="TS 09 AB 1234" /></label>
      </div>
      <div className="step-actions">
        <button className="primary" disabled={!form.name} onClick={next}>Continue</button>
      </div>
    </StepShell>
  );
}
