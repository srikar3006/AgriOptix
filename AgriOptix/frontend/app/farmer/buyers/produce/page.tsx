"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Info,
  Leaf,
  UserRound,
} from "lucide-react";
import { useWorkflow, api } from "../../../../lib/store";

function lossTier(loss: number) {
  if (loss < 1) return "low";
  if (loss < 3) return "medium";
  return "high";
}

export default function Perishability() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [p, setP] = useState<any>(wf.perishability);

  useEffect(() => {
    if (wf.perishability) return;

    api("/api/perishability/predict", { method: "POST" })
      .then((res) => {
        setP(res);
        setWf({ perishability: res });
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const curve = p?.decay_curve || [
    { day: 0, loss_per_kg: 0 },
    { day: 1, loss_per_kg: 0.8 },
    { day: 2, loss_per_kg: 2.1 },
    { day: 3, loss_per_kg: 4.8 },
  ];
  const timeline = useMemo(() => curve.slice(0, 4), [curve]);
  const urgency = String(p?.urgency || "HIGH").toUpperCase();
  const remainingDays = p?.remaining_shelf_life_days ?? 3.2;
  const expectedValueLoss = p?.expected_value_loss ?? 100;

  const chartValues = timeline.map((item: any) => Number(item.loss_per_kg) || 0);
  const maxLoss = Math.max(...chartValues, 1);

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
          <span className="perishability-avatar">
            <UserRound size={27} strokeWidth={2} />
          </span>
        </div>
      </header>

      <main className="perishability-main">
        <button
          type="button"
          className="perishability-back"
          onClick={() => router.push("/farmer/quality")}
        >
          <ArrowLeft size={29} strokeWidth={2.4} />
          <span>Back</span>
        </button>

        <section className="perishability-card">
          <div className="perishability-top">
            <h1>SHELF-LIFE / PERISHABILITY</h1>

            <div className="perishability-hero-row">
              <div className="shelf-life-badge">
                <Leaf size={37} fill="currentColor" strokeWidth={2.1} />
                <strong>{remainingDays} days</strong>
              </div>

              <div className="loss-chart" aria-label="Expected value loss by day">
                <div className="chart-axis" />
                <div className="chart-bars">
                  {timeline.map((c: any, index: number) => {
                    const value = Number(c.loss_per_kg) || 0;
                    const height = 26 + (value / maxLoss) * 47;
                    const isCurrent = index === timeline.length - 1;
                    return (
                      <div className="chart-item" key={`${c.day}-${index}`}>
                        {isCurrent && (
                          <span className="chart-tooltip">{remainingDays} days</span>
                        )}
                        <div
                          className={`chart-bar chart-bar-${index}`}
                          style={{ height: `${height}px` }}
                        />
                        <span>
                          {c.day === 0 ? "Today" : `${c.day} day${c.day > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="perishability-grid">
            <div className="perishability-left">
              <div className="perishability-alert">
                <span className="perishability-alert-icon">
                  <AlertTriangle size={29} strokeWidth={2.7} />
                </span>
                <p>
                  <strong>Urgency: {urgency}</strong> — selling sooner reduces expected value loss.
                </p>
              </div>

              <div className="perishability-timeline" aria-label="Expected loss timeline">
                {timeline.map((c: any, index: number) => {
                  const tier = lossTier(Number(c.loss_per_kg) || 0);
                  const label = c.day === 0 ? "Today" : `${c.day} day${c.day > 1 ? "s" : ""}`;
                  return (
                    <div className="perishability-stage" key={`${c.day}-${index}`}>
                      <small>{label}</small>
                      <div className={`stage-line ${tier}`} />
                      <b className={tier}>{tier.toUpperCase()}</b>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="perishability-info">
              <div className="perishability-info-copy">
                <span className="perishability-info-icon">
                  <Info size={23} strokeWidth={2.6} />
                </span>
                <p>
                  Expected value loss: ₹{expectedValueLoss}.
                  <br />
                  Selling within the recommended window keeps more of this value in your pocket.
                </p>
              </div>
              <div className="value-illustration" aria-hidden="true">
                <span>◒</span><span>◓</span><span>◐</span>
                <i />
              </div>
            </div>
          </div>

          <div className="perishability-actions">
            <button
              type="button"
              className="perishability-continue"
              onClick={() => router.push("/farmer/market")}
            >
              <span>Continue</span>
              <ArrowRight size={30} strokeWidth={2.2} />
            </button>
          </div>
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
        .perishability-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          color: #103f3a;
          font-family: "DM Sans", Arial, sans-serif;
          background:
            radial-gradient(80% 45% at 50% 0%, rgba(255,255,255,.92), transparent 72%),
            linear-gradient(180deg, #eaf8f4 0%, #f6fcfa 55%, #dff3ec 100%);
        }

        .perishability-page::before,
        .perishability-page::after {
          content: "";
          position: absolute;
          left: -6%;
          width: 112%;
          pointer-events: none;
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        }

        .perishability-page::before {
          height: 150px;
          bottom: -74px;
          background: rgba(191, 232, 219, .72);
          transform: rotate(-2deg);
        }

        .perishability-page::after {
          height: 126px;
          bottom: -63px;
          background: rgba(218, 244, 236, .94);
          transform: rotate(3deg);
        }

        .perishability-header {
          position: relative;
          z-index: 5;
          height: 79px;
          padding: 0 27px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(250, 255, 253, .84);
          border-bottom: 1px solid rgba(208, 235, 226, .65);
          border-radius: 0 0 23px 23px;
          box-shadow: 0 5px 20px rgba(39, 103, 84, .06);
          backdrop-filter: blur(9px);
        }

        .perishability-brand { display:flex; align-items:center; gap:9px; }
        .perishability-brand-mark { width:48px; height:48px; position:relative; display:block; color:#2eaa74; }
        .brand-leaf { position:absolute; }
        .brand-leaf-back { left:0; top:8px; transform:rotate(-43deg); opacity:.78; }
        .brand-leaf-front { left:8px; top:0; transform:rotate(7deg); }
        .perishability-brand-text { color:#0d3e3a; font:800 27px/1 "Manrope", sans-serif; letter-spacing:-1.15px; }
        .perishability-header-actions { display:flex; align-items:center; gap:22px; color:#2d695e; }
        .perishability-avatar { width:43px; height:43px; display:grid; place-items:center; border-radius:50%; background:#d9f3e9; color:#207a60; }

        .perishability-main {
          position:relative;
          z-index:3;
          min-height:calc(100vh - 79px);
          padding:20px 27px 90px;
        }

        .perishability-back {
          display:flex;
          align-items:center;
          gap:8px;
          border:0;
          background:transparent;
          padding:0;
          color:#087b55;
          font-size:20px;
          font-weight:600;
          cursor:pointer;
        }

        .perishability-card {
          width:min(840px, 100%);
          margin:0 auto;
        }

        .perishability-top h1 {
          margin: -26px 0 24px;
          text-align:center;
          color:#0d2927;
          font:800 clamp(27px, 3.2vw, 34px)/1.1 "Manrope", sans-serif;
          letter-spacing:-1px;
        }

        .perishability-hero-row {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:38px;
          margin-bottom:27px;
        }

        .shelf-life-badge {
          width:272px;
          height:80px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:13px;
          border-radius:12px;
          background:linear-gradient(105deg,#087e4f,#0c9d67);
          color:#f8fff7;
          box-shadow:0 8px 17px rgba(11,111,74,.14);
        }

        .shelf-life-badge strong { font:800 38px/1 "Manrope",sans-serif; letter-spacing:-1.4px; }

        .loss-chart { width:270px; height:85px; position:relative; }
        .chart-axis { position:absolute; left:0; top:2px; bottom:18px; width:1px; background:#132f2d; }
        .chart-axis::after { content:""; position:absolute; left:0; bottom:0; width:270px; height:1px; background:#132f2d; }
        .chart-bars { height:100%; display:flex; align-items:flex-end; justify-content:space-around; padding-left:11px; }
        .chart-item { height:100%; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; position:relative; gap:5px; font-size:12px; color:#193f3b; }
        .chart-bar { width:31px; border-radius:3px 3px 0 0; background:linear-gradient(180deg,#63c68f,#39a97b); }
        .chart-bar-0 { background:#58b77e; }
        .chart-bar-1 { background:#48ba83; }
        .chart-bar-2 { background:#43b77f; }
        .chart-bar-3 { background:#ee7e80; }
        .chart-tooltip { position:absolute; top:1px; padding:4px 7px; border-radius:5px; background:#183c39; color:#fff; font-size:12px; white-space:nowrap; }
        .chart-tooltip::after { content:""; position:absolute; left:50%; bottom:-6px; border:6px solid transparent; border-top-color:#183c39; border-bottom:0; transform:translateX(-50%); }

        .perishability-grid { display:grid; grid-template-columns:1.1fr .78fr; gap:15px; align-items:stretch; }
        .perishability-left { display:flex; flex-direction:column; gap:15px; }

        .perishability-alert {
          min-height:68px;
          display:flex;
          align-items:center;
          gap:14px;
          padding:11px 17px;
          border:1px solid #efcecf;
          border-radius:11px;
          background:#fff0f0;
          color:#8c2430;
        }
        .perishability-alert-icon { width:35px; height:35px; display:grid; place-items:center; color:#fff; background:#ed324d; clip-path:polygon(50% 0,100% 100%,0 100%); }
        .perishability-alert-icon svg { transform:translateY(3px); }
        .perishability-alert p { margin:0; font-size:16px; line-height:1.25; }
        .perishability-alert strong { font-weight:800; }

        .perishability-timeline {
          min-height:90px;
          display:grid;
          grid-template-columns:repeat(4,1fr);
          padding:11px 15px 9px;
          border:1px solid #cbe5dc;
          border-radius:11px;
          background:rgba(239,249,245,.88);
        }
        .perishability-stage { text-align:center; font-size:15px; }
        .perishability-stage small { display:block; margin-bottom:6px; color:#193d39; font-size:14px; }
        .stage-line { height:10px; margin:0 2px 6px; background:#2fc18b; }
        .stage-line.medium { background:#f3b51d; }
        .stage-line.high { background:#e3233a; }
        .perishability-stage b { font-size:20px; line-height:1; }
        .perishability-stage b.low { color:#0b7b54; }
        .perishability-stage b.medium { color:#d69d12; }
        .perishability-stage b.high { color:#b11c2d; }

        .perishability-info {
          min-height:159px;
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:8px;
          padding:15px 15px 12px;
          border:1px solid #c6e2d9;
          border-radius:11px;
          background:rgba(232,247,241,.91);
        }
        .perishability-info-copy { display:flex; align-items:flex-start; gap:11px; }
        .perishability-info-icon { width:25px; height:25px; flex:none; display:grid; place-items:center; border-radius:50%; background:#15815e; color:#fff; }
        .perishability-info p { margin:0; color:#153f3a; font-size:17px; line-height:1.34; }
        .value-illustration { width:90px; height:70px; position:relative; flex:none; padding-top:28px; display:flex; align-items:flex-end; justify-content:space-around; color:#d6a34a; font-size:31px; }
        .value-illustration::before { content:""; position:absolute; left:7px; right:5px; top:20px; height:1px; background:#79a994; transform:rotate(-24deg); transform-origin:left; }
        .value-illustration::after { content:""; position:absolute; right:1px; top:12px; border:5px solid transparent; border-left-color:#16855f; transform:rotate(-30deg); }
        .value-illustration i { position:absolute; left:14px; right:3px; bottom:13px; height:1px; background:#8aaea0; }

        .perishability-actions { display:flex; justify-content:center; margin-top:17px; }
        .perishability-continue { width:460px; min-height:57px; display:flex; align-items:center; justify-content:center; gap:17px; border:0; border-radius:11px; background:linear-gradient(90deg,#06915d,#0ba16a); color:#fff; font-size:22px; font-weight:800; cursor:pointer; box-shadow:0 8px 17px rgba(6,127,84,.12); }

        .perishability-decor { position:absolute; z-index:1; left:0; right:0; bottom:-12px; height:210px; pointer-events:none; overflow:hidden; color:#39ac79; }
        .decor-leaf { position:absolute; opacity:.75; }
        .decor-leaf-left-a { left:-16px; bottom:4px; transform:rotate(-35deg); }
        .decor-leaf-left-b { left:45px; bottom:-3px; transform:rotate(-8deg); }
        .decor-leaf-left-c { left:95px; bottom:-12px; transform:rotate(26deg); }
        .decor-leaf-right-a { right:-12px; bottom:4px; transform:rotate(34deg) scaleX(-1); }
        .decor-leaf-right-b { right:48px; bottom:-6px; transform:rotate(8deg) scaleX(-1); }

        @media (max-width: 800px) {
          .perishability-header { height:68px; padding:0 18px; }
          .perishability-brand-text { font-size:23px; }
          .perishability-main { padding:17px 18px 80px; }
          .perishability-top h1 { margin:22px 0 18px; }
          .perishability-hero-row { gap:18px; }
          .shelf-life-badge { width:245px; }
          .perishability-grid { grid-template-columns:1fr; }
          .perishability-info { min-height:125px; }
        }

        @media (max-width: 600px) {
          .perishability-header { height:62px; padding:0 13px; border-radius:0 0 17px 17px; }
          .perishability-brand-mark { width:40px; height:40px; }
          .perishability-brand-text { font-size:20px; }
          .perishability-header-actions { gap:9px; }
          .perishability-avatar { width:36px; height:36px; }
          .perishability-main { min-height:calc(100vh - 62px); padding:14px 12px 74px; }
          .perishability-back { font-size:16px; }
          .perishability-back svg { width:22px; height:22px; }
          .perishability-top h1 { margin:18px 0 15px; font-size:25px; letter-spacing:-.7px; }
          .perishability-hero-row { flex-direction:column; gap:15px; }
          .shelf-life-badge { width:min(100%, 300px); height:68px; }
          .shelf-life-badge strong { font-size:32px; }
          .loss-chart { width:min(100%, 280px); }
          .perishability-grid { gap:11px; }
          .perishability-left { gap:11px; }
          .perishability-alert { padding:10px 11px; gap:10px; }
          .perishability-alert p { font-size:13px; }
          .perishability-alert-icon { width:31px; height:31px; }
          .perishability-timeline { padding:10px 7px 8px; }
          .perishability-stage small { font-size:11px; }
          .perishability-stage b { font-size:16px; }
          .stage-line { height:8px; }
          .perishability-info { min-height:132px; padding:11px; }
          .perishability-info p { font-size:13px; }
          .value-illustration { width:72px; transform:scale(.82); transform-origin:top right; }
          .perishability-continue { width:100%; min-height:53px; font-size:19px; }
          .perishability-decor { height:125px; }
          .decor-leaf-left-a { left:-28px; }
          .decor-leaf-left-b { left:24px; }
          .decor-leaf-left-c { left:69px; }
          .decor-leaf-right-b { right:25px; }
        }
      `}</style>
    </div>
  );
}