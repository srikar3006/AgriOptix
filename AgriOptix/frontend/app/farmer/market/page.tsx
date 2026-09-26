"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Leaf,
  MapPin,
  Scale,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { useWorkflow, api } from "../../../lib/store";

type Buyer = {
  id?: string | number;
  name?: string;
  price?: number | string;
  quantity?: number | string;
  distance?: number | string;
  reliability?: number | string;
  pickup?: string;
};

function normalizeBuyers(data: unknown): Buyer[] {
  if (Array.isArray(data)) {
    return data as Buyer[];
  }

  if (
    data &&
    typeof data === "object"
  ) {
    const value = data as {
      buyers?: unknown;
      markets?: unknown;
      data?: unknown;
    };

    if (Array.isArray(value.buyers)) {
      return value.buyers as Buyer[];
    }

    if (Array.isArray(value.markets)) {
      return value.markets as Buyer[];
    }

    if (Array.isArray(value.data)) {
      return value.data as Buyer[];
    }
  }

  return [];
}

export default function MarketIntelligence() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    const storedBuyers = Array.isArray(wf.buyers)
      ? wf.buyers
      : [];

    if (storedBuyers.length > 0) {
      setBuyers(storedBuyers);
      return;
    }

    let cancelled = false;

    async function loadMarketData() {
      setLoading(true);
      setApiError(false);

      try {
        const response = await api("/api/markets");

        if (cancelled) return;

        const normalized = normalizeBuyers(response);

        setBuyers(normalized);

        if (normalized.length > 0) {
          setWf({
            buyers: normalized,
          });
        }
      } catch {
        if (!cancelled) {
          setApiError(true);
          setBuyers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMarketData();

    return () => {
      cancelled = true;
    };
  }, [wf.buyers, setWf]);

  const crop =
    wf.harvest?.crop ||
    wf.crop ||
    "Tomato";

  const marketLocation =
    wf.market?.location ||
    wf.harvest?.market ||
    "Nizamabad";

  const updated =
    wf.market?.updated ||
    "Today";

  const trend =
    wf.market?.trend ||
    "Stable trend";

  const changePct =
    Number(wf.market?.changePct) || 2;

  const prices = useMemo(() => {
    return buyers
      .map((buyer) => Number(buyer.price))
      .filter(
        (price) =>
          Number.isFinite(price) &&
          price > 0
      );
  }, [buyers]);

  const minPrice = prices.length
    ? Math.min(...prices)
    : 24;

  const maxPrice = prices.length
    ? Math.max(...prices)
    : 28;

  const buyerCount =
    buyers.length > 0
      ? buyers.length
      : loading
        ? "..."
        : "Multiple";

  function handleBack() {
    router.push("/farmer/perishability");
  }

  function handleCompareBuyers() {
    router.push("/farmer/buyers/produce");
  }

  return (
    <div className="market-page">
      <header className="market-header">
        <div className="market-brand">
          <div className="market-brand-mark">
            <Leaf
              size={24}
              strokeWidth={2.2}
            />
          </div>

          <div className="market-brand-copy">
            <strong>AgriOptix</strong>
            <span>Farm Intelligence</span>
          </div>
        </div>

        <div className="market-header-actions">
          <button
            type="button"
            className="market-icon-button"
            aria-label="Notifications"
          >
            <Bell
              size={21}
              strokeWidth={1.8}
            />
          </button>

          <button
            type="button"
            className="market-profile"
            aria-label="Farmer profile"
          >
            <UserCircle
              size={35}
              strokeWidth={1.7}
            />
          </button>
        </div>
      </header>

      <main className="market-main">
        <section className="market-panel">
          <button
            type="button"
            className="market-back"
            onClick={handleBack}
          >
            <ArrowLeft
              size={19}
              strokeWidth={2.2}
            />
            <span>Back</span>
          </button>

          <div className="market-title-area">
            <div className="market-eyebrow">
              MARKET INTELLIGENCE
            </div>

            <h1>Market Overview</h1>

            <p>
              Review the current market before
              choosing where to sell your harvest.
            </p>
          </div>

          <section className="market-overview-card">
            <div className="crop-section">
              <div
                className="crop-visual"
                aria-hidden="true"
              >
                <span>🍅</span>
              </div>

              <div className="crop-details">
                <span className="small-label">
                  CROP
                </span>

                <h2>{crop}</h2>

                <div className="price-caption">
                  <TrendingUp
                    size={16}
                    strokeWidth={2}
                  />
                  <span>
                    Current market range
                  </span>
                </div>

                <div className="price-value">
                  ₹{minPrice}–{maxPrice}
                  <span>/kg</span>
                </div>

                <div className="price-change">
                  <TrendingUp
                    size={15}
                    strokeWidth={2.2}
                  />
                  <span>
                    {changePct}% higher than
                    last week
                  </span>
                </div>
              </div>
            </div>

            <div className="vertical-divider" />

            <div className="market-details">
              <div className="detail-item">
                <div className="detail-icon">
                  <CalendarDays
                    size={20}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <span>Updated</span>
                  <strong>{updated}</strong>
                </div>
              </div>

              <div className="detail-item">
                <div className="detail-icon">
                  <MapPin
                    size={20}
                    strokeWidth={1.8}
                  />
                </div>

                <div>
                  <span>Market Location</span>
                  <strong>
                    {marketLocation}
                  </strong>
                </div>
              </div>
            </div>

            <div className="vertical-divider second-divider" />

            <div className="trend-section">
              <span className="small-label">
                MARKET TREND
              </span>

              <div className="trend-pill">
                <TrendingUp
                  size={17}
                  strokeWidth={2}
                />
                <span>{trend}</span>
              </div>
            </div>
          </section>

          <section className="market-stat-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Scale
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <span>BUYERS</span>
                <strong>
                  {buyerCount}
                </strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <span>DEMAND</span>
                <strong>High</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <CheckCircle2
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <span>DATA STATUS</span>
                <strong>
                  {apiError
                    ? "Demo data"
                    : "Available"}
                </strong>
              </div>
            </div>
          </section>

          <div className="decision-note">
            <div className="decision-note-icon">
              <Scale
                size={19}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <strong>
                Compare buyers before selling
              </strong>

              <p>
                The next step compares price,
                buyer reliability, pickup distance,
                capacity and payment timing.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="compare-button"
            onClick={handleCompareBuyers}
          >
            <Scale
              size={21}
              strokeWidth={1.9}
            />

            <span>Compare Buyers</span>

            <ArrowRight
              size={21}
              strokeWidth={2.1}
            />
          </button>
        </section>
      </main><div
        className="market-decoration left-decoration"
        aria-hidden="true"
      >
        <span className="leaf leaf-1" />
        <span className="leaf leaf-2" />
        <span className="leaf leaf-3" />
        <span className="leaf leaf-4" />
      </div>

      <div
        className="market-decoration right-decoration"
        aria-hidden="true"
      >
        <span className="leaf leaf-1" />
        <span className="leaf leaf-2" />
        <span className="leaf leaf-3" />
        <span className="leaf leaf-4" />
        <span className="leaf leaf-5" />
      </div>

      <style jsx>{`
        .market-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          color: #123f39;
          background:
            radial-gradient(
              circle at 10% 5%,
              rgba(255, 255, 255, 0.95),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #f8fcfa 0%,
              #eff9f6 58%,
              #e3f5f0 100%
            );
          font-family:
            Inter,
            "DM Sans",
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .market-page::after {
          content: "";
          position: absolute;
          left: -10%;
          right: -10%;
          bottom: -150px;
          height: 270px;
          border-radius: 50% 50% 0 0;
          background: rgba(197, 235, 227, 0.62);
          pointer-events: none;
        }

        .market-header {
          position: relative;
          z-index: 10;
          height: 74px;
          padding: 0 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #dcebe6;
          box-shadow:
            0 6px 22px
              rgba(25, 93, 78, 0.06);
        }

        .market-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .market-brand-mark {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #e2f5ed;
          color: #078866;
        }

        .market-brand-copy strong {
          display: block;
          color: #073f38;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }

        .market-brand-copy span {
          display: block;
          margin-top: 2px;
          color: #83938d;
          font-size: 9px;
        }

        .market-header-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .market-icon-button,
        .market-profile {
          border: 0;
          padding: 0;
          cursor: pointer;
          display: grid;
          place-items: center;
        }

        .market-icon-button {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          color: #174d45;
          background: transparent;
        }

        .market-icon-button:hover {
          background: #edf7f4;
        }

        .market-profile {
          width: 43px;
          height: 43px;
          border-radius: 50%;
          color: #087966;
          background: #d9f1eb;
        }

        .market-main {
          position: relative;
          z-index: 3;
          width: min(1120px, 92%);
          margin: 0 auto;
          padding: 30px 0 110px;
        }

        .market-panel {
          padding: 31px;
          border: 1px solid #dcebe6;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow:
            0 18px 45px
              rgba(39, 112, 98, 0.09);
          backdrop-filter: blur(5px);
        }

        .market-back {
          margin: 0 0 23px;
          padding: 0;
          border: 0;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #087b62;
          background: transparent;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .market-back:hover {
          color: #075c4c;
        }

        .market-eyebrow {
          color: #138167;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .market-title-area h1 {
          margin: 6px 0 5px;
          color: #073c3b;
          font-size: clamp(30px, 4vw, 42px);
          line-height: 1.08;
          font-weight: 800;
          letter-spacing: -1.4px;
        }

        .market-title-area p {
          margin: 0 0 24px;
          color: #778984;
          font-size: 13px;
          line-height: 1.6;
        }

        .market-overview-card {
          display: grid;
          grid-template-columns:
            minmax(300px, 1.45fr)
            1px
            minmax(190px, 0.9fr)
            1px
            minmax(145px, 0.65fr);
          align-items: center;
          gap: 24px;
          min-height: 176px;
          padding: 23px;
          border: 1px solid #d4e9e3;
          border-radius: 20px;
          background:
            linear-gradient(
              180deg,
              #f9fdfb 0%,
              #f1faf7 100%
            );
        }

        .crop-section {
          display: flex;
          align-items: center;
          gap: 19px;
          min-width: 0;
        }

        .crop-visual {
          width: 106px;
          height: 106px;
          flex: 0 0 106px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background:
            linear-gradient(
              145deg,
              #effaf5,
              #e2f3ed
            );
          box-shadow:
            inset 0 0 0 1px
              rgba(181, 222, 212, 0.35);
        }

        .crop-visual span {
          font-size: 60px;
          line-height: 1;
          filter:
            drop-shadow(
              0 7px 7px
                rgba(100, 75, 38, 0.18)
            );
        }

        .small-label {
          display: block;
          color: #8a9892;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .crop-details h2 {
          margin: 4px 0 8px;
          color: #0a403d;
          font-size: 23px;
          font-weight: 800;
        }

        .price-caption {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #81928d;
          font-size: 12px;
        }

        .price-value {
          margin-top: 2px;
          color: #087d65;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.7px;
          white-space: nowrap;
        }

        .price-value span {
          margin-left: 4px;
          color: #7b918b;
          font-size: 12px;
          font-weight: 500;
        }

        .price-change {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #13825f;
          font-size: 11px;
          font-weight: 700;
        }

        .vertical-divider {
          width: 1px;
          height: 92px;
          background: #d7eae5;
        }

        .market-details {
          display: grid;
          gap: 22px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .detail-icon {
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #0a5149;
          background: #e5f3ef;
        }

        .detail-item span,
        .detail-item strong {
          display: block;
        }

        .detail-item span {
          margin-bottom: 2px;
          color: #84938e;
          font-size: 10px;
        }

        .detail-item strong {
          color: #073e3a;
          font-size: 14px;
          font-weight: 800;
        }

        .trend-section {
          align-self: start;
          justify-self: center;
          text-align: center;
        }

        .trend-pill {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: 999px;
          color: #18815f;
          background: #e4f6e8;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .market-stat-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 11px;
        }

        .stat-card {
          min-height: 66px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #e0ece7;
          border-radius: 13px;
          background: #fbfdfc;
        }

        .stat-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #31764a;
          background: #e5f3e7;
        }

        .stat-card span {
          display: block;
          color: #8a9892;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.8px;
        }

        .stat-card strong {
          display: block;
          margin-top: 3px;
          color: #17473f;
          font-size: 14px;
          font-weight: 800;
        }

        .decision-note {
          margin-top: 14px;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border: 1px solid #d9e9df;
          border-radius: 13px;
          background: #f1f8f3;
        }

        .decision-note-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #31764a;
          background: #dff0e3;
        }

        .decision-note strong {
          display: block;
          color: #24553a;
          font-size: 12px;
        }

        .decision-note p {
          margin: 3px 0 0;
          color: #6d7d73;
          font-size: 11px;
          line-height: 1.5;
        }

        .compare-button {
          width: 100%;
          min-height: 57px;
          margin-top: 15px;
          padding: 0 18px;
          border: 0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          color: white;
          background:
            linear-gradient(
              90deg,
              #078f66,
              #0aa873
            );
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 8px 22px
              rgba(4, 139, 100, 0.18);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .compare-button:hover {
          transform: translateY(-1px);
          box-shadow:
            0 12px 28px
              rgba(4, 139, 100, 0.24);
        }

        .market-decoration {
          position: absolute;
          z-index: 1;
          bottom: 0;
          width: 160px;
          height: 210px;
          opacity: 0.55;
          pointer-events: none;
        }

        .left-decoration {
          left: 0;
        }

        .right-decoration {
          right: 0;
          transform: scaleX(-1);
        }

        .leaf {
          position: absolute;
          width: 28px;
          height: 82px;
          display: block;
          border-radius: 100% 0 100% 0;
          background:
            linear-gradient(
              145deg,
              #55bf91,
              #1e9a72
            );
          transform-origin: bottom center;
          box-shadow:
            inset -4px -4px 8px
              rgba(6, 104, 74, 0.12);
        }

        .leaf::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 1px;
          height: 78%;
          background: rgba(255, 255, 255, 0.4);
          transform: rotate(-16deg);
        }

        .leaf-1 {
          left: 18px;
          bottom: 0;
          height: 120px;
          transform: rotate(-38deg);
        }

        .leaf-2 {
          left: 53px;
          bottom: 0;
          height: 96px;
          width: 26px;
          transform: rotate(-12deg);
        }

        .leaf-3 {
          left: 84px;
          bottom: 25px;
          height: 105px;
          width: 29px;
          transform: rotate(25deg);
        }

        .leaf-4 {
          left: 40px;
          bottom: 67px;
          height: 73px;
          width: 23px;
          transform: rotate(-65deg);
        }

        .leaf-5 {
          left: 94px;
          bottom: 86px;
          height: 70px;
          width: 23px;
          transform: rotate(56deg);
        }

        @media (max-width: 950px) {
          .market-overview-card {
            grid-template-columns:
              minmax(270px, 1.3fr)
              1px
              minmax(180px, 0.8fr);
          }

          .second-divider,
          .trend-section {
            display: none;
          }
        }

        @media (max-width: 680px) {
          .market-header {
            height: 68px;
            padding: 0 16px;
          }

          .market-brand-copy span {
            display: none;
          }

          .market-brand-copy strong {
            font-size: 16px;
          }

          .market-brand-mark {
            width: 35px;
            height: 35px;
          }

          .market-header-actions {
            gap: 7px;
          }

          .market-profile {
            width: 40px;
            height: 40px;
          }

          .market-main {
            width: 94%;
            padding: 16px 0 80px;
          }

          .market-panel {
            padding: 22px 15px 17px;
            border-radius: 20px;
          }

          .market-back {
            margin-bottom: 19px;
            font-size: 13px;
          }

          .market-title-area h1 {
            font-size: 29px;
          }

          .market-title-area p {
            font-size: 12px;
            margin-bottom: 18px;
          }

          .market-overview-card {
            grid-template-columns: 1fr;
            gap: 16px;
            padding: 16px;
          }

          .vertical-divider {
            width: 100%;
            height: 1px;
          }

          .crop-section {
            gap: 13px;
          }

          .crop-visual {
            width: 78px;
            height: 78px;
            flex-basis: 78px;
            border-radius: 14px;
          }

          .crop-visual span {
            font-size: 43px;
          }

          .crop-details h2 {
            font-size: 20px;
          }

          .price-value {
            font-size: 24px;
          }

          .market-details {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .detail-item {
            gap: 7px;
          }

          .detail-icon {
            width: 31px;
            height: 31px;
            flex-basis: 31px;
          }

          .detail-item span {
            font-size: 9px;
          }

          .detail-item strong {
            font-size: 12px;
          }

          .market-stat-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .stat-card {
            min-height: 58px;
          }

          .decision-note {
            padding: 12px;
          }

          .compare-button {
            min-height: 54px;
            font-size: 14px;
          }

          .market-decoration {
            transform: scale(0.65);
            transform-origin: bottom left;
          }

          .right-decoration {
            transform:
              scaleX(-1)
              scale(0.65);
            transform-origin: bottom right;
          }
        }
      `}</style>
    </div>
  );
}