"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CalendarDays,
  MapPin,
  X,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useWorkflow } from "../../../lib/store";

const REQUIRED = 2;
const MAX_PHOTOS = 4;

function formatHarvestDate(value: unknown) {
  if (!value) return "";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function hashImage(dataUrl: string) {
  try {
    const encoded = dataUrl.split(",", 2)[1] || dataUrl;
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const digest = await crypto.subtle.digest("SHA-256", bytes);

    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `${dataUrl.length}:${dataUrl.slice(-64)}`;
  }
}

export default function TakePhotos() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const retakeIndexRef = useRef<number | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraBusy, setCameraBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const harvest = wf.harvest || {};

  const crop = harvest.crop || "produce";

  const quantity =
    harvest.quantity_kg ??
    harvest.quantity ??
    "";

  const harvestDate = formatHarvestDate(
    harvest.harvest_time ??
      harvest.harvestDate ??
      harvest.date
  );

  const location =
    harvest.location ??
    harvest.location_name ??
    harvest.village ??
    "Use current location";

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraBusy(false);
    setCapturing(false);
    retakeIndexRef.current = null;
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    };
  }, []);

  async function openCamera(retakeIndex: number | null = null) {
    if (
      retakeIndex === null &&
      wf.photos.length >= MAX_PHOTOS
    ) {
      return;
    }

    if (cameraBusy) {
      return;
    }

    setCameraError("");
    setCameraBusy(true);

    retakeIndexRef.current = retakeIndex;

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "This browser does not support direct camera access."
        );
      }

      /*
       * Always use the real browser/device camera.
       * No file picker is used.
       */
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      setCameraOpen(true);

      requestAnimationFrame(() => {
        const video = videoRef.current;

        if (!video) {
          return;
        }

        video.srcObject = stream;

        video
          .play()
          .catch(() => {
            setCameraError(
              "Camera preview could not start. Please try again."
            );
          });
      });
    } catch (error) {
      let message =
        "Camera is unavailable. Please try again.";

      if (
        error instanceof DOMException
      ) {
        if (error.name === "NotAllowedError") {
          message =
            "Camera permission is required to capture produce photos.";
        } else if (
          error.name === "NotFoundError"
        ) {
          message =
            "No camera was found on this device.";
        } else if (
          error.name === "NotReadableError"
        ) {
          message =
            "The camera is already being used by another application.";
        } else if (
          error.name === "SecurityError"
        ) {
          message =
            "Camera access is blocked by browser security settings.";
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      setCameraError(message);
      setCameraOpen(false);
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    } finally {
      setCameraBusy(false);
    }
  }

  async function capturePhoto() {
    if (capturing) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setCameraError(
        "Camera is not ready yet. Please wait a moment and try again."
      );
      return;
    }

    setCapturing(true);
    setCameraError("");

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Unable to capture this camera frame."
        );
      }

      /*
       * IMPORTANT:
       * This captures the CURRENT LIVE VIDEO FRAME.
       * It does not use a file picker or previous image.
       */
      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const image = canvas.toDataURL(
        "image/jpeg",
        0.88
      );

      if (!image.startsWith("data:image/jpeg")) {
        throw new Error(
          "Captured image format is invalid."
        );
      }

      if (image.length < 10_000) {
        throw new Error(
          "Captured image is too small. Please try again."
        );
      }

      const imageHash = await hashImage(image);

      console.info(
        "[AgriOptix Camera]",
        {
          imageMimeType: "image/jpeg",
          imageSize: image.length,
          imageHash,
        }
      );

      const currentPhotos = [
        ...(wf.photos || []),
      ];

      const targetIndex =
        retakeIndexRef.current;

      /*
       * Check actual image content.
       */
      const existingHashes =
        await Promise.all(
          currentPhotos.map((photo) =>
            hashImage(photo)
          )
        );

      const duplicate =
        existingHashes.some(
          (existingHash, index) =>
            index !== targetIndex &&
            existingHash === imageHash
        );

      if (duplicate) {
        setCameraError(
          "This photo is identical to an existing capture. Change the angle or position and capture again."
        );
        return;
      }

      if (
        targetIndex !== null &&
        targetIndex >= 0 &&
        targetIndex < currentPhotos.length
      ) {
        currentPhotos[targetIndex] = image;
      } else {
        currentPhotos.push(image);
      }

      const nextPhotos =
        currentPhotos.slice(0, MAX_PHOTOS);

      setWf({
        photos: nextPhotos,
        aiQuality: null,
      });

      retakeIndexRef.current = null;
      setCameraError("");

      /*
       * Keep camera open for additional captures.
       * Stop only after 4 photos.
       */
      if (nextPhotos.length >= MAX_PHOTOS) {
        stopCamera();
      }
    } catch (error) {
      setCameraError(
        error instanceof Error
          ? error.message
          : "Unable to capture the camera frame. Please try again."
      );
    } finally {
      setCapturing(false);
    }
  }

  function removePhoto(index: number) {
    const nextPhotos = wf.photos.filter(
      (_, photoIndex) =>
        photoIndex !== index
    );

    setWf({
      photos: nextPhotos,
      aiQuality: null,
    });

    setCameraError("");
  }

  function retakePhoto(index: number) {
    setCameraError("");
    void openCamera(index);
  }

  function continueToQuality() {
    if (
      wf.photos.length < REQUIRED ||
      wf.photos.length > MAX_PHOTOS
    ) {
      setCameraError(
        "Capture 2–4 produce photos before starting AI analysis."
      );
      return;
    }

    /*
     * Existing project quality route.
     * No new navigation flow is created.
     */
    router.push(
      "/farmer/quality?autoAnalyze=1"
    );
  }

  return (
    <main className="photos-page">
      <canvas
        ref={canvasRef}
        hidden
      />

      <section className="photos-container">
        <div className="photos-step-title">
          <span className="photos-step-number">
            3.
          </span>

          <span className="photos-step-divider" />

          <h1>
            Capture Produce Photos
          </h1>
        </div>

        <div className="photos-card">
          <div className="photos-card-header">
            <button
              type="button"
              className="photos-back"
              onClick={() =>
                router.push(
                  "/farmer/harvest"
                )
              }
              aria-label="Back to harvest"
            >
              <ArrowLeft
                size={34}
                strokeWidth={2.2}
              />
            </button>

            <span className="photos-header-divider" />

            <h2>
              Capture Produce Photos
            </h2>

            <span className="photos-required">
              *
            </span>
          </div>

          <p className="photos-camera-help">
            Use the live device camera to
            capture 2–4 clear views of the
            produce. No file upload is used.
          </p>

          {cameraError ? (
            <div
              className="photos-camera-error"
              role="alert"
            >
              {cameraError}
            </div>
          ) : null}

          <div
            className="photos-grid"
            aria-label={`Photos for ${crop}`}
          >
            {Array.from({
              length: MAX_PHOTOS,
            }).map((_, index) => {
              const src =
                wf.photos[index];

              if (src) {
                return (
                  <div
                    className="photos-tile photos-tile-filled"
                    key={index}
                  >
                    <img
                      src={src}
                      alt={`${crop} captured photo ${
                        index + 1
                      }`}
                    />

                    <div className="photos-photo-actions">
                      <button
                        type="button"
                        className="photos-action"
                        onClick={() =>
                          retakePhoto(index)
                        }
                        title="Retake photo"
                        aria-label={`Retake photo ${
                          index + 1
                        }`}
                      >
                        <RotateCcw
                          size={18}
                        />
                      </button>

                      <button
                        type="button"
                        className="photos-action"
                        onClick={() =>
                          removePhoto(index)
                        }
                        title="Remove photo"
                        aria-label={`Remove photo ${
                          index + 1
                        }`}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  className="photos-tile photos-empty-tile"
                  key={index}
                  aria-label={`Empty photo slot ${
                    index + 1
                  }`}
                >
                  <span className="photos-camera-circle">
                    <Camera
                      size={34}
                      strokeWidth={1.8}
                    />
                  </span>

                  <span className="photos-upload-text">
                    Photo {index + 1}
                  </span>

                  <small>
                    {index < REQUIRED
                      ? "Required"
                      : "Optional"}
                  </small>
                </div>
              );
            })}
          </div>

          <div className="photos-count">
            {wf.photos.length} of{" "}
            {MAX_PHOTOS} photos captured ·
            minimum {REQUIRED}
          </div>

          <button
            type="button"
            className="photos-capture-primary"
            onClick={() =>
              void openCamera()
            }
            disabled={
              cameraBusy ||
              wf.photos.length >=
                MAX_PHOTOS
            }
          >
            <Camera size={24} />

            {cameraBusy
              ? "Opening camera…"
              : wf.photos.length >=
                MAX_PHOTOS
              ? "Maximum photos captured"
              : "Capture Produce Photos"}
          </button>

          {cameraOpen ? (
            <div
              className="camera-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Live produce camera"
            >
              <div className="camera-panel">
                <div className="camera-header">
                  <div>
                    <strong>
                      Live Camera
                    </strong>

                    <span>
                      Point the camera at
                      the produce
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={stopCamera}
                    aria-label="Close camera"
                  >
                    <X size={25} />
                  </button>
                </div>

                <div className="camera-preview-wrapper">
                  <video
                    ref={videoRef}
                    className="camera-video"
                    playsInline
                    muted
                    autoPlay
                  />

                  <div className="camera-live-label">
                    <span />
                    LIVE
                  </div>
                </div>

                <div className="camera-photo-count">
                  Photos captured:{" "}
                  {wf.photos.length}/
                  {MAX_PHOTOS}
                </div>

                <div className="camera-actions">
                  <button
                    type="button"
                    className="camera-capture"
                    onClick={() =>
                      void capturePhoto()
                    }
                    disabled={capturing}
                  >
                    <Camera
                      size={28}
                    />

                    {capturing
                      ? "Capturing…"
                      : "Capture"}
                  </button>

                  <button
                    type="button"
                    className="camera-cancel"
                    onClick={stopCamera}
                  >
                    Close Camera
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="photos-detail-section">
            <div className="photos-section-label">
              Harvest Date
            </div>

            <div className="photos-detail-field">
              <CalendarDays
                size={31}
                strokeWidth={2.1}
                className="photos-green-icon"
              />

              <div className="photos-detail-values">
                <strong>
                  {harvestDate ||
                    (quantity !==
                      undefined &&
                    quantity !== null
                      ? `${quantity} kg`
                      : "Not set")}
                </strong>

                {harvestDate &&
                quantity !==
                  undefined &&
                quantity !== null ? (
                  <span>
                    {quantity} kg
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="photos-detail-section photos-location-section">
            <div className="photos-section-label">
              Location
            </div>

            <div className="photos-location-row">
              <div className="photos-detail-field photos-location-field">
                <MapPin
                  size={34}
                  strokeWidth={2.1}
                  className="photos-green-icon"
                />

                <strong>
                  {location}
                </strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="photos-next"
            disabled={
              wf.photos.length <
              REQUIRED
            }
            onClick={
              continueToQuality
            }
          >
            <span>
              Analyze Quality
            </span>

            <ChevronRight
              size={31}
              strokeWidth={2.5}
            />
          </button>
        </div>
      </section>

      <style jsx>{`
        .photos-page {
          min-height: 100vh;
          box-sizing: border-box;
          padding: 38px 28px 56px;
          background: #f1fbf8;
          color: #10243a;
        }

        .photos-container {
          width: min(1080px, 100%);
          margin: 0 auto;
        }

        .photos-step-title {
          display: flex;
          align-items: center;
          gap: 24px;
          min-height: 112px;
          padding: 0 38px;
          border-radius: 30px;
          background: #e5f5f3;
          box-sizing: border-box;
        }

        .photos-step-number {
          color: #087d59;
          font-size: 58px;
          line-height: 1;
          font-weight: 800;
        }

        .photos-step-divider,
        .photos-header-divider {
          width: 3px;
          height: 52px;
          border-radius: 99px;
          background: #78b5a4;
          flex: 0 0 auto;
        }

        .photos-step-title h1 {
          margin: 0;
          font-size: clamp(
            32px,
            4.2vw,
            54px
          );
          line-height: 1.05;
          font-weight: 800;
        }

        .photos-card {
          margin-top: 38px;
          padding: 42px 44px 46px;
          border-radius: 34px;
          background: #ffffff;
          box-shadow:
            0 22px 55px
            rgba(30, 86, 72, 0.11);
          box-sizing: border-box;
        }

        .photos-card-header {
          display: flex;
          align-items: center;
          gap: 22px;
          margin-bottom: 30px;
        }

        .photos-back {
          width: 52px;
          height: 52px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #129668;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .photos-header-divider {
          height: 48px;
          background: #d7e5e1;
        }

        .photos-card-header h2 {
          margin: 0;
          font-size: clamp(
            30px,
            4vw,
            50px
          );
          line-height: 1;
          font-weight: 800;
        }

        .photos-required {
          margin-left: auto;
          color: #087d59;
          font-size: 43px;
          font-weight: 800;
        }

        .photos-camera-help {
          margin: 0 0 24px;
          color: #5c726f;
          font-size: 16px;
          line-height: 1.5;
        }

        .photos-camera-error {
          margin: 0 0 20px;
          padding: 14px 16px;
          border-radius: 14px;
          background: #fff2f0;
          color: #a33a2b;
          font-weight: 700;
        }

        .photos-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .photos-tile {
          position: relative;
          width: 100%;
          aspect-ratio: 1.15 / 1;
          min-height: 210px;
          border-radius: 24px;
          overflow: hidden;
          box-sizing: border-box;
        }

        .photos-tile-filled {
          background: #edf5f2;
        }

        .photos-tile-filled img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photos-empty-tile {
          border: 2px dashed #b8cfca;
          background: #f2f9f8;
          color: #157d60;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        .photos-camera-circle {
          display: grid;
          place-items: center;
        }

        .photos-upload-text {
          font-size: 18px;
          font-weight: 700;
          color: #47645f;
        }

        .photos-empty-tile small {
          color: #6b7e79;
          font-size: 13px;
        }

        .photos-photo-actions {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          display: flex;
          justify-content: space-between;
        }

        .photos-action {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #fff;
          background:
            rgba(16, 35, 42, 0.75);
          cursor: pointer;
        }

        .photos-count {
          margin-top: 12px;
          color: #687b86;
          font-size: 15px;
          font-weight: 600;
        }

        .photos-capture-primary {
          margin-top: 22px;
          width: 100%;
          min-height: 58px;
          border: 0;
          border-radius: 16px;
          background: #087d59;
          color: white;
          font: inherit;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
        }

        .photos-capture-primary:hover:not(:disabled) {
          background: #066b4d;
        }

        .photos-capture-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .camera-modal {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 18px;
          background:
            rgba(5, 20, 17, 0.88);
        }

        .camera-panel {
          width: min(760px, 100%);
          max-height: 96vh;
          overflow-y: auto;
          background: #fff;
          border-radius: 24px;
          padding: 16px;
          box-sizing: border-box;
        }

        .camera-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .camera-header > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .camera-header strong {
          font-size: 22px;
        }

        .camera-header span {
          color: #6a7c78;
          font-size: 13px;
        }

        .camera-header button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 50%;
          background: #edf3f1;
          color: #24443d;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .camera-preview-wrapper {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          background: #111;
        }

        .camera-video {
          display: block;
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          background: #111;
        }

        .camera-live-label {
          position: absolute;
          top: 12px;
          left: 12px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          background:
            rgba(10, 20, 18, 0.72);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
        }

        .camera-live-label span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff554b;
        }

        .camera-photo-count {
          margin-top: 12px;
          text-align: center;
          color: #536964;
          font-size: 15px;
          font-weight: 700;
        }

        .camera-actions {
          display: flex;
          gap: 12px;
          margin-top: 14px;
        }

        .camera-capture,
        .camera-cancel {
          flex: 1;
          min-height: 54px;
          border-radius: 14px;
          border: 0;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .camera-capture {
          background: #087d59;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .camera-capture:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .camera-cancel {
          background: #edf3f1;
          color: #24443d;
        }

        .photos-detail-section {
          margin-top: 31px;
          padding: 28px 30px 30px;
          border: 2px solid #e3e9e7;
          border-radius: 25px;
          background: #fff;
        }

        .photos-section-label {
          margin-bottom: 14px;
          color: #657680;
          font-size: 21px;
          line-height: 1.2;
          font-weight: 750;
        }

        .photos-detail-field {
          min-height: 74px;
          display: flex;
          align-items: center;
          gap: 22px;
          padding: 0 27px;
          border: 2px solid #dce9e5;
          border-radius: 19px;
          box-sizing: border-box;
        }

        .photos-green-icon {
          color: #0b9569;
          flex: 0 0 auto;
        }

        .photos-detail-values {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .photos-detail-values strong,
        .photos-location-field strong {
          color: #13273a;
          font-size: 26px;
          line-height: 1.2;
          font-weight: 800;
        }

        .photos-detail-values span {
          margin-top: 4px;
          color: #74858e;
          font-size: 15px;
          font-weight: 650;
        }

        .photos-location-row {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr);
          gap: 16px;
        }

        .photos-location-field {
          min-height: 102px;
        }

        .photos-next {
          width: 100%;
          min-height: 82px;
          margin-top: 34px;
          border: 0;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: #119b6d;
          color: #fff;
          font: inherit;
          font-size: 30px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 10px 24px
            rgba(17, 155, 109, 0.2);
        }

        .photos-next:hover:not(:disabled) {
          background: #0d8d62;
        }

        .photos-next:disabled {
          cursor: not-allowed;
          background: #a9cfc2;
          box-shadow: none;
        }

        @media (max-width: 760px) {
          .photos-page {
            padding: 18px 14px 30px;
          }

          .photos-step-title {
            min-height: 76px;
            padding: 0 20px;
            gap: 13px;
            border-radius: 22px;
          }

          .photos-step-number {
            font-size: 38px;
          }

          .photos-step-divider {
            height: 35px;
            width: 2px;
          }

          .photos-step-title h1 {
            font-size: 27px;
          }

          .photos-card {
            margin-top: 20px;
            padding: 25px 18px 28px;
            border-radius: 25px;
          }

          .photos-card-header {
            gap: 12px;
            margin-bottom: 24px;
          }

          .photos-back {
            width: 42px;
            height: 42px;
          }

          .photos-header-divider {
            height: 38px;
            width: 2px;
          }

          .photos-card-header h2 {
            font-size: 30px;
          }

          .photos-required {
            font-size: 31px;
          }

          .photos-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .photos-tile {
            min-height: 0;
            border-radius: 15px;
          }

          .photos-upload-text {
            font-size: 13px;
          }

          .photos-camera-circle svg {
            width: 31px;
            height: 31px;
          }

          .photos-detail-section {
            margin-top: 20px;
            padding: 19px 15px 18px;
            border-radius: 18px;
          }

          .photos-section-label {
            font-size: 17px;
            margin-bottom: 9px;
          }

          .photos-detail-field {
            min-height: 64px;
            padding: 0 15px;
            gap: 13px;
            border-radius: 15px;
          }

          .photos-green-icon {
            width: 26px;
            height: 26px;
          }

          .photos-detail-values strong,
          .photos-location-field strong {
            font-size: 18px;
          }

          .photos-location-field {
            min-height: 68px;
          }

          .photos-next {
            min-height: 66px;
            margin-top: 23px;
            border-radius: 17px;
            font-size: 24px;
          }

          .camera-modal {
            padding: 8px;
          }

          .camera-panel {
            border-radius: 20px;
            padding: 12px;
          }

          .camera-video {
            aspect-ratio: 3 / 4;
          }

          .camera-actions {
            flex-direction: column;
          }
        }

        @media (max-width: 430px) {
          .photos-page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .photos-step-title {
            padding: 0 15px;
            gap: 10px;
          }

          .photos-step-number {
            font-size: 32px;
          }

          .photos-step-title h1 {
            font-size: 22px;
          }

          .photos-card-header h2 {
            font-size: 27px;
          }
        }
      `}</style>
    </main>
  );
}