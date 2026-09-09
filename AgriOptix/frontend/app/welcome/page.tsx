"use client";

import React from "react";

export default function Welcome() {
  return (
    <main className="page">
      <div className="screen">

        {/* EXACT REFERENCE INTERFACE */}
        <img
          src="/hero.jpeg"
          alt="AgriOptix"
          className="reference-image"
        />

        {/* CLICKABLE AREAS */}

        <button
          className="click-area get-started"
          onClick={() => {
            window.location.href = "/role-selection";
          }}
          aria-label="Get Started"
        />

        <button
          className="click-area watch-demo"
          onClick={() => {
            alert("Demo coming soon");
          }}
          aria-label="Watch Demo"
        />

        <button
          className="click-area login"
          onClick={() => {
            alert("Login");
          }}
          aria-label="Login"
        />

        <button
          className="click-area best-plan"
          onClick={() => {
            alert("Best Plan");
          }}
          aria-label="View Best Plan"
        />

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        .page {
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          background: #ffffff;
          overflow-x: hidden;
        }

        .screen {
          position: relative;
          width: 100%;
          margin: 0;
          padding: 0;
          line-height: 0;
        }

        .reference-image {
          display: block;
          width: 100%;
          height: auto;
          margin: 0;
          padding: 0;
          border: 0;
          user-select: none;
          -webkit-user-drag: none;
        }

        /*
          Invisible buttons placed exactly over
          the buttons in the reference image.
        */

        .click-area {
          position: absolute;
          border: none;
          background: transparent;
          padding: 0;
          margin: 0;
          cursor: pointer;
          z-index: 10;
        }

        .click-area:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        /*
          Reference image is 1536 x 1024.

          Positions below are percentages so the
          interface scales with the browser.
        */

        .get-started {
          left: 4.7%;
          top: 64.5%;
          width: 14.3%;
          height: 6.2%;
          border-radius: 40px;
        }

        .watch-demo {
          left: 20%;
          top: 64.5%;
          width: 12.5%;
          height: 6.2%;
          border-radius: 40px;
        }

        .login {
          left: 15.7%;
          top: 72.7%;
          width: 4.2%;
          height: 3%;
        }

        .best-plan {
          left: 82.8%;
          top: 79.4%;
          width: 8.2%;
          height: 4%;
          border-radius: 20px;
        }

        @media (max-width: 700px) {
          .get-started {
            left: 4.5%;
            top: 64%;
            width: 20%;
          }

          .watch-demo {
            left: 25%;
            top: 64%;
            width: 17%;
          }

          .login {
            left: 20%;
            top: 72%;
            width: 7%;
          }

          .best-plan {
            left: 81%;
            top: 79%;
            width: 13%;
          }
        }
      `}</style>
    </main>
  );
}