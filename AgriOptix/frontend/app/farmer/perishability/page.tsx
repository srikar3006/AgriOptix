"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  Info,
  Leaf,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useWorkflow, api } from "../../../lib/store";

type DecayPoint = {
  day: number;
  loss_per_kg: number;
};

type PerishabilityResult = {
  remaining_shelf_life_days?: number;
  urgency?: string;
  expected_value_loss?: number | null;
  decay_curve?: DecayPoint[];
  recommended_window?: string;
  confidence?: number;
};

function getLossLevel(
  loss: number
): "low" | "medium" | "high" {
  if (loss < 1) return "low";
  if (loss < 3) return "medium";
  return "high";
}

function getDayLabel(day: number): string {
  if (day === 0) return "Today";

  return `Day ${day}`;
}

export default function PerishabilityPage() {
  const router = useRouter();

  const { wf, setWf, ready } = useWorkflow();

  const [result, setResult] =
    useState<PerishabilityResult | null>(
      wf.perishability || null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (wf.perishability) {
      setResult(wf.perishability);
      return;
    }

    const rawHarvestId =
      wf.harvest?.id ??
      wf.aiQuality?.harvest_id;

    const harvestId = Number(rawHarvestId);

    if (
      !Number.isInteger(harvestId) ||
      harvestId <= 0
    ) {
      setError(
        "A saved harvest is required before shelf-life analysis."
      );
      return;
    }

    let cancelled = false;

    async function loadPerishability() {
      try {
        setLoading(true);
        setError("");

        const response =
          await api(
            "/api/perishability/predict",
            {
              method: "POST",
              cache: "no-store",
              headers: {
                "Content-Type":
                  "application/json",
                "Cache-Control":
                  "no-store",
              },
              body: JSON.stringify({
                harvest_id: harvestId,
                timezone_offset_minutes:
                  new Date().getTimezoneOffset(),
              }),
            }
          );

        if (cancelled) {
          return;
        }

        setResult(response);

        setWf({
          perishability: response,
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to calculate shelf life."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPerishability();

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    wf.perishability,
    wf.harvest?.id,
    wf.aiQuality?.harvest_id,
    setWf,
  ]);

  const curve = useMemo<DecayPoint[]>(() => {
    if (
      result?.decay_curve &&
      result.decay_curve.length > 0
    ) {
      return result.decay_curve;
    }

    return [
      {
        day: 0,
        loss_per_kg: 0,
      },
      {
        day: 1,
        loss_per_kg: 0.8,
      },
      {
        day: 2,
        loss_per_kg: 2.1,
      },
      {
        day: 3,
        loss_per_kg: 4.8,
      },
    ];
  }, [result]);

  const timeline = useMemo(
    () => curve.slice(0, 4),
    [curve]
  );

  const remainingDays =
    typeof result?.remaining_shelf_life_days ===
    "number"
      ? result.remaining_shelf_life_days
      : 0;

  const urgency = String(
    result?.urgency || "HIGH"
  ).toUpperCase();

  const expectedValueLoss =
    result?.expected_value_loss;

  const confidence =
    typeof result?.confidence === "number"
      ? Math.round(result.confidence)
      : null;

  const maxLoss = Math.max(
    ...timeline.map(
      (item) =>
        Number(item.loss_per_kg) || 0
    ),
    1
  );

  function retryAnalysis() {
    setResult(null);

    setWf({
      perishability: null,
    });

    setError("");
  }

  return (
    <div className="perishability-page">
      <header className="perishability-header">
        <div
          className="perishability-brand"
          aria-label="AgriOptix"
        >
          <span className="brand-mark">
            <Leaf
              className="brand-leaf brand-leaf-back"
              size={30}
            />

            <Leaf
              className="brand-leaf brand-leaf-front"
              size={37}
            />
          </span>

          <span className="brand-name">
            AgriOptix
          </span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="header-icon-button"
            aria-label="Notifications"
          >
            <Bell size={22} />
          </button>

          <span
            className="avatar"
            aria-hidden="true"
          >
            <UserRound size={21} />
          </span>
        </div>
      </header>

      <main className="perishability-main">
        <button
          type="button"
          className="back-button"
          onClick={() =>
            router.push("/farmer/quality")
          }
        >
          <ArrowLeft size={20} />

          <span>
            Back to AI Quality
          </span>
        </button>

        <section className="main-card">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                STEP 5 · INTELLIGENCE
              </span>

              <h1>
                Shelf-Life &{" "}
                <span>Perishability</span>
              </h1>

              <p>
                Understand how quickly produce
                value can decline and when
                selling becomes more urgent.
              </p>
            </div>

            <div className="analysis-status">
              <span className="status-dot" />
              AI analysis
            </div>
          </div>

          {error && (
            <div
              className="error-box"
              role="alert"
            >
              <div className="error-icon">
                <AlertTriangle size={21} />
              </div>

              <div>
                <strong>
                  Shelf-life analysis unavailable
                </strong>

                <p>{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div
              className="loading-box"
              aria-live="polite"
            >
              <div className="loading-icon">
                <RefreshCw size={24} />
              </div>

              <div>
                <strong>
                  Calculating perishability
                </strong>

                <p>
                  Evaluating remaining shelf
                  life and expected value loss...
                </p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="hero-grid">
                <div className="shelf-card">
                  <div className="shelf-icon">
                    <Leaf
                      size={28}
                      fill="currentColor"
                    />
                  </div>

                  <div>
                    <span>
                      Estimated shelf life
                    </span>

                    <strong>
                      {remainingDays.toFixed(1)}
                      <small> days</small>
                    </strong>
                  </div>
                </div>

                <div className="urgency-card">
                  <span>
                    Selling urgency
                  </span>

                  <strong
                    className={
                      urgency === "HIGH"
                        ? "urgency-high"
                        : urgency === "MEDIUM"
                          ? "urgency-medium"
                          : "urgency-low"
                    }
                  >
                    {urgency}
                  </strong>

                  <small>
                    Based on expected value decay
                  </small>
                </div>
              </div>

              <div className="content-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">
                        VALUE DECAY
                      </span>

                      <h2>
                        Expected loss over time
                      </h2>
                    </div>

                    <Info
                      size={20}
                      className="info-icon"
                    />
                  </div>

                  <div className="chart">
                    <div className="chart-labels">
                      <span>High</span>
                      <span>Loss</span>
                      <span>Low</span>
                    </div>

                    <div className="chart-area">
                      <div className="grid-line grid-top" />
                      <div className="grid-line grid-middle" />
                      <div className="grid-line grid-bottom" />

                      <div className="bars">
                        {timeline.map(
                          (
                            point,
                            index
                          ) => {
                            const value =
                              Number(
                                point.loss_per_kg
                              ) || 0;

                            const height =
                              18 +
                              (value /
                                maxLoss) *
                                120;

                            const last =
                              index ===
                              timeline.length -
                                1;

                            return (
                              <div
                                className="bar-column"
                                key={
                                  `${point.day}-${index}`
                                }
                              >
                                {last && (
                                  <span className="chart-tooltip">
                                    {remainingDays.toFixed(
                                      1
                                    )} days
                                  </span>
                                )}

                                <div
                                  className={
                                    `bar bar-${getLossLevel(
                                      value
                                    )}`
                                  }
                                  style={{
                                    height: `${height}px`,
                                  }}
                                />

                                <span className="bar-label">
                                  {getDayLabel(
                                    point.day
                                  )}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="panel insight-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">
                        RECOMMENDATION
                      </span>

                      <h2>
                        What this means
                      </h2>
                    </div>
                  </div>

                  <div className="insight-box">
                    <div className="insight-icon">
                      <AlertTriangle
                        size={19}
                      />
                    </div>

                    <div>
                      <strong>
                        {urgency === "HIGH"
                          ? "Sell sooner"
                          : urgency === "MEDIUM"
                            ? "Plan your sale"
                            : "Flexible selling window"}
                      </strong>

                      <p>
                        {urgency === "HIGH"
                          ? "Delaying the sale can increase expected value loss."
                          : urgency === "MEDIUM"
                            ? "You have some flexibility, but earlier selling can preserve value."
                            : "The current estimate indicates a relatively flexible selling window."}
                      </p>
                    </div>
                  </div>

                  <div className="metric">
                    <span>
                      Expected value loss
                    </span>

                    <strong>
                      {expectedValueLoss !==
                        null &&
                      expectedValueLoss !==
                        undefined
                        ? `₹${Number(
                            expectedValueLoss
                          ).toFixed(2)}`
                        : "Unavailable"}
                    </strong>
                  </div>

                  {confidence !== null && (
                    <div className="confidence">
                      <CheckCircle2 size={17} />

                      <span>
                        AI confidence:{" "}
                        <strong>
                          {confidence}%
                        </strong>
                      </span>
                    </div>
                  )}
                </section>
              </div>

              <section className="timeline-section">
                <div className="timeline-heading">
                  <div>
                    <span className="panel-kicker">
                      SELLING WINDOW
                    </span>

                    <h2>
                      Perishability timeline
                    </h2>
                  </div>

                  <span className="timeline-caption">
                    Expected loss / kg
                  </span>
                </div>

                <div className="timeline">
                  {timeline.map(
                    (
                      point,
                      index
                    ) => {
                      const value =
                        Number(
                          point.loss_per_kg
                        ) || 0;

                      const level =
                        getLossLevel(value);

                      return (
                        <div
                          className="timeline-item"
                          key={
                            `${point.day}-${index}`
                          }
                        >
                          <span className="timeline-day">
                            {getDayLabel(
                              point.day
                            )}
                          </span>

                          <div
                            className={
                              `timeline-bar ${level}`
                            }
                          />

                          <span
                            className={
                              `level-badge ${level}`
                            }
                          >
                            {level.toUpperCase()}
                          </span>

                          <span className="timeline-loss">
                            ₹{value.toFixed(2)}
                            /kg
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>

              <div className="explanation">
                <div className="explanation-icon">
                  <Info size={20} />
                </div>

                <div>
                  <strong>
                    Why this matters
                  </strong>

                  <p>
                    Produce is time-sensitive.
                    AgriOptix combines estimated
                    remaining shelf life with
                    expected value loss to help
                    determine how urgently the
                    harvest should move to market.
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="actions">
            <button
              type="button"
              className="secondary-button"
              onClick={retryAnalysis}
              disabled={loading}
            >
              <RefreshCw size={18} />

              <span>
                Recalculate
              </span>
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                router.push(
                  "/farmer/market"
                )
              }
              disabled={
                loading || !!error
              }
            >
              <span>
                Continue to Market
              </span>

              <ArrowRight size={21} />
            </button>
          </div>
        </section>
      </main>

      <style jsx global>{`* {
          box-sizing: border-box;
        }

        .perishability-page {
          min-height: 100vh;
          overflow-x: hidden;
          color: #173d35;
          background:
            radial-gradient(
              circle at 50% -15%,
              #ffffff 0%,
              #edf9f4 42%,
              transparent 72%
            ),
            linear-gradient(
              180deg,
              #eaf8f3 0%,
              #f8fcfa 55%,
              #e8f6f0 100%
            );
          font-family:
            Inter,
            Arial,
            sans-serif;
        }

        .perishability-page button {
          font-family: inherit;
        }

        .perishability-header {
          height: 72px;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 10;
          background: rgba(
            255,
            255,
            255,
            0.88
          );
          border-bottom: 1px solid #dceee7;
          box-shadow:
            0 4px 20px
              rgba(33, 91, 73, 0.06);
          backdrop-filter: blur(14px);
        }

        .perishability-brand {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .brand-mark {
          width: 40px;
          height: 40px;
          position: relative;
          display: block;
          color: #18a66d;
        }

        .brand-leaf {
          position: absolute;
        }

        .brand-leaf-back {
          left: 0;
          top: 9px;
          transform: rotate(-42deg);
          opacity: 0.7;
        }

        .brand-leaf-front {
          left: 8px;
          top: 0;
          transform: rotate(7deg);
        }

        .brand-name {
          color: #123d35;
          font-size: 25px;
          font-weight: 850;
          letter-spacing: -1px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon-button {
          width: 40px;
          height: 40px;
          padding: 0;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          color: #35675c;
          background: transparent;
          cursor: pointer;
        }

        .header-icon-button:hover {
          background: #eaf6f1;
        }

        .avatar {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #197858;
          background: #dff4ea;
          border: 1px solid #cce9dc;
        }

        .perishability-main {
          width: min(
            1120px,
            calc(100% - 40px)
          );
          margin: 0 auto;
          padding: 22px 0 70px;
        }

        .back-button {
          margin-bottom: 18px;
          padding: 7px 2px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          color: #087c55;
          background: transparent;
          font-size: 15px;
          font-weight: 750;
          cursor: pointer;
        }

        .back-button:hover {
          color: #045f41;
        }

        .main-card {
          padding: 32px;
          border: 1px solid #dceee7;
          border-radius: 28px;
          background: rgba(
            255,
            255,
            255,
            0.96
          );
          box-shadow:
            0 25px 70px
              rgba(38, 99, 80, 0.1);
        }

        .page-heading {
          margin-bottom: 30px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 25px;
        }

        .eyebrow {
          display: inline-block;
          margin-bottom: 8px;
          color: #15875f;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.5px;
        }

        .page-heading h1 {
          margin: 0;
          color: #12362f;
          font-size: clamp(
            32px,
            4vw,
            48px
          );
          line-height: 1.05;
          font-weight: 850;
          letter-spacing: -1.8px;
        }

        .page-heading h1 span {
          color: #0a9765;
        }

        .page-heading p {
          max-width: 650px;
          margin: 12px 0 0;
          color: #687f78;
          font-size: 16px;
          line-height: 1.55;
        }

        .analysis-status {
          min-height: 38px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
          border: 1px solid #d7eee4;
          border-radius: 999px;
          color: #177654;
          background: #f1faf6;
          font-size: 13px;
          font-weight: 750;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #17a36e;
          box-shadow:
            0 0 0 4px #dff4e9;
        }

        .error-box {
          margin-bottom: 22px;
          padding: 16px 18px;
          display: flex;
          align-items: flex-start;
          gap: 13px;
          border: 1px solid #efcfd2;
          border-radius: 16px;
          background: #fff5f5;
          color: #812d39;
        }

        .error-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #a72b3c;
          background: #ffe2e4;
        }

        .error-box strong {
          display: block;
          font-size: 15px;
          font-weight: 800;
        }

        .error-box p {
          margin: 4px 0 0;
          font-size: 14px;
          line-height: 1.45;
        }

        .loading-box {
          min-height: 150px;
          margin-bottom: 24px;
          padding: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          border: 1px solid #dceee7;
          border-radius: 20px;
          background: #f4fbf8;
        }

        .loading-icon {
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 50%;
          color: #0b9666;
          background: #e0f4eb;
          animation:
            perishability-spin
            1s linear infinite;
        }

        @keyframes perishability-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-box strong {
          display: block;
          color: #173b35;
          font-size: 18px;
          font-weight: 800;
        }

        .loading-box p {
          margin: 5px 0 0;
          color: #71847e;
          font-size: 14px;
        }

        .hero-grid {
          margin-bottom: 20px;
          display: grid;
          grid-template-columns:
            1.35fr 0.65fr;
          gap: 16px;
        }

        .shelf-card {
          min-height: 142px;
          padding: 25px;
          display: flex;
          align-items: center;
          gap: 18px;
          border-radius: 22px;
          color: #ffffff;
          background:
            linear-gradient(
              120deg,
              #08794e,
              #0ba16b
            );
          box-shadow:
            0 14px 30px
              rgba(8, 126, 79, 0.18);
        }

        .shelf-icon {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 18px;
          color: #dffff0;
          background:
            rgba(255, 255, 255, 0.15);
        }

        .shelf-card span,
        .urgency-card > span {
          display: block;
          font-size: 13px;
          font-weight: 700;
          opacity: 0.86;
        }

        .shelf-card strong {
          display: block;
          margin-top: 5px;
          font-size: clamp(
            38px,
            5vw,
            54px
          );
          line-height: 1;
          font-weight: 850;
          letter-spacing: -2px;
        }

        .shelf-card strong small {
          font-size: 19px;
          font-weight: 750;
          letter-spacing: 0;
        }

        .urgency-card {
          min-height: 142px;
          padding: 23px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border: 1px solid #dceee7;
          border-radius: 22px;
          background: #f6fbf9;
        }

        .urgency-card strong {
          margin-top: 7px;
          font-size: 29px;
          line-height: 1;
          font-weight: 850;
        }

        .urgency-high {
          color: #c3293b;
        }

        .urgency-medium {
          color: #c58a10;
        }

        .urgency-low {
          color: #16835b;
        }

        .urgency-card small {
          margin-top: 9px;
          color: #71847e;
          font-size: 12px;
          line-height: 1.4;
        }

        .content-grid {
          margin-bottom: 20px;
          display: grid;
          grid-template-columns:
            1.45fr 0.75fr;
          gap: 16px;
        }

        .panel {
          min-width: 0;
          padding: 22px;
          border: 1px solid #deeee8;
          border-radius: 21px;
          background: #ffffff;
        }

        .panel-heading {
          margin-bottom: 18px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .panel-kicker {
          display: block;
          margin-bottom: 5px;
          color: #5e9382;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 1.5px;
        }

        .panel-heading h2,
        .timeline-heading h2 {
          margin: 0;
          color: #173a34;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 820;
          letter-spacing: -0.5px;
        }

        .info-icon {
          color: #6d9187;
        }

        .chart {
          min-height: 210px;
          display: flex;
          gap: 12px;
          padding-top: 8px;
        }

        .chart-labels {
          width: 40px;
          flex: 0 0 40px;
          padding: 4px 0 28px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #91a59f;
          font-size: 10px;
          font-weight: 700;
          text-align: right;
        }

        .chart-area {
          height: 190px;
          min-width: 0;
          position: relative;
          flex: 1;
          border-bottom: 1px solid #dcebe5;
        }

        .grid-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          border-top: 1px dashed #e4eee9;
        }

        .grid-top {
          top: 8px;
        }

        .grid-middle {
          top: 50%;
        }

        .grid-bottom {
          bottom: 0;
        }

        .bars {
          position: absolute;
          inset: 0;
          padding: 0 10px;
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          gap: 14px;
        }

        .bar-column {
          min-width: 50px;
          height: 100%;
          position: relative;
          display: flex;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .bar {
          width: min(54px, 65%);
          min-height: 16px;
          position: relative;
          z-index: 2;
          border-radius: 9px 9px 3px 3px;
        }

        .bar-low {
          background: #7cc9a6;
        }

        .bar-medium {
          background: #e8b955;
        }

        .bar-high {
          background: #df6a70;
        }

        .bar-label {
          color: #6e8980;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .chart-tooltip {
          position: absolute;
          left: 50%;
          bottom: calc(100% - 15px);
          z-index: 5;
          padding: 6px 9px;
          transform: translateX(-50%);
          border-radius: 8px;
          color: #ffffff;
          background: #173e36;
          font-size: 10px;
          font-weight: 750;
          white-space: nowrap;
          box-shadow:
            0 7px 18px
              rgba(21, 61, 52, 0.18);
        }

        .chart-tooltip::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -5px;
          width: 9px;
          height: 9px;
          transform:
            translateX(-50%)
            rotate(45deg);
          background: #173e36;
        }

        .insight-panel {
          display: flex;
          flex-direction: column;
        }

        .insight-box {
          padding: 15px;
          display: flex;
          align-items: flex-start;
          gap: 11px;
          border: 1px solid #f2dfb0;
          border-radius: 15px;
          background: #fff8e9;
        }

        .insight-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 9px;
          color: #b27a0a;
          background: #ffedbf;
        }

        .insight-box strong {
          display: block;
          color: #725214;
          font-size: 14px;
          font-weight: 850;
        }

        .insight-box p {
          margin: 5px 0 0;
          color: #816d46;
          font-size: 12px;
          line-height: 1.45;
        }

        .metric {
          margin-top: 18px;
          padding-top: 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-top: 1px solid #e5efeb;
        }

        .metric span {
          color: #789089;
          font-size: 12px;
          font-weight: 700;
        }

        .metric strong {
          color: #173e36;
          font-size: 18px;
          font-weight: 850;
        }

        .confidence {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #338267;
          font-size: 12px;
        }

        .confidence strong {
          color: #176b50;
        }

        .timeline-section {
          margin-top: 20px;
          padding: 22px;
          border: 1px solid #deeee8;
          border-radius: 21px;
          background: #fbfefd;
        }

        .timeline-heading {
          margin-bottom: 22px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
        }

        .timeline-caption {
          color: #849b93;
          font-size: 11px;
          font-weight: 700;
        }

        .timeline {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .timeline-item {
          min-width: 0;
          padding: 16px 14px;
          border: 1px solid #e2eee9;
          border-radius: 15px;
          background: #ffffff;
        }

        .timeline-day {
          display: block;
          margin-bottom: 13px;
          color: #284e45;
          font-size: 13px;
          font-weight: 800;
        }

        .timeline-bar {
          width: 100%;
          height: 5px;
          margin-bottom: 11px;
          border-radius: 999px;
        }

        .timeline-bar.low {
          background: #8acfae;
        }

        .timeline-bar.medium {
          background: #e7bd63;
        }

        .timeline-bar.high {
          background: #df777d;
        }

        .level-badge {
          display: inline-flex;
          align-items: center;
          min-height: 23px;
          padding: 0 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.7px;
        }

        .level-badge.low {
          color: #247451;
          background: #e5f6ed;
        }

        .level-badge.medium {
          color: #936a11;
          background: #fff2cf;
        }

        .level-badge.high {
          color: #a53842;
          background: #fde7e8;
        }

        .timeline-loss {
          display: block;
          margin-top: 8px;
          color: #728880;
          font-size: 11px;
          font-weight: 700;
        }

        .explanation {
          margin-top: 20px;
          padding: 17px 18px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border: 1px solid #d8ebe3;
          border-radius: 16px;
          background: #eff9f5;
        }

        .explanation-icon {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 10px;
          color: #16825c;
          background: #d9f1e6;
        }

        .explanation strong {
          display: block;
          color: #205046;
          font-size: 14px;
          font-weight: 850;
        }

        .explanation p {
          margin: 4px 0 0;
          color: #69827a;
          font-size: 12px;
          line-height: 1.55;
        }

        .actions {
          margin-top: 24px;
          padding-top: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-top: 1px solid #e3eee9;
        }

        .secondary-button,
        .primary-button {
          min-height: 50px;
          padding: 0 19px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 13px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .secondary-button {
          color: #37685c;
          background: #ffffff;
          border: 1px solid #d7e9e2;
        }

        .secondary-button:hover:not(
          :disabled
        ) {
          background: #f1f9f6;
          transform: translateY(-1px);
        }

        .primary-button {
          min-width: 215px;
          color: #ffffff;
          background:
            linear-gradient(
              135deg,
              #087b51,
              #0da16c
            );
          border: 1px solid #087d53;
          box-shadow:
            0 10px 22px
              rgba(10, 130, 82, 0.2);
        }

        .primary-button:hover:not(
          :disabled
        ) {
          transform: translateY(-2px);
          box-shadow:
            0 14px 27px
              rgba(10, 130, 82, 0.25);
        }

        .secondary-button:disabled,
        .primary-button:disabled {
          opacity: 0.48;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        @media (max-width: 900px) {
          .main-card {
            padding: 24px;
          }

          .hero-grid,
          .content-grid {
            grid-template-columns: 1fr;
          }

          .timeline {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .perishability-header {
            height: 64px;
            padding: 0 16px;
          }

          .brand-name {
            font-size: 21px;
          }

          .perishability-main {
            width: calc(100% - 24px);
            padding-top: 16px;
          }

          .main-card {
            padding: 18px;
            border-radius: 21px;
          }

          .page-heading {
            flex-direction: column;
            gap: 14px;
            margin-bottom: 22px;
          }

          .page-heading h1 {
            font-size: 32px;
          }

          .analysis-status {
            align-self: flex-start;
          }

          .shelf-card,
          .urgency-card {
            min-height: 120px;
            padding: 19px;
          }

          .shelf-card strong {
            font-size: 40px;
          }

          .panel,
          .timeline-section {
            padding: 17px;
          }

          .chart {
            min-height: 190px;
          }

          .chart-area {
            height: 175px;
          }

          .bars {
            gap: 5px;
            padding: 0 3px;
          }

          .bar-column {
            min-width: 42px;
          }

          .bar {
            width: 42px;
          }

          .timeline {
            grid-template-columns: 1fr;
          }

          .timeline-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 7px;
          }

          .actions {
            flex-direction: column-reverse;
          }

          .secondary-button,
          .primary-button {
            width: 100%;
          }

          .primary-button {
            min-width: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-icon {
            animation: none;
          }

          .secondary-button,
          .primary-button {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}