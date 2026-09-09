"use client";
import { useRouter } from "next/navigation";
import { Sprout, ShoppingCart, Truck, Leaf, Globe, ArrowRight } from "lucide-react";
import { useWorkflow, Role } from "../../lib/store";

const ROLES: {
  id: Role;
  key: "farmer" | "buyer" | "transporter";
  icon: any;
  heading: string;
  tagline: string;
  desc: string;
  cta: string;
  photo: string;
  href: string;
}[] = [
  {
    id: "farmer",
    key: "farmer",
    icon: Sprout,
    heading: "I'm a Farmer / Seller",
    tagline: "Sell my harvest smarter",
    desc: "Get the best market, fair price and complete support from harvest to payment.",
    cta: "Continue as Farmer",
    photo: "/card-farmer.jpg",
    href: "/farmer/onboarding",
  },
  {
    id: "buyer",
    key: "buyer",
    icon: ShoppingCart,
    heading: "I'm a Buyer",
    tagline: "Find the right supply",
    desc: "Source quality produce, at the right price, with reliable delivery and full transparency.",
    cta: "Continue as Buyer",
    photo: "/card-buyer.jpg",
    href: "/buyer/onboarding",
  },
  {
    id: "driver",
    key: "transporter",
    icon: Truck,
    heading: "I'm a Transporter",
    tagline: "Move produce efficiently",
    desc: "Get optimized loads, pickup routes and delivery tasks to maximize your earnings.",
    cta: "Continue as Transporter",
    photo: "/card-transporter.jpg",
    href: "/driver/onboarding",
  },
];

export default function RoleSelection() {
  const router = useRouter();
  const { setWf } = useWorkflow();

  function choose(role: Role, href: string) {
    setWf({ role });
    router.push(href);
  }

  return (
    <div className="rs-page">
      <div className="rs-bg" />
      <div className="rs-bg-scrim" />

      <header className="rs-header">
        <div className="rs-brand">
          <div className="brandmark small">
            <Leaf size={16} />
          </div>
          <b>AgriOptix</b>
          <span className="rs-brand-divider" />
          <span className="rs-brand-tagline">
            AI-Powered Farm-to-Market Optimization &amp; Execution Platform
          </span>
        </div>
        <div className="rs-header-right">
          <span className="rs-lang">
            <Globe size={15} /> EN
          </span>
          <span>Already have an account?</span>
          <button className="rs-login-btn" onClick={() => router.push("/role-selection")}>
            Login
          </button>
        </div>
      </header>

      <main className="rs-main">
        <div className="rs-eyebrow">
          <Leaf size={14} /> Welcome to AgriOptix
        </div>
        <h1>
          How can AgriOptix
          <br />
          <span className="accent">help you</span> today?
        </h1>
        <p className="rs-sub">We&rsquo;ll show you only what you need.</p>

        <div className="rs-cards">
          {ROLES.map((r) => (
            <div className={`rs-card ${r.key}`} key={r.id}>
              <div
                className="rs-card-photo"
                style={{ backgroundImage: `url(${r.photo})` }}
              >
                <div className="rs-card-badge">
                  <r.icon size={22} />
                </div>
              </div>
              <div className="rs-card-body">
                <h3>{r.heading}</h3>
                <div className="rs-card-tagline">{r.tagline}</div>
                <p>{r.desc}</p>
                <button className="rs-card-cta" onClick={() => choose(r.id, r.href)}>
                  {r.cta} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rs-footer-note">
          <Leaf size={12} /> You can change your role later.
        </div>
      </main>
    </div>
  );
}