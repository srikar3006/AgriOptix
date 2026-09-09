"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import StepShell from "../../../components/StepShell";
import { useWorkflow, api } from "../../../lib/store";

export default function AIQuality() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState<any>(wf.quality);

  useEffect(() => {
    if (wf.quality) {
      setLoading(false);
      return;
    }
    api("/api/quality/analyze", { method: "POST" })
      .then((q) => {
        setQuality(q);
        setWf({ quality: q });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepShell eyebrow="AI QUALITY ASSESSMENT" title="Analyzing your photos" step={4} totalSteps={19} backHref="/farmer/photos">
      {loading ? (
        <div className="indicator-list">
          <div className="indicator"><Loader2 size={16} className="spin" /> Running vision model on your photos…</div>
        </div>
      ) : (
        <>
          <div className="grade-badge">Grade {quality?.grade || "A"}</div>
          <div className="confidence">{quality?.confidence ?? 92}% model confidence · {quality?.mode || "DEMO / SIMULATION"}</div>
          <div className="indicator-list">
            {(quality?.indicators || ["Good color", "Uniform appearance", "Low visible defect level"]).map((x: string) => (
              <div className="indicator" key={x}><CheckCircle2 size={16} /> {x}</div>
            ))}
          </div>
          <div className="step-actions">
            <button className="primary" onClick={() => router.push("/farmer/perishability")}>Next: Shelf-Life Estimation</button>
          </div>
        </>
      )}
    </StepShell>
  );
}
