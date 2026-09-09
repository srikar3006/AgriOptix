"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function FarmerOnboarding() {
  const router = useRouter();
  const { setWf } = useWorkflow();
  const [form, setForm] = useState({ name: "", mobile: "", language: "Telugu", village: "", crops: "" });
  const [saving, setSaving] = useState(false);

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function useLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => update("village", `Lat ${pos.coords.latitude.toFixed(3)}, Lng ${pos.coords.longitude.toFixed(3)}`),
      () => {}
    );
  }

  async function next() {
    setSaving(true);
    try {
      await api("/api/farmers", { method: "POST", body: JSON.stringify(form) });
    } catch {}
    setWf({ farmer: form });
    setSaving(false);
    router.push("/farmer/home");
  }

  return (
    <StepShell eyebrow="FARMER REGISTRATION" title="Tell us about you" step={1} totalSteps={19} backHref="/role-selection">
      <div className="form-card">
        <label>
          Full Name
          <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ravi Kumar" />
        </label>
        <label>
          Mobile Number
          <input value={form.mobile} onChange={(e) => update("mobile", e.target.value)} placeholder="+91 98765 43210" />
        </label>
        <label>
          Preferred Language
          <input value={form.language} onChange={(e) => update("language", e.target.value)} />
        </label>
        <label>
          Village / Location
          <input value={form.village} onChange={(e) => update("village", e.target.value)} placeholder="Kothur, Mahabubnagar" />
        </label>
        <button type="button" className="secondary" onClick={useLocation} style={{ display: "flex", gap: 8, alignItems: "center", width: "fit-content" }}>
          <MapPin size={14} /> Use current location
        </button>
        <label>
          Crops You Grow
          <input value={form.crops} onChange={(e) => update("crops", e.target.value)} placeholder="Tomato, Chilli, Onion" />
        </label>
      </div>
      <div className="step-actions">
        <button className="primary" disabled={!form.name || !form.mobile || saving} onClick={next}>
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </StepShell>
  );
}
