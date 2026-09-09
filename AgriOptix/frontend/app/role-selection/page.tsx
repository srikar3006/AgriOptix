"use client";
import { useRouter } from "next/navigation";
import { Sprout, Store, Truck } from "lucide-react";
import StepShell from "../../components/StepShell";
import { useWorkflow, Role } from "../../lib/store";

const ROLES: { id: Role; icon: any; title: string; desc: string; href: string }[] = [
  { id: "farmer", icon: Sprout, title: "Farmer / Seller", desc: "Sell harvest. Get AI-powered market and buyer recommendations.", href: "/farmer/onboarding" },
  { id: "buyer", icon: Store, title: "Buyer", desc: "Find quality produce. Manage demand and procurement.", href: "/buyer/onboarding" },
  { id: "driver", icon: Truck, title: "Driver / Transporter", desc: "Manage pickup. Follow optimized routes. Track deliveries.", href: "/driver/onboarding" },
];

export default function RoleSelection() {
  const router = useRouter();
  const { setWf } = useWorkflow();

  function choose(role: Role, href: string) {
    setWf({ role });
    router.push(href);
  }

  return (
    <StepShell eyebrow="GET STARTED" title="How will you use AgriOptix?" backHref="/welcome">
      <div className="role-grid">
        {ROLES.map((r) => (
          <button key={r.id} className="role-card" onClick={() => choose(r.id, r.href)}>
            <div className="role-icon">
              <r.icon size={22} />
            </div>
            <div>
              <b>{r.title}</b>
              <span>{r.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </StepShell>
  );
}
