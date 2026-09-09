"use client";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";

export default function Welcome() {
  const router = useRouter();
  return (
    <div className="step-shell">
      <header className="step-shell-header">
        <div className="step-shell-brand">
          <div className="brandmark small"><Leaf size={16} /></div>
          <b>AgriOptix</b>
        </div>
      </header>
      <main className="step-shell-main">
        <div className="welcome-hero">
          <div className="brandmark"><Leaf size={30} /></div>
          <h1>AgriOptix</h1>
          <span className="tagline">Sell smarter. Earn better.</span>
          <p>
            From harvest to market, AgriOptix finds the better way — matching your crop
            with the right buyer, the right vehicle and the right moment to sell.
          </p>
          <div className="welcome-actions">
            <button className="primary" onClick={() => router.push("/role-selection")}>
              Get Started
            </button>
            <button className="secondary" onClick={() => router.push("/role-selection")}>
              Login
            </button>
          </div>
          <div className="welcome-login">
            Already registered? <a onClick={() => router.push("/role-selection")}>Login</a>
          </div>
        </div>
      </main>
    </div>
  );
}
