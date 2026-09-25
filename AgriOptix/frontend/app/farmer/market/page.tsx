"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  Leaf,
  MapPin,
  Scale,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { useWorkflow, api } from "../../../lib/store";

export default function MarketIntelligence() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const [buyers, setBuyers] = useState<any[]>(wf.buyers?.length ? wf.buyers : []);

  useEffect(() => {
    if (wf.buyers?.length) return;
    api("/api/markets").then((b) => {
      setBuyers(b);
      setWf({ buyers: b });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crop = wf.harvest?.crop || "Tomato";
  const prices = buyers.map((b) => Number(b.price)).filter((p) => Number.isFinite(p));
  const min = prices.length ? Math.min(...prices) : 24;
  const max = prices.length ? Math.max(...prices) : 28;
  const changePct = wf.market?.changePct ?? 2;
  const updated = wf.market?.updated || "Today";
  const marketName = wf.market?.location || wf.harvest?.market || "Nizamabad";
  const trendLabel = wf.market?.trend || "Stable trend";

  return (
    <div className="market-page">
      <header className="market-header">
        <div className="market-brand">
          <div className="market-brand-mark">
            <Leaf size={29} strokeWidth={2.3} />
          </div>
          <span>AgriOptix</span>
        </div>

        <div className="market-header-actions" aria-label="Header actions">
          <button className="market-icon-button" aria-label="Notifications" type="button">
            <Bell size={27} strokeWidth={1.8} />
          </button>
          <button className="market-profile" aria-label="Profile" type="button">
            <UserCircle size={42} strokeWidth={1.7} />
          </button>
        </div>
      </header>

      <main className="market-main">
        <section className="market-panel">
          <button className="market-back" onClick={() => router.push("/farmer/perishability")} type="button">
            <ArrowLeft size={25} strokeWidth={2.2} />
            <span>Back</span>
          </button>

          <div className="market-eyebrow">MARKET INTELLIGENCE</div>
          <h1>Market Overview</h1>

          <div className="market-summary">
            <div className="market-crop-block">
              <div className="market-crop-image" aria-hidden="true">
                <span>🍅</span>
              </div>

              <div className="market-crop-info">
                <h2>{crop}</h2>
                <div className="market-price-label">
                  <TrendingUp size={19} />
                  <span>Current market range</span>
                </div>
                <div className="market-price">
                  ₹{min}–{max}<small>/kg</small>
                </div>
                <div className="market-change">
                  <TrendingUp size={18} />
                  <span>{changePct}% higher than last week</span>
                </div>
              </div>
            </div>

            <div className="market-divider" />

            <div className="market-meta">
              <div className="market-meta-item">
                <CalendarDays size={28} strokeWidth={1.8} />
                <div>
                  <span>Updated</span>
                  <strong>{updated}</strong>
                </div>
              </div>

              <div className="market-meta-item">
                <MapPin size={29} strokeWidth={1.8} />
                <div>
                  <span>Market</span>
                  <strong>{marketName}</strong>
                </div>
              </div>
            </div>

            <div className="market-divider market-divider-right" />

            <div className="market-trend-wrap">
              <div className="market-trend-pill">
                <TrendingUp size={20} />
                <span>{trendLabel}</span>
              </div>
            </div>
          </div>

          <div className="market-extra-info">
            <span>{buyers.length} available buyers</span>
            <span>Demand: High</span>
          </div>

          <button className="market-compare" onClick={() => router.push("/farmer/buyers/produce")} type="button">
            <Scale size={27} strokeWidth={1.8} />
            <span>Compare Buyers</span>
            <ArrowRight size={28} strokeWidth={2} />
          </button>
        </section>
      </main>

      <div className="market-bottom-art market-bottom-left" aria-hidden="true">
        <span className="leaf leaf-a" />
        <span className="leaf leaf-b" />
        <span className="leaf leaf-c" />
        <span className="leaf leaf-d" />
      </div>
      <div className="market-bottom-art market-bottom-right" aria-hidden="true">
        <span className="leaf leaf-a" />
        <span className="leaf leaf-b" />
        <span className="leaf leaf-c" />
        <span className="leaf leaf-d" />
        <span className="leaf leaf-e" />
      </div>

      <style jsx>{`
        .market-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 12% 10%, rgba(255, 255, 255, 0.85), transparent 30%),
            linear-gradient(180deg, #f6fbf9 0%, #eef9f6 56%, #e3f5f0 100%);
          color: #073f38;
          font-family: "DM Sans", sans-serif;
        }

        .market-page::after {
          content: "";
          position: absolute;
          left: -8%;
          right: -8%;
          bottom: -125px;
          height: 245px;
          background: rgba(199, 237, 229, 0.62);
          border-radius: 50% 50% 0 0 / 45% 45% 0 0;
          pointer-events: none;
        }

        .market-header {
          height: 94px;
          padding: 0 61px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(215, 235, 229, 0.8);
          box-shadow: 0 10px 28px rgba(35, 107, 91, 0.08);
          border-radius: 0 0 28px 28px;
          position: relative;
          z-index: 5;
        }

        .market-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          color: #073f38;
          font: 800 29px/1 "Manrope", sans-serif;
          letter-spacing: -0.8px;
        }

        .market-brand-mark {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          color: #11906d;
          transform: rotate(-8deg);
        }

        .market-header-actions {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .market-icon-button,
        .market-profile {
          border: 0;
          background: transparent;
          color: #073f38;
          display: grid;
          place-items: center;
          cursor: pointer;
          padding: 0;
        }

        .market-profile {
          width: 53px;
          height: 53px;
          border-radius: 50%;
          background: #d8f1eb;
          color: #087966;
        }

        .market-main {
          position: relative;
          z-index: 2;
          max-width: 1445px;
          margin: 0 auto;
          padding: 38px 32px 120px;
        }

        .market-panel {
          background: rgba(255, 255, 255, 0.91);
          border: 1px solid rgba(221, 239, 234, 0.95);
          border-radius: 30px;
          padding: 45px 39px 43px;
          box-shadow: 0 18px 45px rgba(39, 112, 98, 0.09);
          backdrop-filter: blur(3px);
        }

        .market-back {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #087b62;
          font: 800 18px "Manrope", sans-serif;
          cursor: pointer;
          margin-bottom: 24px;
        }

        .market-eyebrow {
          color: #148267;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 1.8px;
          margin-bottom: 4px;
        }

        .market-panel h1 {
          margin: 0 0 24px;
          color: #073c3b;
          font: 800 41px/1.15 "Manrope", sans-serif;
          letter-spacing: -1.3px;
        }

        .market-summary {
          min-height: 180px;
          display: grid;
          grid-template-columns: 1.45fr 1px 0.95fr 1px 0.72fr;
          align-items: center;
          gap: 30px;
          padding: 29px 27px;
          border: 1.5px solid #d5ebe5;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(248, 253, 251, 0.98), rgba(241, 251, 248, 0.95));
        }

        .market-crop-block {
          display: flex;
          align-items: center;
          gap: 27px;
          min-width: 0;
        }

        .market-crop-image {
          width: 132px;
          height: 132px;
          flex: 0 0 132px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 22px;
          background: linear-gradient(145deg, #effaf5, #e4f4ef);
          box-shadow: inset 0 0 0 1px rgba(180, 222, 212, 0.25);
        }

        .market-crop-image span {
          font-size: 77px;
          line-height: 1;
          filter: drop-shadow(0 9px 9px rgba(115, 82, 41, 0.18));
        }

        .market-crop-info h2 {
          margin: 0 0 8px;
          color: #0a403d;
          font: 800 27px/1.1 "Manrope", sans-serif;
        }

        .market-price-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #81938e;
          font-size: 16px;
          margin-bottom: 2px;
        }

        .market-price {
          color: #087d65;
          font: 800 32px/1.1 "Manrope", sans-serif;
          letter-spacing: -0.8px;
          white-space: nowrap;
        }

        .market-price small {
          color: #78908a;
          font: 500 15px "DM Sans", sans-serif;
          margin-left: 5px;
        }

        .market-change {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #13825f;
          font-size: 15px;
          font-weight: 700;
          margin-top: 8px;
        }

        .market-divider {
          width: 1px;
          height: 105px;
          background: #d7eae5;
        }

        .market-meta {
          display: grid;
          gap: 28px;
        }

        .market-meta-item {
          display: flex;
          align-items: center;
          gap: 15px;
          color: #123f3b;
        }

        .market-meta-item svg {
          color: #0a5149;
          flex: 0 0 auto;
        }

        .market-meta-item span,
        .market-meta-item strong {
          display: block;
        }

        .market-meta-item span {
          color: #82938e;
          font-size: 15px;
          margin-bottom: 1px;
        }

        .market-meta-item strong {
          color: #073e3a;
          font: 800 17px "Manrope", sans-serif;
        }

        .market-trend-wrap {
          align-self: start;
          justify-self: end;
        }

        .market-trend-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 17px;
          border-radius: 999px;
          color: #18815f;
          background: #e5f6e9;
          font-size: 15px;
          font-weight: 800;
          white-space: nowrap;
        }

        .market-extra-info {
          display: none;
        }

        .market-compare {
          width: 100%;
          margin-top: 24px;
          min-height: 72px;
          border: 0;
          border-radius: 15px;
          background: linear-gradient(90deg, #079568, #0aa873);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          font: 800 20px "Manrope", sans-serif;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(4, 139, 100, 0.18);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .market-compare:hover {
          transform: translateY(-1px);
          box-shadow: 0 13px 30px rgba(4, 139, 100, 0.23);
        }

        .market-bottom-art {
          position: absolute;
          z-index: 1;
          bottom: -2px;
          width: 190px;
          height: 260px;
          opacity: 0.68;
          pointer-events: none;
        }

        .market-bottom-left {
          left: -5px;
        }

        .market-bottom-right {
          right: -6px;
          transform: scaleX(-1);
        }

        .leaf {
          position: absolute;
          display: block;
          width: 35px;
          height: 92px;
          border-radius: 100% 0 100% 0;
          background: linear-gradient(145deg, #55bf91, #1e9a72);
          transform-origin: bottom center;
          box-shadow: inset -5px -4px 8px rgba(6, 104, 74, 0.12);
        }

        .leaf::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 1px;
          height: 78%;
          background: rgba(255, 255, 255, 0.38);
          transform: rotate(-16deg);
        }

        .leaf-a { left: 19px; bottom: 0; transform: rotate(-38deg); height: 130px; }
        .leaf-b { left: 62px; bottom: 1px; transform: rotate(-12deg); height: 105px; width: 31px; }
        .leaf-c { left: 94px; bottom: 30px; transform: rotate(25deg); height: 116px; width: 33px; }
        .leaf-d { left: 47px; bottom: 77px; transform: rotate(-65deg); height: 80px; width: 27px; }
        .leaf-e { left: 108px; bottom: 98px; transform: rotate(56deg); height: 78px; width: 27px; }

        @media (max-width: 980px) {
          .market-header { padding: 0 30px; }
          .market-main { padding: 28px 20px 110px; }
          .market-panel { padding: 34px 25px 30px; }
          .market-summary {
            grid-template-columns: 1fr 1px 1fr;
            gap: 22px;
          }
          .market-divider-right,
          .market-trend-wrap { display: none; }
          .market-crop-image { width: 105px; height: 105px; flex-basis: 105px; }
          .market-crop-image span { font-size: 62px; }
        }

        @media (max-width: 680px) {
          .market-header { height: 78px; padding: 0 18px; border-radius: 0 0 20px 20px; }
          .market-brand { font-size: 23px; gap: 8px; }
          .market-brand-mark { width: 36px; height: 36px; }
          .market-header-actions { gap: 13px; }
          .market-profile { width: 45px; height: 45px; }
          .market-main { padding: 18px 12px 95px; }
          .market-panel { padding: 25px 16px 20px; border-radius: 22px; }
          .market-back { font-size: 15px; margin-bottom: 19px; }
          .market-eyebrow { font-size: 12px; letter-spacing: 1.3px; }
          .market-panel h1 { font-size: 29px; margin-bottom: 18px; }
          .market-summary {
            grid-template-columns: 1fr;
            gap: 18px;
            padding: 18px;
          }
          .market-divider { width: 100%; height: 1px; }
          .market-crop-block { gap: 15px; }
          .market-crop-image { width: 83px; height: 83px; flex-basis: 83px; border-radius: 17px; }
          .market-crop-image span { font-size: 48px; }
          .market-crop-info h2 { font-size: 22px; }
          .market-price-label { font-size: 13px; }
          .market-price { font-size: 27px; }
          .market-change { font-size: 13px; }
          .market-meta { grid-template-columns: 1fr 1fr; gap: 12px; }
          .market-meta-item { gap: 8px; }
          .market-meta-item svg { width: 23px; height: 23px; }
          .market-meta-item span { font-size: 12px; }
          .market-meta-item strong { font-size: 14px; }
          .market-compare { min-height: 58px; margin-top: 16px; font-size: 16px; gap: 10px; }
          .market-bottom-art { transform: scale(0.72); transform-origin: bottom left; }
          .market-bottom-right { transform: scaleX(-1) scale(0.72); transform-origin: bottom right; }
        }
      `}</style>
    </div>
  );
}