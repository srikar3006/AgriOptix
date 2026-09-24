

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "../../../components/StepShell";
import { api } from "../../../lib/store";

export default function AvailableProduce() {
  const router = useRouter();
  const [harvests, setHarvests] = useState<any[]>([]);

  useEffect(() => {
    api("/api/harvests", { method: "GET", cache: "no-store" })
      .then((res) => setHarvests(Array.isArray(res) ? res : []))
      .catch(() => setHarvests([]));
  }, []);

  return (
    <StepShell eyebrow="QUALITY & QUANTITY REVIEW" title="Available Produce Near You" step={3} totalSteps={7} backHref="/buyer/home" wide>
      <div className="buyers">
        {(harvests.length ? harvests : []).map((harvest: any) => {
          const farmer = harvest.farmer_reported_quality || {
            overall_quality: harvest.overall_quality,
            ripeness: harvest.ripeness,
            visible_damage: harvest.visible_damage,
            size: harvest.size,
            freshness: harvest.freshness,
            estimated_shelf_life: harvest.estimated_shelf_life,
          };
          const ai = harvest.ai_quality_analysis;

          return (
            <div className="card buyer" key={harvest.id}>
              <div className="buyer-top"><b>{harvest.crop || "Produce"}</b><span>{harvest.quantity_kg ?? harvest.quantity} kg available</span></div>

              <section className="quality-section">
                <h3>👨‍🌾 FARMER REPORTED QUALITY</h3>
                <div className="quality-grid">
                  <span>Overall: <b>{farmer.overall_quality || "—"}</b></span>
                  <span>Ripeness: <b>{farmer.ripeness || "—"}</b></span>
                  <span>Visible Damage: <b>{farmer.visible_damage || "—"}</b></span>
                  <span>Size: <b>{farmer.size || "—"}</b></span>
                  <span>Freshness: <b>{farmer.freshness || "—"}</b></span>
                  <span>Shelf Life: <b>{farmer.estimated_shelf_life || "—"}</b></span>
                </div>
              </section>

              <section className="quality-section ai-section">
                <h3>🤖 AI QUALITY ANALYSIS</h3>
                {ai ? (
                  <>
                    <div className="quality-grid">
                      <span>Crop Name: <b>{ai.crop_name}</b></span>
                      <span>Overall Quality: <b>{ai.overall_quality}</b></span>
                      <span>Visible Damage: <b>{ai.visible_damage}</b></span>
                      <span>Ripeness / Maturity: <b>{ai.ripeness_maturity}</b></span>
                      <span>Size: <b>{ai.size}</b></span>
                      <span>Freshness / Condition: <b>{ai.freshness_condition}</b></span>
                      <span>Estimated Shelf Life: <b>{ai.estimated_shelf_life}</b></span>
                      <span>AI Confidence: <b>{ai.confidence}%</b></span>
                    </div>
                    {Array.isArray(harvest.photos) && harvest.photos.length ? (
                      <div className="photo-row">
                        {harvest.photos.slice(0, 4).map((photo: string, index: number) => <img key={`${harvest.id}-${index}`} src={photo} alt={`Captured produce ${index + 1}`} />)}
                      </div>
                    ) : null}
                    <p className="disclaimer">{ai.disclaimer || "AI-generated visual assessment — not laboratory verified."}</p>
                  </>
                ) : (
                  <p className="not-analyzed">AI analysis has not been completed for this harvest yet.</p>
                )}
              </section>
            </div>
          );
        })}

        {!harvests.length ? <div className="empty">No published harvests are available yet.</div> : null}
      </div>

      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/buyer/orders")}>Continue</button>
      </div>

      <style jsx>{`
        .quality-section { margin-top: 18px; padding: 18px; border: 1px solid #dfeae6; border-radius: 16px; background: #fbfdfc; }
        .quality-section h3 { margin: 0 0 12px; font-size: 14px; letter-spacing: .04em; color: #17654f; }
        .quality-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 9px 14px; color: #61716e; font-size: 14px; }
        .quality-grid b { color: #16352d; }
        .ai-section { background: #f5fbf8; }
        .photo-row { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin-top: 14px; }
        .photo-row img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; }
        .disclaimer, .not-analyzed { margin: 12px 0 0; color: #687a76; font-size: 12px; line-height: 1.45; }
        .empty { padding: 30px; text-align: center; color: #687a76; }
        @media (max-width: 700px) { .quality-grid { grid-template-columns: 1fr; } .photo-row { grid-template-columns: repeat(2, minmax(0,1fr)); } }
      `}</style>
    </StepShell>
  );
}
