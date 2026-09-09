"use client";
import { useRouter } from "next/navigation";
import { Plus, Truck, Wallet, Sparkles, Bell } from "lucide-react";
import { useWorkflow } from "../../../lib/store";
import { Leaf } from "lucide-react";

export default function FarmerHome() {
  const router = useRouter();
  const { wf } = useWorkflow();
  const name = wf.farmer?.name?.split(" ")[0] || "there";
  const hasActiveShipment = !!wf.order;

  return (
    <div className="step-shell">
      <header className="step-shell-header">
        <div className="step-shell-brand">
          <div className="brandmark small"><Leaf size={16} /></div>
          <b>AgriOptix</b>
        </div>
        <button className="ghost" onClick={() => router.push("/farmer/dashboard")}>Full Overview</button>
      </header>
      <main className="step-shell-main">
        <div className="home-greeting">Good morning, {name} 👋</div>
        <div className="home-sub">Farmer Dashboard</div>

        <button className="home-cta" onClick={() => router.push("/farmer/harvest")}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Plus size={20} /> Add Harvest
          </span>
        </button>

        <div className="home-grid">
          <div className="home-tile" onClick={() => hasActiveShipment ? router.push("/farmer/tracking") : router.push("/farmer/harvest")}>
            <b><Truck size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Active Shipment</b>
            <strong>{hasActiveShipment ? wf.orderStatus.replaceAll("_", " ") : "None yet"}</strong>
          </div>
          <div className="home-tile" onClick={() => router.push("/farmer/earnings")}>
            <b><Wallet size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Recent Earnings</b>
            <strong>{wf.settlement ? `₹${wf.settlement.net_settlement?.toLocaleString("en-IN")}` : "₹0"}</strong>
          </div>
          <div className="home-tile" onClick={() => router.push("/farmer/market")}>
            <b><Sparkles size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Recommendations</b>
            <strong>{wf.optimization ? wf.optimization.selected_buyer : "Add a harvest to see"}</strong>
          </div>
          <div className="home-tile" onClick={() => router.push("/farmer/learning")}>
            <b><Bell size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Learning</b>
            <strong>Model performance</strong>
          </div>
        </div>

        <div className="notif-list">
          <div className="notif-row">Buyer B is paying the best net price for tomatoes in your area today.</div>
          <div className="notif-row">Aggregation hub near Kothur is accepting produce until 6 PM.</div>
        </div>
      </main>
    </div>
  );
}
