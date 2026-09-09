"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import StepShell from "../../../components/StepShell";
import { useWorkflow } from "../../../lib/store";

const REQUIRED = 3;

export default function TakePhotos() {
  const router = useRouter();
  const { wf, setWf } = useWorkflow();
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = [...wf.photos, String(reader.result)].slice(0, REQUIRED);
      setWf({ photos: next });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function remove(i: number) {
    setWf({ photos: wf.photos.filter((_, idx) => idx !== i) });
  }

  const crop = wf.harvest?.crop || "produce";

  return (
    <StepShell
      eyebrow="QUALITY CAPTURE"
      title={`Take ${REQUIRED} photos of your ${crop.toLowerCase()}`}
      subtitle="Clear, well-lit photos from different angles give the AI quality model the best read on grade and freshness."
      step={3}
      totalSteps={19}
      backHref="/farmer/harvest"
    >
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
      <div className="photo-grid">
        {Array.from({ length: REQUIRED }).map((_, i) => {
          const src = wf.photos[i];
          return (
            <div key={i} className={"photo-tile" + (src ? " filled" : "")} onClick={() => !src && inputRef.current?.click()}>
              {src ? (
                <>
                  <img src={src} alt={`photo ${i + 1}`} />
                  <button className="remove" onClick={(e) => { e.stopPropagation(); remove(i); }}>
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <Camera size={22} />
                  <span>Photo {i + 1}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="photo-hint">{wf.photos.length} of {REQUIRED} photos captured</div>
      <div className="step-actions">
        <button className="primary" disabled={wf.photos.length < REQUIRED} onClick={() => router.push("/farmer/quality")}>
          Continue
        </button>
      </div>
    </StepShell>
  );
}
