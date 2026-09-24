"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Cpu, Eye, Loader2, X, RefreshCw } from "lucide-react";
import { useWorkflow, api } from "../../../lib/store";

type QualityResult = {
  crop_name: string;
  overall_quality: string;
  visible_damage: string;
  ripeness_maturity: string;
  size: string;
  freshness_condition: string;
  estimated_shelf_life: string;
  confidence: number;
  disclaimer?: string;
  request_id?: string;
};

export default function AIQuality() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wf, setWf } = useWorkflow();
  const [quality, setQuality] = useState<QualityResult | null>(wf.aiQuality || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("autoAnalyze") === "1" && wf.photos.length >= 2 && !quality && !loading) {
      void analyze();
    }
    // The query parameter is only a one-time trigger for the existing quality step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, wf.photos.length]);

  async function analyze() {
    if (wf.photos.length < 2 || wf.photos.length > 4) {
      setError("Capture 2–4 produce photos before starting AI analysis.");
      return;
    }

    setLoading(true);
    setError("");
    setQuality(null);

    try {
      const result = await api("/api/quality/analyze", {
        method: "POST",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({
          images: wf.photos,
          crop: wf.harvest?.crop || null,
          harvest_id: wf.harvest?.id || null,
        }),
      });
      setQuality(result as QualityResult);
      setWf({ aiQuality: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI quality analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleClose = () => router.push("/farmer/photos");
  const handleContinue = () => router.push("/farmer/perishability");

  const fields: Array<[string, keyof QualityResult]> = [
    ["Crop Name", "crop_name"],
    ["Overall Quality", "overall_quality"],
    ["Visible Damage", "visible_damage"],
    ["Ripeness / Maturity", "ripeness_maturity"],
    ["Size", "size"],
    ["Freshness / Condition", "freshness_condition"],
    ["Estimated Shelf Life", "estimated_shelf_life"],
  ];

  return (
    <main className="quality-page">
      <section className="quality-container">
        <header className="quality-step-header"><span className="quality-step-number">4.</span><span className="quality-step-divider" /><h1>AI Quality Assessment</h1></header>

        <article className="quality-card">
          <div className="quality-card-header">
            <div className="quality-title-group"><span className="quality-ai-icon"><Cpu size={43} strokeWidth={2.2} /></span><h2>AI Quality Analysis</h2></div>
            <button type="button" className="quality-close" onClick={handleClose} aria-label="Close and return to photos"><X size={34} strokeWidth={2.4} /></button>
          </div>

          <div className="quality-inner">
            <div className="quality-photo-strip">
              {wf.photos.map((photo, index) => <img key={`${photo.length}-${index}`} src={photo} alt={`Captured produce photo ${index + 1}`} />)}
            </div>

            {!quality && !loading ? (
              <div className="quality-start">
                <strong>Ready to analyze the captured produce</strong>
                <span>{wf.photos.length} photos will be sent to the vision model together. Farmer Reported Quality remains separate.</span>
                <button type="button" className="quality-details-button" onClick={analyze}><Eye size={26} /><span>Analyze Quality</span></button>
              </div>
            ) : null}

            {loading ? (
              <div className="quality-loading" aria-live="polite"><Loader2 size={30} className="quality-spinner" /><div><strong>Analyzing your actual photos</strong><span>Sending {wf.photos.length} captured images to the vision model…</span></div></div>
            ) : null}

            {error ? (
              <div className="quality-error" role="alert"><strong>AI quality analysis failed.</strong><span>{error}</span><button type="button" className="quality-details-button" onClick={analyze}><RefreshCw size={24} /><span>Try Again</span></button></div>
            ) : null}

            {quality ? (
              <>
                <div className="quality-result-card">
                  <div className="quality-grade-row"><span className="quality-grade-icon"><CheckCircle2 size={31} strokeWidth={2.4} /></span><span className="quality-grade-label">{quality.overall_quality}</span></div>
                  <div className="quality-confidence-row"><strong>{quality.confidence}%</strong><span>AI confidence</span></div>
                </div>

                <div className="quality-field-grid">
                  {fields.map(([label, key]) => <div className="quality-field" key={key}><span>{label}</span><strong>{String(quality[key] ?? "Not determinable from image")}</strong></div>)}
                </div>

                <p className="quality-disclaimer">{quality.disclaimer || "AI-generated visual assessment — not laboratory verified."}</p>

                <div className="quality-actions"><button type="button" className="quality-details-button secondary" onClick={analyze}><RefreshCw size={24} /><span>Analyze Again</span></button><button type="button" className="quality-details-button" onClick={handleContinue}><Eye size={24} /><span>Continue</span></button></div>
              </>
            ) : null}
          </div>
        </article>
      </section>
      <style jsx>{`
        .quality-photo-strip { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:22px; }
        .quality-photo-strip img { width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:16px; background:#edf5f2; }
        .quality-start { display:flex; flex-direction:column; gap:12px; padding:24px; border:2px solid #e0ece8; border-radius:20px; background:#f7fbfa; }
        .quality-start strong { font-size:20px; }
        .quality-start span { color:#5d726d; line-height:1.5; }
        .quality-field-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; margin-top:20px; }
        .quality-field { padding:18px; border:2px solid #e2ebe8; border-radius:16px; background:#fbfdfc; display:flex; flex-direction:column; gap:7px; }
        .quality-field span { color:#6a7d78; font-size:14px; font-weight:700; }
        .quality-field strong { color:#16352d; font-size:18px; line-height:1.35; }
        .quality-disclaimer { margin:18px 0 0; color:#667b75; font-size:14px; line-height:1.5; }
        .quality-actions { display:flex; gap:12px; margin-top:20px; }
        .quality-actions .quality-details-button { flex:1; }
        .quality-details-button.secondary { background:#edf5f2; color:#17654f; }
        .quality-error { display:flex; flex-direction:column; gap:10px; padding:18px; border-radius:16px; background:#fff3f1; color:#8f3428; }
        @media (max-width:700px) { .quality-photo-strip { grid-template-columns:repeat(2,minmax(0,1fr)); } .quality-field-grid { grid-template-columns:1fr; } .quality-actions { flex-direction:column; } }
        .quality-page {
          min-height: 100vh;
          box-sizing: border-box;
          padding: 36px 28px 56px;
          background: #f1fbf8;
          color: #10243a;
        }

        .quality-container {
          width: min(1080px, 100%);
          margin: 0 auto;
        }

        .quality-step-header {
          min-height: 112px;
          padding: 0 38px;
          display: flex;
          align-items: center;
          gap: 24px;
          box-sizing: border-box;
          border-radius: 30px;
          background: #e4f5f2;
        }

        .quality-step-number {
          color: #087d59;
          font-size: 58px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -2px;
        }

        .quality-step-divider {
          width: 3px;
          height: 52px;
          flex: 0 0 auto;
          border-radius: 99px;
          background: #6caf9c;
        }

        .quality-step-header h1 {
          margin: 0;
          color: #10243a;
          font-size: clamp(34px, 4.4vw, 54px);
          line-height: 1.05;
          letter-spacing: -1.9px;
          font-weight: 800;
        }

        .quality-card {
          margin-top: 38px;
          padding: 32px 24px 28px;
          box-sizing: border-box;
          border-radius: 34px;
          background: #ffffff;
          box-shadow: 0 22px 55px rgba(30, 86, 72, 0.11);
        }

        .quality-card-header {
          padding: 0 14px 27px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .quality-title-group {
          display: flex;
          align-items: center;
          gap: 22px;
          min-width: 0;
        }

        .quality-ai-icon {
          width: 58px;
          height: 58px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          color: #0a9569;
        }

        .quality-card-header h2 {
          margin: 0;
          color: #10243a;
          font-size: clamp(31px, 4vw, 48px);
          line-height: 1.08;
          letter-spacing: -1.5px;
          font-weight: 800;
        }

        .quality-close {
          width: 62px;
          height: 62px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: #edf8f5;
          color: #0b9569;
          cursor: pointer;
          transition: transform 0.18s ease, background 0.18s ease;
        }

        .quality-close:hover {
          transform: scale(1.04);
          background: #e1f3ee;
        }

        .quality-inner {
          padding: 0 0 0;
          border: 2px solid #e3f0ed;
          border-radius: 27px;
          background: #ffffff;
          overflow: hidden;
        }

        .quality-image-frame {
          margin: 18px 18px 0;
          height: clamp(260px, 34vw, 365px);
          overflow: hidden;
          border-radius: 22px;
          background: #edf7f4;
        }

        .quality-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .quality-image-empty {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 12px;
          color: #5f7771;
          font-size: 17px;
          font-weight: 650;
        }

        .quality-loading {
          min-height: 130px;
          margin: 22px 18px 0;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          border-radius: 22px;
          background: #effaf7;
          color: #147c5d;
        }

        .quality-loading strong,
        .quality-loading span {
          display: block;
        }

        .quality-loading strong {
          color: #10243a;
          font-size: 22px;
        }

        .quality-loading span {
          margin-top: 5px;
          color: #688079;
          font-size: 15px;
        }

        .quality-spinner {
          animation: quality-spin 1s linear infinite;
        }

        @keyframes quality-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .quality-result-card {
          margin: 42px 18px 0;
          padding: 26px 20px 25px;
          min-height: 184px;
          box-sizing: border-box;
          border: 2px solid #dcefe9;
          border-radius: 24px;
          background: #e9f8f4;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .quality-grade-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }

        .quality-grade-icon {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: #129b6c;
          border-radius: 50%;
        }

        .quality-grade-label {
          color: #0b8b62;
          font-size: clamp(44px, 5.5vw, 68px);
          line-height: 1;
          letter-spacing: -2px;
          font-weight: 850;
        }

        .quality-confidence-row {
          margin-top: 18px;
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 15px;
        }

        .quality-confidence-row strong {
          color: #10243a;
          font-size: clamp(42px, 5vw, 58px);
          line-height: 1;
          letter-spacing: -2px;
          font-weight: 850;
        }

        .quality-confidence-row span {
          color: #6b8189;
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 700;
        }

        .quality-indicators {
          margin: 28px 18px 0;
          padding: 24px 30px;
          border: 2px solid #dceae7;
          border-radius: 23px;
          background: #ffffff;
        }

        .quality-indicator {
          min-height: 55px;
          display: flex;
          align-items: center;
          gap: 23px;
          color: #10243a;
          font-size: clamp(19px, 2.1vw, 27px);
          font-weight: 650;
        }

        .quality-indicator + .quality-indicator {
          margin-top: 8px;
        }

        .quality-check-icon {
          width: 39px;
          height: 39px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: #12a06f;
          border-radius: 50%;
        }

        .quality-no-indicators {
          color: #71858d;
          font-size: 17px;
          padding: 8px 0;
        }

        .quality-error {
          margin: 22px 18px 0;
          padding: 24px;
          border: 2px solid #f0d8d5;
          border-radius: 22px;
          background: #fff8f7;
          color: #7f3f3a;
        }

        .quality-error strong,
        .quality-error span {
          display: block;
        }

        .quality-error strong {
          font-size: 19px;
        }

        .quality-error span {
          margin-top: 7px;
          font-size: 15px;
        }

        .quality-details-button {
          width: calc(100% - 36px);
          min-height: 84px;
          margin: 28px 18px 18px;
          padding: 0 24px;
          border: 0;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: #119c6d;
          color: #ffffff;
          font: inherit;
          font-size: clamp(24px, 3vw, 31px);
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(17, 156, 109, 0.2);
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .quality-details-button:hover {
          background: #0d8d62;
          transform: translateY(-1px);
        }

        @media (max-width: 760px) {
          .quality-page {
            padding: 18px 14px 30px;
          }

          .quality-step-header {
            min-height: 78px;
            padding: 0 20px;
            gap: 13px;
            border-radius: 22px;
          }

          .quality-step-number {
            font-size: 38px;
            letter-spacing: -1px;
          }

          .quality-step-divider {
            width: 2px;
            height: 36px;
          }

          .quality-step-header h1 {
            font-size: 28px;
            letter-spacing: -0.8px;
          }

          .quality-card {
            margin-top: 20px;
            padding: 22px 12px 16px;
            border-radius: 25px;
          }

          .quality-card-header {
            padding: 0 6px 20px 8px;
            gap: 10px;
          }

          .quality-title-group {
            gap: 12px;
          }

          .quality-ai-icon {
            width: 43px;
            height: 43px;
          }

          .quality-ai-icon :global(svg) {
            width: 38px;
            height: 38px;
          }

          .quality-card-header h2 {
            font-size: 29px;
            letter-spacing: -0.8px;
          }

          .quality-close {
            width: 48px;
            height: 48px;
          }

          .quality-close :global(svg) {
            width: 28px;
            height: 28px;
          }

          .quality-inner {
            border-radius: 21px;
          }

          .quality-image-frame {
            margin: 12px 12px 0;
            height: 235px;
            border-radius: 17px;
          }

          .quality-result-card {
            margin: 20px 12px 0;
            min-height: 145px;
            padding: 20px 12px;
            border-radius: 18px;
          }

          .quality-grade-row {
            gap: 12px;
          }

          .quality-grade-icon {
            width: 48px;
            height: 48px;
          }

          .quality-grade-icon :global(svg) {
            width: 25px;
            height: 25px;
          }

          .quality-grade-label {
            font-size: 43px;
            letter-spacing: -1px;
          }

          .quality-confidence-row {
            margin-top: 12px;
            gap: 9px;
          }

          .quality-confidence-row strong {
            font-size: 40px;
            letter-spacing: -1px;
          }

          .quality-confidence-row span {
            font-size: 22px;
          }

          .quality-indicators {
            margin: 17px 12px 0;
            padding: 16px 16px;
            border-radius: 18px;
          }

          .quality-indicator {
            min-height: 45px;
            gap: 14px;
            font-size: 18px;
          }

          .quality-check-icon {
            width: 33px;
            height: 33px;
          }

          .quality-check-icon :global(svg) {
            width: 20px;
            height: 20px;
          }

          .quality-details-button {
            width: calc(100% - 24px);
            min-height: 65px;
            margin: 18px 12px 12px;
            border-radius: 17px;
            font-size: 23px;
          }

          .quality-details-button :global(svg) {
            width: 27px;
            height: 27px;
          }
        }

        @media (max-width: 430px) {
          .quality-page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .quality-step-header {
            padding: 0 15px;
            gap: 10px;
          }

          .quality-step-number {
            font-size: 32px;
          }

          .quality-step-header h1 {
            font-size: 22px;
          }

          .quality-card-header h2 {
            font-size: 25px;
          }

          .quality-ai-icon {
            width: 37px;
            height: 37px;
          }

          .quality-ai-icon :global(svg) {
            width: 33px;
            height: 33px;
          }

          .quality-close {
            width: 43px;
            height: 43px;
          }

          .quality-image-frame {
            height: 205px;
          }

          .quality-grade-label {
            font-size: 37px;
          }

          .quality-confidence-row strong {
            font-size: 35px;
          }

          .quality-confidence-row span {
            font-size: 20px;
          }
        }
      `}</style>
    </main>
  );
}
