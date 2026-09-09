"use client";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { useWorkflow } from "../../../lib/store";

const PICKUPS = [
  { name: "Farm A", time: "8:30 AM", qty: "800 kg Tomato" },
  { name: "Farm B", time: "10:15 AM", qty: "300 kg Tomato" },
  { name: "Farm C", time: "12:00 PM", qty: "450 kg Tomato" },
];

export default function DriverHome() {
  const router = useRouter();
  const { wf } = useWorkflow();

  return (
    <div className="step-shell">
      <header className="step-shell-header">
        <div className="step-shell-brand"><div className="brandmark small"><Leaf size={16} /></div><b>AgriOptix</b></div>
      </header>
      <main className="step-shell-main">
        <div className="home-greeting">Good morning, {wf.farmer?.name?.split(" ")[0] || "Driver"} 👋</div>
        <div className="home-sub">Today's Route · {PICKUPS.length} Pickups</div>
        <div className="stop-list">
          {PICKUPS.map((p) => (
            <div className="stop-row" key={p.name}>
              <div><b>{p.name}</b><span>{p.qty}</span></div>
              <span className="time">{p.time}</span>
            </div>
          ))}
        </div>
        <button className="primary" onClick={() => router.push("/driver/pickup")}>Start Route</button>
      </main>
    </div>
  );
}
