"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function AddHarvest() {
  const router = useRouter();
  const { setWf } = useWorkflow();
  const [crop, setCrop] = useState("Tomato");
  const [quantity, setQuantity] = useState("1550");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("Use current location");
  const [saving, setSaving] = useState(false);

  async function next() {
    setSaving(true);
    let harvest;
    try {
      harvest = await api("/api/harvests", {
        method: "POST",
        body: JSON.stringify({ crop, quantity_kg: Number(quantity), harvest_time: date || null }),
      });
    } catch {
      harvest = { crop, quantity_kg: Number(quantity), harvest_time: date };
    }
    setWf({ harvest, photos: [] });
    setSaving(false);
    router.push("/farmer/photos");
  }

  return (
    <StepShell eyebrow="ADD HARVEST" title="What did you harvest?" step={2} totalSteps={19} backHref="/farmer/home">
      <div className="form-card">
        <label>
          Crop
          <select value={crop} onChange={(e) => setCrop(e.target.value)} style={{ width: "100%", padding: 12, marginTop: 6, borderRadius: 9, border: "1px solid #dfe6dd", background: "#fbfcfa" }}>
            <option>Tomato</option>
            <option>Chilli</option>
            <option>Onion</option>
            <option>Brinjal</option>
          </select>
        </label>
        <label>
          Quantity (kg)
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label>
          Harvest Date &amp; Time
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
      </div>
      <div className="step-actions">
        <button className="primary" disabled={!quantity || saving} onClick={next}>
          {saving ? "Saving…" : "Next"}
        </button>
      </div>
    </StepShell>
  );
}
