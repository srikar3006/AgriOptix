"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Leaf,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Truck,
  UserRound,
} from "lucide-react";
import { useWorkflow } from "../../../../lib/store";

type Buyer = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  distance: number;
  pickup: string;
  reliability: number;
  payment: string;
  recommended?: boolean;
};

const buyers: Buyer[] = [
  {
    id: "nizamabad-fresh",
    name: "Nizamabad Fresh Foods",
    price: 28,
    quantity: 500,
    distance: 12,
    pickup: "Today",
    reliability: 96,
    payment: "Same day",
    recommended: true,
  },
  {
    id: "telangana-agro",
    name: "Telangana Agro Traders",
    price: 27,
    quantity: 800,
    distance: 18,
    pickup: "Today",
    reliability: 92,
    payment: "24 hours",
  },
  {
    id: "deccan-fresh",
    name: "Deccan Fresh Mart",
    price: 26,
    quantity: 600,
    distance: 27,
    pickup: "Tomorrow",
    reliability: 89,
    payment: "24 hours",
  },
];

export default function BuyerComparisonPage() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();

  const [selectedBuyerId, setSelectedBuyerId] = useState(
    buyers[0].id
  );

  const selectedBuyer =
    buyers.find((buyer) => buyer.id === selectedBuyerId) ?? buyers[0];

  const crop = wf.crop || "Tomato";
  const quality =
  typeof wf.quality === "string"
    ? wf.quality
    : wf.quality?.overall_quality || "Good";
  const quantity = Number(wf.quantity) || 500;

  const estimatedRevenue = useMemo(
    () => quantity * selectedBuyer.price,
    [quantity, selectedBuyer.price]
  );

  const handleContinue = () => {
    setWf({
      selectedBuyer: selectedBuyer,
    });

    router.push("/farmer/optimization");
  };

  return (
    <div className="buyer-page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={21} strokeWidth={2.4} />
          </div>

          <div>
            <div className="brand-name">AgriOptix</div>
            <div className="brand-subtitle">Farm Intelligence</div>
          </div>
        </div>

        <div className="top-actions">
          <button className="icon-button" aria-label="Notifications">
            <Bell size={20} />
          </button>

          <div className="profile">
            <div className="profile-icon">
              <UserRound size={18} />
            </div>
            <span>Farmer</span>
            <ChevronDown size={16} />
          </div>
        </div>
      </header>

      <main className="page-container">
        <button
          className="back-button"
          onClick={() => router.push("/farmer/market")}
        >
          <ArrowLeft size={18} />
          Back to Market Intelligence
        </button>

        <section className="page-heading">
          <div>
            <div className="eyebrow">MARKET INTELLIGENCE</div>

            <h1>Buyer Comparison</h1>

            <p>
              Compare verified buyers and select the option that gives
              you the best expected return.
            </p>
          </div>

          <div className="crop-summary">
            <div className="crop-icon">
              <Leaf size={22} />
            </div>

            <div>
              <span>Crop</span>
              <strong>{crop}</strong>
            </div>
          </div>
        </section>

        <section className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">QUALITY</span>
            <strong>{quality}</strong>
            <small>AI assessed</small>
          </div>

          <div className="summary-card">
            <span className="summary-label">AVAILABLE</span>
            <strong>{quantity} kg</strong>
            <small>Harvest quantity</small>
          </div>

          <div className="summary-card">
            <span className="summary-label">MARKET</span>
            <strong>Nizamabad</strong>
            <small>Current location</small>
          </div>

          <div className="summary-card highlight">
            <span className="summary-label">SELECTED VALUE</span>
            <strong>₹{estimatedRevenue.toLocaleString()}</strong>
            <small>Estimated gross revenue</small>
          </div>
        </section>

        <section className="comparison-section">
          <div className="section-header">
            <div>
              <h2>Available Buyers</h2>
              <p>Compare price, distance, reliability and payment speed.</p>
            </div>

            <div className="verified-label">
              <ShieldCheck size={17} />
              Verified buyers
            </div>
          </div>

          <div className="buyer-list">
            {buyers.map((buyer) => {
              const isSelected = buyer.id === selectedBuyerId;

              return (
                <button
                  key={buyer.id}
                  className={`buyer-card ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => setSelectedBuyerId(buyer.id)}
                >
                  <div className="buyer-main">
                    <div className="buyer-logo">
                      {buyer.name.charAt(0)}
                    </div>

                    <div className="buyer-info">
                      <div className="buyer-title-row">
                        <h3>{buyer.name}</h3>

                        {buyer.recommended && (
                          <span className="recommended-badge">
                            Recommended
                          </span>
                        )}
                      </div>

                      <div className="buyer-location">
                        <MapPin size={14} />
                        Nizamabad
                      </div>
                    </div>
                  </div>

                  <div className="buyer-metrics">
                    <div className="metric">
                      <span>Price</span>
                      <strong>₹{buyer.price}/kg</strong>
                    </div>

                    <div className="metric">
                      <span>Capacity</span>
                      <strong>{buyer.quantity} kg</strong>
                    </div>

                    <div className="metric">
                      <span>Distance</span>
                      <strong>{buyer.distance} km</strong>
                    </div>

                    <div className="metric">
                      <span>Pickup</span>
                      <strong>{buyer.pickup}</strong>
                    </div>
                  </div>

                  <div className="buyer-footer">
                    <span className="reliability">
                      <CheckCircle2 size={15} />
                      {buyer.reliability}% reliability
                    </span>

                    <span className="payment">
                      <TrendingUp size={15} />
                      {buyer.payment}
                    </span>

                    <span className="select-indicator">
                      {isSelected ? "Selected" : "Select"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section><section className="decision-section">
          <div className="decision-header">
            <div>
              <div className="decision-eyebrow">
                SELECTED BUYER
              </div>

              <h2>{selectedBuyer.name}</h2>

              <p>
                This option is currently selected for your selling plan.
              </p>
            </div>

            <div className="selected-price">
              <span>Offer</span>
              <strong>₹{selectedBuyer.price}/kg</strong>
            </div>
          </div>

          <div className="decision-grid">
            <div className="decision-item">
              <div className="decision-icon">
                <TrendingUp size={19} />
              </div>

              <div>
                <span>Expected Revenue</span>
                <strong>
                  ₹{estimatedRevenue.toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="decision-item">
              <div className="decision-icon">
                <Truck size={19} />
              </div>

              <div>
                <span>Pickup Distance</span>
                <strong>{selectedBuyer.distance} km</strong>
              </div>
            </div>

            <div className="decision-item">
              <div className="decision-icon">
                <ShieldCheck size={19} />
              </div>

              <div>
                <span>Buyer Reliability</span>
                <strong>{selectedBuyer.reliability}%</strong>
              </div>
            </div>

            <div className="decision-item">
              <div className="decision-icon">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <span>Payment</span>
                <strong>{selectedBuyer.payment}</strong>
              </div>
            </div>
          </div>

          <div className="intelligence-note">
            <div className="note-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <strong>Why this buyer?</strong>

              <p>
                The comparison considers offered price, buyer
                reliability, pickup distance, capacity and payment
                timing rather than price alone.
              </p>
            </div>
          </div>
        </section>

        <div className="bottom-actions">
          <button
            className="secondary-button"
            onClick={() => router.push("/farmer/market")}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <button
            className="primary-button"
            onClick={handleContinue}
          >
            Continue to Optimization
            <ArrowRight size={18} />
          </button>
        </div>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f6f8f4;
          color: #172019;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button {
          font: inherit;
        }

        .buyer-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 85% 5%,
              rgba(49, 130, 82, 0.08),
              transparent 28%
            ),
            #f6f8f4;
        }

        .topbar {
          height: 72px;
          padding: 0 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #e3e8e1;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .brand-mark {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #dff2e3;
          color: #21733e;
        }

        .brand-name {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }

        .brand-subtitle {
          margin-top: 2px;
          color: #7b857d;
          font-size: 11px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .icon-button {
          width: 38px;
          height: 38px;
          border: 1px solid #e3e8e1;
          border-radius: 10px;
          background: white;
          color: #526057;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #344039;
          font-size: 14px;
          font-weight: 600;
        }

        .profile-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #e7efe8;
          color: #327247;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-container {
          width: min(1180px, 92%);
          margin: 0 auto;
          padding: 28px 0 50px;
        }

        .back-button {
          border: 0;
          background: transparent;
          padding: 0;
          color: #477052;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .page-heading {
          margin-top: 28px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 25px;
        }

        .eyebrow,
        .decision-eyebrow {
          color: #398052;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.3px;
        }

        .page-heading h1 {
          margin: 7px 0 8px;
          font-size: clamp(30px, 4vw, 43px);
          line-height: 1.05;
          letter-spacing: -1.5px;
        }

        .page-heading p {
          margin: 0;
          max-width: 620px;
          color: #68736b;
          font-size: 15px;
          line-height: 1.6;
        }

        .crop-summary {
          min-width: 180px;
          padding: 14px 17px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border: 1px solid #e1e8e1;
          border-radius: 15px;
        }

        .crop-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #e4f3e5;
          color: #2d7a43;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crop-summary span {
          display: block;
          color: #88918a;
          font-size: 11px;
        }

        .crop-summary strong {
          display: block;
          margin-top: 2px;
          font-size: 16px;
        }

        .summary-grid {
          margin-top: 28px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 13px;
        }

        .summary-card {
          padding: 19px;
          border: 1px solid #e2e8e1;
          border-radius: 16px;
          background: white;
        }

        .summary-card.highlight {
          background: #eef8ef;
          border-color: #cce5d0;
        }

        .summary-label {
          display: block;
          color: #879089;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .summary-card strong {
          display: block;
          margin-top: 8px;
          font-size: 22px;
        }

        .summary-card small {
          display: block;
          margin-top: 5px;
          color: #78827b;
          font-size: 12px;
        }

        .comparison-section {
          margin-top: 35px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 14px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 23px;
          letter-spacing: -0.5px;
        }

        .section-header p {
          margin: 5px 0 0;
          color: #78827b;
          font-size: 13px;
        }

        .verified-label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #39774b;
          font-size: 12px;
          font-weight: 700;
        }

        .buyer-list {
          display: grid;
          gap: 12px;
        }

        .buyer-card {
          width: 100%;
          padding: 20px;
          text-align: left;
          border: 1px solid #dfe6df;
          border-radius: 17px;
          background: white;
          cursor: pointer;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
        }

        .buyer-card:hover {
          border-color: #9fc5a5;
          transform: translateY(-1px);
        }

        .buyer-card.selected {
          border: 2px solid #3c8750;
          box-shadow: 0 8px 25px rgba(47, 104, 62, 0.09);
        }

        .buyer-main {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .buyer-logo {
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e5f2e7;
          color: #347445;
          font-size: 18px;
          font-weight: 800;
        }

        .buyer-title-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
        }

        .buyer-title-row h3 {
          margin: 0;
          font-size: 16px;
        }

        .recommended-badge {
          padding: 4px 8px;
          border-radius: 999px;
          background: #e5f5e8;
          color: #2f7741;
          font-size: 10px;
          font-weight: 800;
        }

        .buyer-location {
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 4px;
          color: #879089;
          font-size: 12px;
        }

        .buyer-metrics {
          margin: 20px 0 16px;
          padding: 15px 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-top: 1px solid #edf0ed;
          border-bottom: 1px solid #edf0ed;
        }

        .metric {
          padding: 0 15px;
          border-right: 1px solid #edf0ed;
        }

        .metric:first-child {
          padding-left: 0;
        }

        .metric:last-child {
          border-right: 0;
        }

        .metric span {
          display: block;
          color: #8a938c;
          font-size: 11px;
        }

        .metric strong {
          display: block;
          margin-top: 5px;
          color: #243229;
          font-size: 15px;
        }.buyer-footer {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          color: #667169;
          font-size: 12px;
        }

        .reliability,
        .payment {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .reliability {
          color: #347548;
          font-weight: 700;
        }

        .payment {
          color: #69746c;
        }

        .select-indicator {
          margin-left: auto;
          color: #39784a;
          font-weight: 800;
        }

        .decision-section {
          margin-top: 30px;
          padding: 24px;
          border: 1px solid #dce7dd;
          border-radius: 19px;
          background: white;
        }

        .decision-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .decision-header h2 {
          margin: 6px 0 5px;
          font-size: 21px;
        }

        .decision-header p {
          margin: 0;
          color: #78827b;
          font-size: 13px;
        }

        .selected-price {
          text-align: right;
        }

        .selected-price span {
          display: block;
          color: #89928b;
          font-size: 11px;
        }

        .selected-price strong {
          display: block;
          margin-top: 4px;
          color: #2e7742;
          font-size: 23px;
        }

        .decision-grid {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 11px;
        }

        .decision-item {
          min-height: 78px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #e7ece7;
          border-radius: 13px;
          background: #fafcf9;
        }

        .decision-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #e6f3e8;
          color: #347649;
        }

        .decision-item span {
          display: block;
          color: #89928b;
          font-size: 10px;
        }

        .decision-item strong {
          display: block;
          margin-top: 4px;
          font-size: 14px;
        }

        .intelligence-note {
          margin-top: 18px;
          padding: 15px;
          display: flex;
          align-items: flex-start;
          gap: 11px;
          border-radius: 13px;
          background: #f4f8f4;
        }

        .note-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e2efe4;
          color: #36774a;
        }

        .intelligence-note strong {
          font-size: 13px;
        }

        .intelligence-note p {
          margin: 4px 0 0;
          color: #69746c;
          font-size: 12px;
          line-height: 1.55;
        }

        .bottom-actions {
          margin-top: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .secondary-button,
        .primary-button {
          min-height: 48px;
          padding: 0 20px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
        }

        .secondary-button {
          border: 1px solid #dbe3dc;
          background: white;
          color: #4e5c53;
        }

        .primary-button {
          border: 1px solid #276c3b;
          background: #2f7943;
          color: white;
          box-shadow: 0 6px 18px rgba(47, 121, 67, 0.18);
        }

        .primary-button:hover {
          background: #286b3b;
        }

        @media (max-width: 850px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .decision-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .page-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .crop-summary {
            width: 100%;
          }
        }

        @media (max-width: 650px) {
          .topbar {
            padding: 0 4%;
          }

          .profile span,
          .profile > svg {
            display: none;
          }

          .page-container {
            width: 92%;
            padding-top: 22px;
          }

          .page-heading h1 {
            font-size: 31px;
          }

          .summary-grid {
            grid-template-columns: 1fr 1fr;
          }

          .summary-card {
            padding: 15px;
          }

          .summary-card strong {
            font-size: 18px;
          }

          .buyer-card {
            padding: 16px;
          }

          .buyer-metrics {
            grid-template-columns: 1fr 1fr;
            gap: 14px 0;
          }

          .metric:nth-child(2) {
            border-right: 0;
          }

          .metric:nth-child(3) {
            padding-left: 0;
          }

          .buyer-footer {
            gap: 10px 15px;
          }

          .select-indicator {
            margin-left: 0;
            width: 100%;
          }

          .decision-section {
            padding: 17px;
          }

          .decision-header {
            flex-direction: column;
          }

          .selected-price {
            text-align: left;
          }

          .decision-grid {
            grid-template-columns: 1fr;
          }

          .bottom-actions {
            flex-direction: column-reverse;
          }

          .secondary-button,
          .primary-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}