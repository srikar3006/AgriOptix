

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Info,
  Leaf,
  Loader2,
  UserRound,
} from "lucide-react";
import { useWorkflow, api } from "../../../lib/store";

type ShelfLifeData = {
  harvest_id: number;
  crop_name?: string;
  overall_quality?: string;
  visible_damage?: string;
  ripeness_maturity?: string;
  size?: string;
  freshness_condition?: string;
  ai_confidence?: number | null;
  ai_estimated_shelf_life: string;
  shelf_life_min_days: number;
  shelf_life_max_days: number;
  remaining_shelf_life_days: number;
  remaining_shelf_life_min_days: number;
  remaining_shelf_life_max_days: number;
  elapsed_days: number;
  harvested_at: string;
  calculated_at: string;
  status: "LOW" | "MEDIUM" | "HIGH" | "EXPIRED";
  urgency: "LOW" | "MEDIUM" | "HIGH" | "EXPIRED";
  recommendation: string;
  expected_value_loss: number | null;
  value_loss_basis?: string | null;
  market_price_per_kg?: number | null;
  quantity_kg?: number | null;
  storage_condition?: string | null;
  mode: string;
};

type Harvest = {
  id: number;
  crop?: string;
  quantity_kg?: number;
  harvest_date?: string;
  harvest_time?: string;
  storage_condition?: string;
  ai_quality_analysis?: Record<string, unknown> | null;
};

function formatDays(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value < 10 ? value.toFixed(1) : value.toFixed(0);
}

function stageStatus(day: number, remaining: number, total: number) {
  const stageRemaining = Math.max(0, total - day);
  if (remaining <= 0 && day >= total) return "expired";
  const ratio = stageRemaining / Math.max(total, 0.0001);
  if (ratio <= 0.25) return "high";
  if (ratio <= 0.6) return "medium";
  return "low";
}

export default function Perishability() {
  const router = useRouter();
  const { wf, setWf, ready } = useWorkflow();
  const [harvest, setHarvest] = useState<Harvest | null>(wf.harvest || null);
  const [p, setP] = useState<ShelfLifeData | null>(wf.perishability || null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        let currentHarvest = (wf.harvest as Harvest | null) || null;

        if (currentHarvest?.id) {
          const freshHarvest = await api(`/api/harvests/${currentHarvest.id}`, {
            method: "GET",
            cache: "no-store",
            headers: { "Cache-Control": "no-store" },
          });
          if (freshHarvest && typeof freshHarvest === "object") {
            currentHarvest = freshHarvest as Harvest;
            if (active) {
              setHarvest(currentHarvest);
              setWf({ harvest: currentHarvest });
            }
          }
        }

        if (!currentHarvest?.id) {
          throw new Error("No harvest is selected for shelf-life analysis.");
        }

        const result = await api("/api/perishability/predict", {
          method: "POST",
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
          body: JSON.stringify({ harvest_id: currentHarvest.id }),
        });

        if (!active) return;
        setP(result as ShelfLifeData);
        setWf({ perishability: result });
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "AI shelf-life estimate unavailable."
        );
        setP(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
    // The selected harvest is the source of truth for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, wf.harvest?.id]);

  const harvestTimestamp = harvest?.harvest_date && harvest?.harvest_time
    ? Date.parse(`${harvest.harvest_date}T${harvest.harvest_time}`)
    : NaN;
  const harvestTimeLabel = Number.isFinite(harvestTimestamp)
    ? `${harvest?.harvest_date ?? ""} ${harvest?.harvest_time ?? ""}`.trim()
    : "Harvest time unavailable";
  const liveElapsedDays = Number.isFinite(harvestTimestamp)
    ? Math.max(0, (now - harvestTimestamp) / 86400000)
    : p?.elapsed_days ?? 0;

  const remainingMid = p
    ? Math.max(0, (p.shelf_life_min_days + p.shelf_life_max_days) / 2 - liveElapsedDays)
    : 0;
  const remainingMin = p ? Math.max(0, p.shelf_life_min_days - liveElapsedDays) : 0;
  const remainingMax = p ? Math.max(0, p.shelf_life_max_days - liveElapsedDays) : 0;
  const referenceLife = p
    ? (p.shelf_life_min_days + p.shelf_life_max_days) / 2
    : 0;

  const status: ShelfLifeData["status"] = useMemo(() => {
    if (!p) return "LOW";
    if (remainingMid <= 0) return "EXPIRED";
    const ratio = remainingMid / Math.max(referenceLife, 0.0001);
    if (ratio <= 0.25) return "HIGH";
    if (ratio <= 0.6) return "MEDIUM";
    return "LOW";
  }, [p, remainingMid, referenceLife]);

  const recommendation = useMemo(() => {
    switch (status) {
      case "MEDIUM":
        return "Perishability is increasing. Consider selling within the recommended window.";
      case "HIGH":
        return "Selling sooner can help reduce expected value loss.";
      case "EXPIRED":
        return "Estimated shelf-life window has passed. Quality verification is recommended before sale.";
      default:
        return "Freshness is currently stable. Normal selling window available.";
    }
  }, [status]);

  const timeline = useMemo(() => {
    if (!p) return [];
    const total = Math.max(1, Math.ceil(p.shelf_life_max_days));
    const stepCount = Math.min(6, total + 1);
    const points = Array.from({ length: stepCount }, (_, index) => {
      if (index === 0) return 0;
      if (index === stepCount - 1) return total;
      return Math.round((index / (stepCount - 1)) * total);
    });
    return [...new Set(points)];
  }, [p]);

  const valueLoss = useMemo(() => {
    if (!p || p.expected_value_loss == null || !Number.isFinite(p.expected_value_loss)) return null;
    if (status === "EXPIRED") return p.expected_value_loss;
    const ratio = p.shelf_life_max_days > 0
      ? Math.min(1, Math.max(0, liveElapsedDays / p.shelf_life_max_days))
      : 0;
    const marketValue = p.quantity_kg && p.market_price_per_kg
      ? p.quantity_kg * p.market_price_per_kg
      : null;
    if (marketValue == null) return p.expected_value_loss;
    return Math.round(marketValue * ratio * 100) / 100;
  }, [p, liveElapsedDays, status]);

  const hasEstimate = Boolean(p?.ai_estimated_shelf_life);

  return (
    <div className="perishability-page">
      <header className="perishability-header">
        <div className="perishability-brand" aria-label="AgriOptix">
          <span className="perishability-brand-mark" aria-hidden="true">
            <Leaf className="brand-leaf brand-leaf-back" size={37} strokeWidth={2.1} />
            <Leaf className="brand-leaf brand-leaf-front" size={43} strokeWidth={2.1} />
          </span>
          <span className="perishability-brand-text">AgriOptix</span>
        </div>
        <div className="perishability-header-actions" aria-label="Account controls">
          <Bell className="header-bell" size={29} strokeWidth={2} />
          <span className="perishability-avatar"><UserRound size={27} strokeWidth={2} /></span>
        </div>
      </header>

      <main className="perishability-main">
        <button type="button" className="perishability-back" onClick={() => router.push("/farmer/quality")}>
          <ArrowLeft size={29} strokeWidth={2.4} />
          <span>Back</span>
        </button>

        <section className="perishability-card">
          <div className="perishability-top">
            <div className="title-block">
              <h1>SHELF-LIFE / PERISHABILITY</h1>
              {harvest?.crop && <p>{harvest.crop} · {harvest.quantity_kg ?? "—"} kg</p>}
            </div>

            {loading ? (
              <div className="state-card"><Loader2 className="spin" size={28} /><span>Loading real harvest and AI shelf-life data…</span></div>
            ) : error || !hasEstimate ? (
              <div className="state-card state-error" role="alert">
                <AlertTriangle size={27} />
                <div><strong>AI shelf-life estimate unavailable</strong><span>{error || "Complete AI Quality Analysis before using perishability."}</span></div>
              </div>
            ) : (
              <>
                <div className="perishability-hero-row">
                  <div className="shelf-life-badge">
                    <Leaf size={37} fill="currentColor" strokeWidth={2.1} />
                    <div>
                      <strong>{formatDays(remainingMid)} days</strong>
                      <span>remaining · midpoint of AI range</span>
                    </div>
                  </div>

                  <div className="ai-range-card">
                    <span>AI estimated shelf life</span>
                    <strong>{p.ai_estimated_shelf_life}</strong>
                    <small>Updates from actual harvest time</small>
                  </div>
                </div>

                <div className="perishability-meta">
                  <span>Harvested: {harvest?.harvest_date || "—"} {harvest?.harvest_time || ""}</span>
                  <span>Remaining range: {formatDays(remainingMin)}–{formatDays(remainingMax)} days</span>
                  {harvest?.storage_condition && <span>Storage: {harvest.storage_condition}</span>}
                </div>
              </>
            )}
          </div>

          {!loading && !error && hasEstimate && p ? (
            <>
              <div className={`perishability-alert ${status.toLowerCase()}`}>
                <span className="perishability-alert-icon"><AlertTriangle size={29} strokeWidth={2.7} /></span>
                <p><strong>Urgency: {status}</strong> — {recommendation}</p>
              </div>

              <div className="perishability-grid">
                <div className="perishability-left">
                  <div className="perishability-timeline" aria-label="Dynamic shelf-life timeline">
                    {timeline.map((day, index) => {
                      const stage = stageStatus(day, remainingMid, p.shelf_life_max_days);
                      const marker = remainingMid <= day + 0.5 && remainingMid >= day - 0.5;
                      return (
                        <div className={`perishability-stage ${marker ? "current" : ""}`} key={`${day}-${index}`}>
                          <small>{day === 0 ? "Today" : `${day} day${day > 1 ? "s" : ""}`}</small>
                          <div className={`stage-line ${stage}`}>
                            {marker && <span className="timeline-marker" aria-label="Current position" />}
                          </div>
                          <b className={stage}>{day >= p.shelf_life_max_days ? "EXPIRED" : stage.toUpperCase()}</b>
                        </div>
                      );
                    })}
                  </div>

                  <div className="perishability-info quality-summary">
                    <div className="perishability-info-copy">
                      <span className="perishability-info-icon"><Info size={23} strokeWidth={2.6} /></span>
                      <div>
                        <p><strong>AI quality inputs</strong></p>
                        <p>Quality: {p.overall_quality || "—"} · Freshness: {p.freshness_condition || "—"}</p>
                        <p>Damage: {p.visible_damage || "—"} · Maturity: {p.ripeness_maturity || "—"}</p>
                        <p>AI confidence: {p.ai_confidence != null ? `${p.ai_confidence}%` : "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="perishability-info value-card">
                  <div className="perishability-info-copy">
                    <span className="perishability-info-icon"><Info size={23} strokeWidth={2.6} /></span>
                    <div>
                      <p><strong>Expected value loss</strong></p>
                      <p className="value-number">
                        {valueLoss != null ? `₹${valueLoss.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "Estimate unavailable"}
                      </p>
                      <p className="value-note">{p.value_loss_basis || "Value-loss estimate unavailable because the required market/quantity data is missing."}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="perishability-actions">
                <button type="button" className="perishability-continue" onClick={() => router.push("/farmer/market")}>
                  <span>Continue</span><ArrowRight size={30} strokeWidth={2.2} />
                </button>
              </div>
            </>
          ) : null}
        </section>
      </main>

      <div className="perishability-decor" aria-hidden="true">
        <Leaf className="decor-leaf decor-leaf-left-a" size={116} />
        <Leaf className="decor-leaf decor-leaf-left-b" size={91} />
        <Leaf className="decor-leaf decor-leaf-left-c" size={73} />
        <Leaf className="decor-leaf decor-leaf-right-a" size={112} />
        <Leaf className="decor-leaf decor-leaf-right-b" size={82} />
      </div>

      <style jsx global>{`
        .perishability-page{min-height:100vh;position:relative;overflow:hidden;color:#103f3a;font-family:"DM Sans",Arial,sans-serif;background:radial-gradient(80% 45% at 50% 0%,rgba(255,255,255,.92),transparent 72%),linear-gradient(180deg,#eaf8f4 0%,#f6fcfa 55%,#dff3ec 100%)}
        .perishability-page::before,.perishability-page::after{content:"";position:absolute;left:-6%;width:112%;pointer-events:none;border-radius:50% 50% 0 0 / 100% 100% 0 0}.perishability-page::before{height:150px;bottom:-74px;background:rgba(191,232,219,.72);transform:rotate(-2deg)}.perishability-page::after{height:126px;bottom:-63px;background:rgba(218,244,236,.94);transform:rotate(3deg)}
        .perishability-header{position:relative;z-index:5;height:79px;padding:0 27px;display:flex;align-items:center;justify-content:space-between;background:rgba(250,255,253,.84);border-bottom:1px solid rgba(208,235,226,.65);border-radius:0 0 23px 23px;box-shadow:0 5px 20px rgba(39,103,84,.06);backdrop-filter:blur(9px)}
        .perishability-brand{display:flex;align-items:center;gap:9px}.perishability-brand-mark{width:48px;height:48px;position:relative;display:block;color:#2eaa74}.brand-leaf{position:absolute}.brand-leaf-back{left:0;top:8px;transform:rotate(-43deg);opacity:.78}.brand-leaf-front{left:8px;top:0;transform:rotate(7deg)}.perishability-brand-text{color:#0d3e3a;font:800 27px/1 "Manrope",sans-serif;letter-spacing:-1.15px}.perishability-header-actions{display:flex;align-items:center;gap:22px;color:#2d695e}.perishability-avatar{width:43px;height:43px;display:grid;place-items:center;border-radius:50%;background:#d9f3e9;color:#207a60}
        .perishability-main{position:relative;z-index:3;min-height:calc(100vh - 79px);padding:28px 27px 110px}.perishability-back{display:flex;align-items:center;gap:8px;border:0;background:transparent;padding:0;color:#087b55;font-size:20px;font-weight:600;cursor:pointer}.perishability-card{width:min(930px,100%);margin:0 auto}.perishability-top{padding-top:10px}.title-block{text-align:center;margin-bottom:30px}.perishability-top h1{margin:0;color:#0d2927;font:800 clamp(27px,3.2vw,34px)/1.1 "Manrope",sans-serif;letter-spacing:-1px}.title-block p{margin:9px 0 0;color:#55756e;font-size:15px}
        .perishability-hero-row{display:flex;align-items:stretch;justify-content:center;gap:22px;margin-bottom:18px}.shelf-life-badge{width:350px;min-height:88px;display:flex;align-items:center;justify-content:center;gap:13px;border-radius:13px;background:linear-gradient(105deg,#087e4f,#0c9d67);color:#f8fff7;box-shadow:0 8px 17px rgba(11,111,74,.14)}.shelf-life-badge strong{display:block;font:800 38px/1 "Manrope",sans-serif;letter-spacing:-1.4px}.shelf-life-badge span{display:block;margin-top:7px;font-size:12px;opacity:.9}.ai-range-card{width:270px;min-height:88px;padding:17px 20px;border:1px solid #c6e2d9;border-radius:13px;background:rgba(255,255,255,.76);display:flex;flex-direction:column;justify-content:center}.ai-range-card span,.ai-range-card small{color:#56766f;font-size:12px}.ai-range-card strong{margin:4px 0;font-size:24px;color:#123f3a}.perishability-meta{display:flex;justify-content:center;flex-wrap:wrap;gap:9px 18px;margin:0 0 30px;color:#55756e;font-size:13px}.state-card{display:flex;align-items:center;justify-content:center;gap:12px;min-height:88px;margin-bottom:30px;padding:18px 22px;border:1px solid #c6e2d9;border-radius:13px;background:rgba(255,255,255,.78);font-weight:700}.state-error{justify-content:flex-start;color:#8c2430;background:#fff3f3;border-color:#efcecf}.state-error div{display:flex;flex-direction:column;gap:4px}.state-error span{font-weight:500;font-size:14px}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .perishability-alert{min-height:72px;display:flex;align-items:center;gap:14px;margin-bottom:22px;padding:13px 17px;border:1px solid #efcecf;border-radius:12px;background:#fff0f0;color:#8c2430}.perishability-alert.medium{border-color:#f0d99c;background:#fff8e5;color:#86620a}.perishability-alert.low{border-color:#bfe3d2;background:#eefaf4;color:#176b4c}.perishability-alert.expired{background:#f8eeee}.perishability-alert-icon{width:35px;height:35px;display:grid;place-items:center;color:#fff;background:#ed324d;clip-path:polygon(50% 0,100% 100%,0 100%);flex:none}.medium .perishability-alert-icon{background:#d69d12}.low .perishability-alert-icon{background:#15815e}.perishability-alert-icon svg{transform:translateY(3px)}.perishability-alert p{margin:0;font-size:16px;line-height:1.3}.perishability-alert strong{font-weight:800}
        .perishability-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:18px;align-items:stretch}.perishability-left{display:flex;flex-direction:column;gap:18px}.perishability-timeline{min-height:112px;display:grid;grid-template-columns:repeat(auto-fit,minmax(72px,1fr));gap:8px;padding:16px 14px 13px;border:1px solid #cbe5dc;border-radius:12px;background:rgba(239,249,245,.9)}.perishability-stage{text-align:center;font-size:14px;position:relative}.perishability-stage small{display:block;margin-bottom:8px;color:#193d39;font-size:13px}.stage-line{height:10px;margin:0 2px 8px;background:#2fc18b;position:relative;border-radius:5px}.stage-line.medium{background:#f3b51d}.stage-line.high,.stage-line.expired{background:#e3233a}.perishability-stage b{font-size:15px;line-height:1}.perishability-stage b.low{color:#0b7b54}.perishability-stage b.medium{color:#d69d12}.perishability-stage b.high,.perishability-stage b.expired{color:#b11c2d}.timeline-marker{position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;border:4px solid #123f3a;left:50%;top:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 3px rgba(18,63,58,.12)}
        .perishability-info{display:flex;align-items:flex-start;gap:10px;padding:18px;border:1px solid #c6e2d9;border-radius:12px;background:rgba(232,247,241,.91)}.perishability-info-copy{display:flex;align-items:flex-start;gap:11px}.perishability-info-icon{width:27px;height:27px;flex:none;display:grid;place-items:center;border-radius:50%;background:#15815e;color:#fff}.perishability-info p{margin:0 0 6px;color:#153f3a;font-size:15px;line-height:1.38}.perishability-info p:last-child{margin-bottom:0}.value-card{min-height:100%;background:rgba(248,253,251,.94)}.value-number{font:800 30px/1.1 "Manrope",sans-serif!important;color:#0b7b54!important;margin:9px 0!important}.value-note{font-size:12px!important;color:#5c7872!important}.quality-summary{min-height:145px}.perishability-actions{display:flex;justify-content:center;margin-top:30px}.perishability-continue{width:460px;min-height:57px;display:flex;align-items:center;justify-content:center;gap:17px;border:0;border-radius:11px;background:linear-gradient(90deg,#06915d,#0ba16a);color:#fff;font-size:22px;font-weight:800;cursor:pointer;box-shadow:0 8px 17px rgba(6,127,84,.12)}
        .perishability-decor{position:absolute;z-index:1;left:0;right:0;bottom:-12px;height:210px;pointer-events:none;overflow:hidden;color:#39ac79}.decor-leaf{position:absolute;opacity:.75}.decor-leaf-left-a{left:-16px;bottom:4px;transform:rotate(-35deg)}.decor-leaf-left-b{left:45px;bottom:-3px;transform:rotate(-8deg)}.decor-leaf-left-c{left:95px;bottom:-12px;transform:rotate(26deg)}.decor-leaf-right-a{right:-12px;bottom:4px;transform:rotate(34deg) scaleX(-1)}.decor-leaf-right-b{right:48px;bottom:-6px;transform:rotate(8deg) scaleX(-1)}
        @media(max-width:800px){.perishability-header{height:68px;padding:0 18px}.perishability-brand-text{font-size:23px}.perishability-main{padding:20px 18px 80px}.perishability-grid{grid-template-columns:1fr}.perishability-hero-row{gap:14px}.shelf-life-badge,.ai-range-card{width:100%}.perishability-meta{justify-content:flex-start}.perishability-actions{margin-top:24px}}
        @media(max-width:600px){.perishability-header{height:62px;padding:0 13px;border-radius:0 0 17px 17px}.perishability-brand-mark{width:40px;height:40px}.perishability-brand-text{font-size:20px}.perishability-header-actions{gap:9px}.perishability-avatar{width:36px;height:36px}.perishability-main{min-height:calc(100vh - 62px);padding:15px 12px 74px}.perishability-back{font-size:16px}.perishability-back svg{width:22px;height:22px}.title-block{margin-bottom:22px}.perishability-top h1{font-size:25px}.perishability-hero-row{flex-direction:column;gap:11px}.shelf-life-badge{min-height:74px}.shelf-life-badge strong{font-size:31px}.ai-range-card{min-height:75px}.perishability-meta{font-size:12px;gap:7px 12px;margin-bottom:22px}.perishability-alert{padding:11px;gap:10px}.perishability-alert p{font-size:13px}.perishability-alert-icon{width:31px;height:31px}.perishability-grid{gap:12px}.perishability-left{gap:12px}.perishability-timeline{padding:11px 6px 9px;gap:3px}.perishability-stage small{font-size:10px}.perishability-stage b{font-size:11px}.stage-line{height:8px}.perishability-info{padding:13px}.perishability-info p{font-size:13px}.value-number{font-size:26px!important}.perishability-continue{width:100%;min-height:53px;font-size:19px}.perishability-decor{height:125px}}
