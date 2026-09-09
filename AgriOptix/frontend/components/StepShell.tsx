"use client";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Leaf, ArrowLeft } from "lucide-react";

/**
 * Shared shell for every step in the guided journey (farmer / buyer / driver).
 * Shows brand, an optional linear progress bar, a back action, and the step content.
 * This is what turns the app from "a pile of screens" into one connected flow:
 * every screen is rendered through this shell and every primary action is a real
 * route push (see each page's onNext), never a dead button.
 */
export default function StepShell({
  eyebrow,
  title,
  subtitle,
  step,
  totalSteps,
  backHref,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
  backHref?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="step-shell">
      <header className="step-shell-header">
        <div className="step-shell-brand">
          <div className="brandmark small">
            <Leaf size={16} />
          </div>
          <b>AgriOptix</b>
        </div>
        {step && totalSteps ? (
          <div className="step-progress">
            <div className="step-progress-track">
              <div
                className="step-progress-fill"
                style={{ width: `${Math.min(100, (step / totalSteps) * 100)}%` }}
              />
            </div>
            <span>
              Step {step} of {totalSteps}
            </span>
          </div>
        ) : null}
      </header>

      <main className={"step-shell-main" + (wide ? " wide" : "")}>
        {backHref ? (
          <button className="step-back" onClick={() => router.push(backHref)}>
            <ArrowLeft size={15} /> Back
          </button>
        ) : null}
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {subtitle ? <p className="step-subtitle">{subtitle}</p> : null}
        <div className="step-body">{children}</div>
      </main>
    </div>
  );
}
