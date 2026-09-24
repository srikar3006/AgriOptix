"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ChevronRight, UserRound } from "lucide-react";
import StepShell from "../../../components/StepShell";
import { api } from "../../../lib/store";

type Harvest = {
  id: number;
  crop?: string;
  quantity_kg?: number;
  location?: string;
  status?: string;
  photos?: string[];
  overall_quality?: string;
  ripeness?: string;
  visible_damage?: string;
  size?: string;
  freshness?: string;
  estimated_shelf_life?: string;
  ai_quality_analysis?: {
    crop_name: string;
    overall_quality: string;
    visible_damage: string;
    ripeness_maturity: string;
    size: string;
    freshness_condition: string;
    estimated_shelf_life: string;
    confidence?: number | null;
    analyzed_at?: string;
    image_references?: string[];
    disclaimer?: string;
  } | null;
};

const farmerFields: Array<[keyof Harvest, string]> = [
  ["overall_quality", "Overall Quality"],
  ["visible_damage", "Visible Damage"],
  ["ripeness", "Ripeness / Maturity"],
  ["size", "Size"],
  ["freshness", "Freshness / Condition"],
  ["estimated_shelf_life", "Estimated Shelf Life"],
];

const aiFields: Array<[string, string]> = [
  ["crop_name", "Crop Name"],
  ["overall_quality", "Overall Quality"],
  ["visible_damage", "Visible Damage"],
  ["ripeness_maturity", "Ripeness / Maturity"],
  ["size", "Size"],
  ["freshness_condition", "Freshness / Condition"],
  ["estimated_shelf_life", "Estimated Shelf Life"],
];

export default function AvailableProduce() {
  const router = useRouter();
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [selected, setSelected] = useState<Harvest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/harvests")
      .then((res) => {
        const rows = Array.isArray(res) ? res : res.harvests || [];
        setHarvests(rows);
        setSelected(rows[0] || null);
      })
      .catch(() => setHarvests([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StepShell
      eyebrow="QUALITY & QUANTITY REVIEW"
      title="Available Produce Near You"
      step={3}
      totalSteps={7}
      backHref="/buyer/home"
      wide
    >
      {loading ? (
        <div className="loading">Loading published harvests…</div>
      ) : harvests.length === 0 ? (
        <div className="empty">No published harvests are available right now.</div>
      ) : (
        <>
          <div className="harvest-list">
            {harvests.map((harvest) => (
              <button
                key={harvest.id}
                type="button"
                className={`harvest-card ${selected?.id === harvest.id ? "selected" : ""}`}
                onClick={() => setSelected(harvest)}
              >
                <div>
                  <strong>{harvest.crop || "Produce"}</strong>
                  <span>{harvest.quantity_kg ?? "—"} kg available</span>
                </div>
                <span>Harvest #{harvest.id}</span>
              </button>
            ))}
          </div>

          {selected && (
            <div className="quality-review">
              <section className="quality-section">
                <div className="section-heading">
                  <UserRound size={22} />
                  <div>
                    <h2>Farmer Reported Quality</h2>
                    <p>Information entered by the farmer and kept unchanged.</p>
                  </div>
                </div>
                <div className="fields">
                  {farmerFields.map(([key, label]) => (
                    <div className="field" key={String(key)}>
                      <span>{label}</span>
                      <strong>{String(selected[key] ?? "—")}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="quality-section ai">
                <div className="section-heading">
                  <Bot size={22} />
                  <div>
                    <h2>AI Quality Analysis</h2>
                    <p>AI-generated visual assessment from the captured produce photos.</p>
                  </div>
                </div>

                {selected.ai_quality_analysis ? (
                  <>
                    <div className="fields">
                      {aiFields.map(([key, label]) => (
                        <div className="field" key={key}>
                          <span>{label}</span>
                          <strong>{String((selected.ai_quality_analysis as any)[key] ?? "—")}</strong>
                        </div>
                      ))}
                      <div className="field">
                        <span>AI Confidence</span>
                        <strong>
                          {selected.ai_quality_analysis.confidence == null
                            ? "—"
                            : `${Math.round(Number(selected.ai_quality_analysis.confidence))}%`}
                        </strong>
                      </div>
                    </div>

                    <div className="photo-row">
                      {(selected.ai_quality_analysis.image_references || selected.photos || []).map((photo, index) => (
                        <img key={`${photo.slice(0, 20)}-${index}`} src={photo} alt={`AI analysis photo ${index + 1}`} />
                      ))}
                    </div>
                    <div className="disclaimer">
                      {selected.ai_quality_analysis.disclaimer || "AI-generated visual assessment — not laboratory verified."}
                    </div>
                  </>
                ) : (
                  <div className="ai-unavailable">
                    AI analysis is not available for this harvest. No values are generated or substituted.
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}

      <div className="step-actions">
        <button className="primary" onClick={() => router.push("/buyer/orders")}>
          Continue <ChevronRight size={18} />
        </button>
      </div>

      <style jsx>{`
        .loading,.empty{padding:28px;border-radius:18px;background:#fff;border:1px solid #e3ece9;color:#60746f}
        .harvest-list{display:grid;gap:12px;margin-bottom:22px}
        .harvest-card{width:100%;border:1px solid #dce9e5;background:#fff;border-radius:16px;padding:16px 18px;display:flex;justify-content:space-between;gap:15px;text-align:left;cursor:pointer}
        .harvest-card.selected{border-color:#0b9569;box-shadow:0 0 0 2px #d8f0e8}
        .harvest-card strong,.harvest-card span{display:block}.harvest-card span{margin-top:4px;color:#70817f;font-size:13px}
        .quality-review{display:grid;gap:18px}
        .quality-section{background:#fff;border:1px solid #dfeae7;border-radius:20px;padding:22px}
        .quality-section.ai{background:#fbfefd}
        .section-heading{display:flex;gap:12px;align-items:flex-start;color:#0b9569}.section-heading h2{margin:0;color:#17313c;font-size:22px}.section-heading p{margin:4px 0 0;color:#70817f;font-size:13px}
        .fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:18px}
        .field{padding:14px;border:1px solid #e0ece8;border-radius:13px}.field span{display:block;color:#71817f;font-size:12px}.field strong{display:block;margin-top:4px;color:#18313b}
        .photo-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px}.photo-row img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px}
        .disclaimer{margin-top:14px;padding:12px;border-radius:11px;background:#f0f7f4;color:#60756f;font-size:12px}.ai-unavailable{margin-top:16px;padding:16px;border-radius:13px;background:#fff4f1;color:#8a5148;font-size:14px}
        .step-actions{display:flex;justify-content:flex-end}.primary{display:flex;align-items:center;gap:7px}
        @media(max-width:700px){.fields{grid-template-columns:1fr}.photo-row{grid-template-columns:repeat(2,minmax(0,1fr))}.harvest-card{flex-direction:column}}
      `}</style>
    </StepShell>
  );
}
