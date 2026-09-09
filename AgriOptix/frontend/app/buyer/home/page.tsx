"use client";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { Package, ClipboardList, Truck } from "lucide-react";
import { useWorkflow } from "../../../lib/store";

export default function BuyerHome() {
  const router = useRouter();
  const { wf } = useWorkflow();

  return (
    <div className="step-shell">
      <header className="step-shell-header">
        <div className="step-shell-brand"><div className="brandmark small"><Leaf size={16} /></div><b>AgriOptix</b></div>
      </header>
      <main className="step-shell-main">
        <div className="home-greeting">Welcome, {wf.farmer?.name || "Buyer"} 👋</div>
        <div className="home-sub">Buyer Dashboard</div>
        <div className="home-grid">
          <div className="home-tile" onClick={() => router.push("/buyer/produce")}>
            <b><Package size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Available Produce</b>
            <strong>Browse listings</strong>
          </div>
          <div className="home-tile" onClick={() => router.push("/buyer/produce")}>
            <b><ClipboardList size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Requirements</b>
            <strong>Set demand</strong>
          </div>
          <div className="home-tile" onClick={() => router.push("/buyer/orders")}>
            <b><Truck size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />Active Orders</b>
            <strong>Track shipments</strong>
          </div>
        </div>
      </main>
    </div>
  );
}
