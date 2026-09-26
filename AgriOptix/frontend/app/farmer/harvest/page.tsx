"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImagePlus,
  MapPin,
  Pencil,
  X,
} from "lucide-react";
import { useWorkflow, api } from "../../../lib/store";

const CROPS = ["Tomato", "Onion", "Chilli", "Brinjal", "Potato", "Other"];
const UNITS = ["kg", "quintal", "tonne"] as const;

const STEPS = [
  "What did you harvest?",
  "Quality",
  "Packaging / Pickup",
  "Review & Publish",
];

type FormState = {
  crop: string;
  variety: string;
  quantity: string;
  quantity_unit: (typeof UNITS)[number];
  harvest_date: string;
  harvest_time: string;
  pickup_readiness: string;
  pickup_readiness_date: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  overall_quality: string;
  ripeness: string;
  visible_damage: string;
  size: string;
  freshness: string;
  estimated_shelf_life: string;
  photos: string[];
  packaging_type: string;
  package_weight: string;
  storage_condition: string;
  special_handling: string;
  special_handling_notes: string;
  pickup_date: string;
  pickup_time: string;
  custom_pickup_start: string;
  custom_pickup_end: string;
  loading_assistance: string;
};

const INITIAL: FormState = {
  crop: "",
  variety: "",
  quantity: "",
  quantity_unit: "kg",
  harvest_date: "",
  harvest_time: "",
  pickup_readiness: "",
  pickup_readiness_date: "",
  location: "",
  latitude: null,
  longitude: null,
  overall_quality: "",
  ripeness: "",
  visible_damage: "",
  size: "",
  freshness: "",
  estimated_shelf_life: "",
  photos: [],
  packaging_type: "",
  package_weight: "",
  storage_condition: "",
  special_handling: "No",
  special_handling_notes: "",
  pickup_date: "",
  pickup_time: "",
  custom_pickup_start: "",
  custom_pickup_end: "",
  loading_assistance: "",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>

      <div className="choices">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            className={`choice ${value === option ? "selected" : ""}`}
            onClick={() => onChange(option)}
          >
            {value === option ? <Check size={17} /> : null}
            {option}
          </button>
        ))}
      </div>

      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}

export default function AddHarvest() {
  const router = useRouter();
  const { setWf } = useWorkflow();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  const update = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  function validate(targetStep: number) {
    const next: Record<string, string> = {};

    if (targetStep === 0) {
      if (!form.crop) {
        next.crop = "Select a crop.";
      }

      if (!form.quantity || Number(form.quantity) <= 0) {
        next.quantity = "Enter a quantity greater than 0.";
      }

      if (!form.harvest_date) {
        next.harvest_date = "Select the harvest date.";
      }

      if (form.harvest_date && form.harvest_date > today()) {
        next.harvest_date = "Harvest date cannot be in the future.";
      }

      if (!form.harvest_time) {
        next.harvest_time = "Select the harvest time.";
      }

      if (!form.pickup_readiness) {
        next.pickup_readiness = "Select when the produce is ready.";
      }

      if (
        form.pickup_readiness === "Select date" &&
        !form.pickup_readiness_date
      ) {
        next.pickup_readiness_date = "Select a readiness date.";
      }

      if (
        form.pickup_readiness === "Select date" &&
        form.pickup_readiness_date < today()
      ) {
        next.pickup_readiness_date =
          "Readiness date cannot be in the past.";
      }
    }

    if (targetStep === 1) {
      if (!form.overall_quality) {
        next.overall_quality = "Select the overall quality.";
      }

      if (!form.ripeness) {
        next.ripeness = "Select the ripeness.";
      }

      if (!form.visible_damage) {
        next.visible_damage = "Select visible damage.";
      }

      if (!form.size) {
        next.size = "Select the size.";
      }

      if (!form.freshness) {
        next.freshness = "Select freshness/condition.";
      }

      if (!form.estimated_shelf_life) {
        next.estimated_shelf_life =
          "Select an estimated shelf life.";
      }
    }

    if (targetStep === 2) {
      if (!form.packaging_type) {
        next.packaging_type = "Select a packaging type.";
      }

      if (
        form.package_weight &&
        Number(form.package_weight) <= 0
      ) {
        next.package_weight =
          "Package weight must be greater than 0.";
      }

      if (!form.storage_condition) {
        next.storage_condition =
          "Select a storage condition.";
      }

      if (
        form.special_handling === "Yes" &&
        !form.special_handling_notes.trim()
      ) {
        next.special_handling_notes =
          "Briefly describe the special handling needed.";
      }

      if (!form.pickup_date) {
        next.pickup_date = "Select a pickup date.";
      }

      if (
        form.pickup_date &&
        form.pickup_date < today()
      ) {
        next.pickup_date =
          "Pickup date cannot be in the past.";
      }

      if (!form.pickup_time) {
        next.pickup_time =
          "Select a preferred pickup time.";
      }

      if (!form.loading_assistance) {
        next.loading_assistance =
          "Select loading assistance.";
      }
    }

    if (targetStep === 3) {
      if (!form.location.trim()) {
        next.location =
          "Location is required before publishing.";
      }

      if (!form.crop) {
        next.crop = "Crop is required.";
      }

      if (!form.quantity || Number(form.quantity) <= 0) {
        next.quantity = "Enter a valid quantity.";
      }
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validate(step)) return;

    setStep((current) => Math.min(3, current + 1));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function goBack() {
    setErrors({});

    setStep((current) => Math.max(0, current - 1));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editStep(target: number) {
    setErrors({});
    setStep(target);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setErrors({
        location:
          "Location access is not available in this browser. Enter the address manually.",
      });

      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        update("latitude", coords.latitude);
        update("longitude", coords.longitude);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`
          );

          const data = await response.json();

          update(
            "location",
            data.display_name ||
              `${coords.latitude.toFixed(
                6
              )}, ${coords.longitude.toFixed(6)}`
          );
        } catch {
          update(
            "location",
            `${coords.latitude.toFixed(
              6
            )}, ${coords.longitude.toFixed(6)}`
          );
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);

        setErrors({
          location:
            "Location permission was not granted. Enter your farm/pickup address manually.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(
      0,
      4 - form.photos.length
    );

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          setForm((previous) => ({
            ...previous,
            photos:
              previous.photos.length < 4
                ? [...previous.photos, reader.result]
                : previous.photos,
          }));
        }
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function removePhoto(index: number) {
    update(
      "photos",
      form.photos.filter(
        (_, photoIndex) => photoIndex !== index
      )
    );
  }

  const quantityLabel = useMemo(
    () => `${form.quantity || "—"} ${form.quantity_unit}`,
    [form.quantity, form.quantity_unit]
  );

  async function publish() {
    if (!validate(3)) return;

    setSaving(true);

    try {
      const payload = {
        crop: form.crop,
        variety: form.variety || null,
        quantity: Number(form.quantity),
        quantity_unit: form.quantity_unit,
        harvest_date: form.harvest_date,
        harvest_time: form.harvest_time,
        pickup_readiness: form.pickup_readiness,
        pickup_readiness_date:
          form.pickup_readiness_date || null,
        location: form.location.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        overall_quality: form.overall_quality,
        ripeness: form.ripeness,
        visible_damage: form.visible_damage,
        size: form.size,
        freshness: form.freshness,
        estimated_shelf_life: form.estimated_shelf_life,
        photos: form.photos,
        packaging_type: form.packaging_type,
        package_weight: form.package_weight
          ? Number(form.package_weight)
          : null,
        storage_condition: form.storage_condition,
        special_handling: form.special_handling,
        special_handling_notes:
          form.special_handling_notes || null,
        pickup_date: form.pickup_date,
        pickup_time:
          form.pickup_time === "Custom time range"
            ? `${form.custom_pickup_start}-${form.custom_pickup_end}`
            : form.pickup_time,
        loading_assistance: form.loading_assistance,
        status: "PUBLISHED",
      };

      const harvest = await api("/api/harvests", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setWf({
        harvest,
        photos: form.photos,
        quality: form,
      });

      setSuccess({
        id: String(harvest.id),
      });
    } catch (error) {
      setErrors({
        publish:
          error instanceof Error
            ? error.message
            : "Unable to publish this harvest. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    setSaving(true);

    try {
      const harvest = await api("/api/harvests", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          quantity: form.quantity
            ? Number(form.quantity)
            : 0,
          package_weight: form.package_weight
            ? Number(form.package_weight)
            : null,
          status: "DRAFT",
        }),
      });

      setWf({
        harvest,
        photos: form.photos,
        quality: form,
      });

      setSuccess({
        id: String(harvest.id),
      });
    } catch (error) {
      setErrors({
        publish:
          error instanceof Error
            ? error.message
            : "Unable to save the draft.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <main className="harvest-page">
        <div className="harvest-wrap">
          <section className="harvest-card success-card">
            <div className="success-icon">
              <Check size={46} />
            </div>

            <span className="eyebrow">
              HARVEST SAVED
            </span>

            <h1>
              {form.crop || "Harvest"}{" "}
              {form.quantity
                ? "is published"
                : "has been saved"}
            </h1>

            <p>
              Harvest ID <strong>{success.id}</strong>.
              Your record is now available to the
              existing Farmer harvest workflow and can
              be read by matching services.
            </p>

            <div className="success-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  router.push("/farmer/dashboard")
                }
              >
                Go to Dashboard
              </button>

              <button
                className="next-button"
                onClick={() =>
                  router.push("/farmer/photos")
                }
              >
                Continue
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="harvest-page">
      <div className="harvest-wrap">
        <header className="harvest-heading">
          <button
            className="back-button"
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft size={30} />
          </button>

          <div>
            <div className="eyebrow">
              FARMER • ADD HARVEST
            </div>

            <h1 className="heading-title">
              Add Harvest
            </h1>
          </div>
        </header>

        <section className="harvest-card">
          <div className="card-title-row">
            <div>
              <h2 className="card-title">
                {STEPS[step]}
              </h2>

              <p className="step-caption">
                Step {step + 1} of 4
              </p>
            </div>
          </div>

          <div
            className="progress"
            aria-label="Harvest steps"
          >
            {STEPS.map((label, index) => (
              <div
                className="progress-item"
                key={label}
              >
                <button
                  type="button"
                  className={`progress-step ${
                    index <= step ? "active" : ""
                  }`}
                  onClick={() =>
                    index <= step &&
                    editStep(index)
                  }
                  aria-current={
                    index === step
                      ? "step"
                      : undefined
                  }
                  aria-label={`Step ${
                    index + 1
                  }: ${label}`}
                >
                  {index < step ? (
                    <Check size={24} />
                  ) : (
                    index + 1
                  )}
                </button>

                {index < STEPS.length - 1 ? (
                  <div
                    className={`progress-line ${
                      index < step
                        ? "active"
                        : ""
                    }`}
                  />
                ) : null}

                <span className="progress-label">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {step === 0 ? (
            <div className="form-grid">
              <div className="field span-2">
                <label
                  className="field-label"
                  htmlFor="crop"
                >
                  Crop
                </label>

                <select
                  id="crop"
                  className="detail-input"
                  value={form.crop}
                  onChange={(e) =>
                    update(
                      "crop",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select crop
                  </option>

                  {CROPS.map((crop) => (
                    <option key={crop}>
                      {crop}
                    </option>
                  ))}
                </select>

                {errors.crop ? (
                  <div className="error">
                    {errors.crop}
                  </div>
                ) : null}
              </div>

              <div className="field span-2">
                <label
                  className="field-label"
                  htmlFor="variety"
                >
                  Variety / Type{" "}
                  <span className="optional">
                    Optional
                  </span>
                </label>

                <input
                  id="variety"
                  className="detail-input"
                  value={form.variety}
                  onChange={(e) =>
                    update(
                      "variety",
                      e.target.value
                    )
                  }
                  placeholder="e.g. Hybrid Tomato"
                />
              </div>

              <div className="field span-2">
                <label
                  className="field-label"
                  htmlFor="quantity"
                >
                  Quantity Available
                </label>

                <div className="input-with-select">
                  <input
                    id="quantity"
                    className="detail-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) =>
                      update(
                        "quantity",
                        e.target.value
                      )
                    }
                    placeholder="Enter quantity"
                  />

                  <select
                    className="unit-select"
                    value={form.quantity_unit}
                    onChange={(e) =>
                      update(
                        "quantity_unit",
                        e.target.value as FormState["quantity_unit"]
                      )
                    }
                  >
                    {UNITS.map((unit) => (
                      <option key={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                {errors.quantity ? (
                  <div className="error">
                    {errors.quantity}
                  </div>
                ) : null}
              </div>

              <div className="field">
                <label
                  className="field-label"
                  htmlFor="harvest-date"
                >
                  Harvest Date
                </label>

                <div className="icon-input">
                  <CalendarDays size={19} />

                  <input
                    id="harvest-date"
                    type="date"
                    value={form.harvest_date}
                    onChange={(e) =>
                      update(
                        "harvest_date",
                        e.target.value
                      )
                    }
                  />
                </div>

                {errors.harvest_date ? (
                  <div className="error">
                    {errors.harvest_date}
                  </div>
                ) : null}
              </div>

              <div className="field">
                <label
                  className="field-label"
                  htmlFor="harvest-time"
                >
                  Harvest Time
                </label>

                <div className="icon-input">
                  <Clock3 size={19} />

                  <input
                    id="harvest-time"
                    type="time"
                    value={form.harvest_time}
                    onChange={(e) =>
                      update(
                        "harvest_time",
                        e.target.value
                      )
                    }
                  />
                </div>

                {errors.harvest_time ? (
                  <div className="error">
                    {errors.harvest_time}
                  </div>
                ) : null}
              </div>

              <div className="field span-2">
                <ChoiceGroup
                  label="Pickup Readiness"
                  value={form.pickup_readiness}
                  options={[
                    "Ready now",
                    "Ready today",
                    "Ready tomorrow",
                    "Select date",
                  ]}
                  onChange={(v) =>
                    update(
                      "pickup_readiness",
                      v
                    )
                  }
                  error={
                    errors.pickup_readiness
                  }
                />

                {form.pickup_readiness ===
                "Select date" ? (
                  <input
                    className="detail-input compact"
                    type="date"
                    min={today()}
                    value={
                      form.pickup_readiness_date
                    }
                    onChange={(e) =>
                      update(
                        "pickup_readiness_date",
                        e.target.value
                      )
                    }
                  />
                ) : null}

                {errors.pickup_readiness_date ? (
                  <div className="error">
                    {
                      errors.pickup_readiness_date
                    }
                  </div>
                ) : null}
              </div>

              <div className="field span-2">
                <label className="field-label">
                  Farm / Pickup Location
                </label>

                <div className="location-actions">
                  <button
                    type="button"
                    className="location-button"
                    onClick={
                      useCurrentLocation
                    }
                    disabled={locating}
                  >
                    <MapPin size={19} />

                    {locating
                      ? "Finding location..."
                      : "Use current location"}
                  </button>

                  {form.latitude !== null &&
                  form.longitude !== null ? (
                    <span className="coords">
                      GPS saved
                    </span>
                  ) : null}
                </div>

                <textarea
                  className="detail-input location-input"
                  value={form.location}
                  onChange={(e) =>
                    update(
                      "location",
                      e.target.value
                    )
                  }
                  placeholder="Enter farm or pickup address"
                  rows={3}
                />

                {errors.location ? (
                  <div className="error">
                    {errors.location}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="form-grid">
              <div className="span-2 quality-note">
                Quality information is
                farmer-reported and may be
                verified later.
              </div>

              <ChoiceGroup
                label="Overall Quality"
                value={form.overall_quality}
                options={[
                  "Excellent",
                  "Good",
                  "Average",
                  "Poor",
                ]}
                onChange={(v) =>
                  update(
                    "overall_quality",
                    v
                  )
                }
                error={
                  errors.overall_quality
                }
              />

              <ChoiceGroup
                label="Ripeness / Maturity"
                value={form.ripeness}
                options={[
                  "Unripe",
                  "Partially ripe",
                  "Ready",
                  "Overripe",
                ]}
                onChange={(v) =>
                  update("ripeness", v)
                }
                error={errors.ripeness}
              />

              <ChoiceGroup
                label="Visible Damage"
                value={form.visible_damage}
                options={[
                  "None",
                  "Minor",
                  "Moderate",
                  "Significant",
                ]}
                onChange={(v) =>
                  update(
                    "visible_damage",
                    v
                  )
                }
                error={
                  errors.visible_damage
                }
              />

              <ChoiceGroup
                label="Size"
                value={form.size}
                options={[
                  "Small",
                  "Medium",
                  "Large",
                  "Mixed",
                ]}
                onChange={(v) =>
                  update("size", v)
                }
                error={errors.size}
              />

              <ChoiceGroup
                label="Freshness / Condition"
                value={form.freshness}
                options={[
                  "Very Fresh",
                  "Fresh",
                  "Normal",
                  "Needs Quick Sale",
                ]}
                onChange={(v) =>
                  update(
                    "freshness",
                    v
                  )
                }
                error={errors.freshness}
              />

              <ChoiceGroup
                label="Estimated Shelf Life"
                value={
                  form.estimated_shelf_life
                }
                options={[
                  "Less than 1 day",
                  "1–2 days",
                  "3–5 days",
                  "5+ days",
                ]}
                onChange={(v) =>
                  update(
                    "estimated_shelf_life",
                    v
                  )
                }
                error={
                  errors.estimated_shelf_life
                }
              />

              <div className="field span-2">
                <div className="field-label">
                  Produce Photos{" "}
                  <span className="optional">
                    2–4 photos
                  </span>
                </div>

                <div className="photo-grid">
                  {form.photos.map(
                    (photo, index) => (
                      <div
                        className="photo-tile"
                        key={`${photo.slice(
                          0,
                          18
                        )}-${index}`}
                      >
                        <img
                          src={photo}
                          alt={`Produce ${
                            index + 1
                          }`}
                        />

                        <button
                          type="button"
                          className="remove-photo"
                          onClick={() =>
                            removePhoto(
                              index
                            )
                          }
                          aria-label={`Remove photo ${
                            index + 1
                          }`}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )
                  )}

                  {form.photos.length < 4 ? (
                    <button
                      type="button"
                      className="photo-upload"
                      onClick={() =>
                        fileInput.current?.click()
                      }
                    >
                      <ImagePlus size={31} />

                      <strong>
                        {form.photos.length
                          ? "Add another"
                          : "Upload photos"}
                      </strong>

                      <span>
                        JPG or PNG
                      </span>
                    </button>
                  ) : null}
                </div>

                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotos}
                />

                <p className="photo-help">
                  At least 1 photo is
                  recommended, but it is
                  optional.
                </p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="form-grid">
              <ChoiceGroup
                label="Packaging Type"
                value={form.packaging_type}
                options={[
                  "Loose",
                  "Crates",
                  "Bags",
                  "Boxes",
                  "Other",
                ]}
                onChange={(v) =>
                  update(
                    "packaging_type",
                    v
                  )
                }
                error={
                  errors.packaging_type
                }
              />

              <div className="field">
                <label
                  className="field-label"
                  htmlFor="package-weight"
                >
                  Approximate Weight per
                  Package
                </label>

                <div className="suffix-input">
                  <input
                    id="package-weight"
                    className="detail-input"
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      form.package_weight
                    }
                    onChange={(e) =>
                      update(
                        "package_weight",
                        e.target.value
                      )
                    }
                    placeholder="25"
                  />

                  <span>kg</span>
                </div>

                {errors.package_weight ? (
                  <div className="error">
                    {errors.package_weight}
                  </div>
                ) : null}
              </div>

              <ChoiceGroup
                label="Storage Condition"
                value={
                  form.storage_condition
                }
                options={[
                  "Open / Ambient",
                  "Shade",
                  "Cold Storage",
                  "Other",
                ]}
                onChange={(v) =>
                  update(
                    "storage_condition",
                    v
                  )
                }
                error={
                  errors.storage_condition
                }
              />

              <ChoiceGroup
                label="Special Handling Required?"
                value={
                  form.special_handling
                }
                options={["No", "Yes"]}
                onChange={(v) =>
                  update(
                    "special_handling",
                    v
                  )
                }
              />

              {form.special_handling ===
              "Yes" ? (
                <div className="field span-2">
                  <label
                    className="field-label"
                    htmlFor="handling-notes"
                  >
                    Special Handling Notes
                  </label>

                  <textarea
                    id="handling-notes"
                    className="detail-input location-input"
                    rows={3}
                    value={
                      form.special_handling_notes
                    }
                    onChange={(e) =>
                      update(
                        "special_handling_notes",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Keep upright and avoid direct sun"
                  />

                  {errors.special_handling_notes ? (
                    <div className="error">
                      {
                        errors.special_handling_notes
                      }
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="field">
                <label
                  className="field-label"
                  htmlFor="pickup-date"
                >
                  Pickup Date
                </label>

                <div className="icon-input">
                  <CalendarDays size={19} />

                  <input
                    id="pickup-date"
                    type="date"
                    min={today()}
                    value={form.pickup_date}
                    onChange={(e) =>
                      update(
                        "pickup_date",
                        e.target.value
                      )
                    }
                  />
                </div>

                {errors.pickup_date ? (
                  <div className="error">
                    {errors.pickup_date}
                  </div>
                ) : null}
              </div>

              <ChoiceGroup
                label="Preferred Pickup Time"
                value={form.pickup_time}
                options={[
                  "Morning",
                  "Afternoon",
                  "Evening",
                  "Custom time range",
                ]}
                onChange={(v) =>
                  update(
                    "pickup_time",
                    v
                  )
                }
                error={errors.pickup_time}
              />

              {form.pickup_time ===
              "Custom time range" ? (
                <div className="field span-2 custom-range">
                  <label className="field-label">
                    Custom time range
                  </label>

                  <div className="two-inputs">
                    <input
                      className="detail-input"
                      type="time"
                      value={
                        form.custom_pickup_start
                      }
                      onChange={(e) =>
                        update(
                          "custom_pickup_start",
                          e.target.value
                        )
                      }
                    />

                    <span>to</span>

                    <input
                      className="detail-input"
                      type="time"
                      value={
                        form.custom_pickup_end
                      }
                      onChange={(e) =>
                        update(
                          "custom_pickup_end",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              ) : null}

              <ChoiceGroup
                label="Loading Assistance"
                value={
                  form.loading_assistance
                }
                options={[
                  "Available",
                  "Not Available",
                ]}
                onChange={(v) =>
                  update(
                    "loading_assistance",
                    v
                  )
                }
                error={
                  errors.loading_assistance
                }
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="review">
              <ReviewSection
                title="HARVEST"
                onEdit={() => editStep(0)}
              >
                <ReviewRow
                  label="Crop"
                  value={form.crop}
                />

                <ReviewRow
                  label="Variety"
                  value={
                    form.variety || "—"
                  }
                />

                <ReviewRow
                  label="Quantity"
                  value={quantityLabel}
                />

                <ReviewRow
                  label="Harvest date/time"
                  value={`${form.harvest_date || "—"} ${
                    form.harvest_time || ""
                  }`}
                />

                <ReviewRow
                  label="Pickup readiness"
                  value={
                    form.pickup_readiness ===
                    "Select date"
                      ? form.pickup_readiness_date
                      : form.pickup_readiness
                  }
                />

                <ReviewRow
                  label="Location"
                  value={
                    form.location || "—"
                  }
                />
              </ReviewSection>

              <ReviewSection
                title="QUALITY"
                onEdit={() => editStep(1)}
              >
                <ReviewRow
                  label="Overall quality"
                  value={
                    form.overall_quality
                  }
                />

                <ReviewRow
                  label="Ripeness"
                  value={form.ripeness}
                />

                <ReviewRow
                  label="Visible damage"
                  value={
                    form.visible_damage
                  }
                />

                <ReviewRow
                  label="Size"
                  value={form.size}
                />

                <ReviewRow
                  label="Freshness"
                  value={form.freshness}
                />

                <ReviewRow
                  label="Estimated shelf life"
                  value={
                    form.estimated_shelf_life
                  }
                />

                <ReviewRow
                  label="Uploaded photos"
                  value={`${
                    form.photos.length
                  } photo${
                    form.photos.length === 1
                      ? ""
                      : "s"
                  }`}
                />
              </ReviewSection>

              <ReviewSection
                title="PACKAGING & PICKUP"
                onEdit={() => editStep(2)}
              >
                <ReviewRow
                  label="Packaging"
                  value={
                    form.packaging_type
                  }
                />

                <ReviewRow
                  label="Package weight"
                  value={
                    form.package_weight
                      ? `${form.package_weight} kg`
                      : "—"
                  }
                />

                <ReviewRow
                  label="Storage condition"
                  value={
                    form.storage_condition
                  }
                />

                <ReviewRow
                  label="Special handling"
                  value={
                    form.special_handling ===
                    "Yes"
                      ? `Yes — ${form.special_handling_notes}`
                      : "No"
                  }
                />

                <ReviewRow
                  label="Pickup date/time"
                  value={`${form.pickup_date || "—"} • ${
                    form.pickup_time || "—"
                  }`}
                />

                <ReviewRow
                  label="Loading assistance"
                  value={
                    form.loading_assistance
                  }
                />
              </ReviewSection>

              {errors.publish ? (
                <div className="error publish-error">
                  {errors.publish}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="step-actions">
            {step > 0 ? (
              <button
                type="button"
                className="secondary-button"
                onClick={goBack}
              >
                <ChevronLeft size={21} />
                Back
              </button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <button
                type="button"
                className="next-button"
                onClick={goNext}
              >
                Next
                <ChevronRight size={22} />
              </button>
            ) : (
              <div className="publish-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={saveDraft}
                  disabled={saving}
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  className="next-button"
                  onClick={publish}
                  disabled={saving}
                >
                  {saving
                    ? "Publishing..."
                    : "Publish Harvest"}

                  <Check size={21} />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .harvest-page {
          min-height: 100vh;
          box-sizing: border-box;
          background: #edf8f5;
          color: #102b24;
          padding: 44px 22px 56px;
          font-family: inherit;
        }

        .harvest-wrap {
          width: min(980px, 100%);
          margin: 0 auto;
        }

        .harvest-heading {
          display: flex;
          align-items: center;
          gap: 24px;
          margin: 0 0 28px;
        }

        .back-button {
          width: 54px;
          height: 54px;
          border: 0;
          background: transparent;
          color: #13775c;
          display: grid;
          place-items: center;
          border-radius: 50%;
          cursor: pointer;
        }

        .back-button:hover {
          background: rgba(19, 119, 92, 0.08);
        }

        .eyebrow {
          color: #65a895;
          font-size: 13px;
          letter-spacing: 1.8px;
          line-height: 1.2;
          font-weight: 800;
        }

        .heading-title {
          margin: 5px 0 0;
          font-size: clamp(42px, 5vw, 64px);
          line-height: 1;
          letter-spacing: -2.4px;
          font-weight: 800;
          color: #0b493b;
        }

        .harvest-card {
          background: #fff;
          border: 1px solid #dcebe6;
          border-radius: 34px;
          padding: 42px 42px 34px;
          box-shadow:
            0 18px 50px rgba(21, 78, 61, 0.08),
            0 2px 7px rgba(21, 78, 61, 0.04);
        }

        .card-title-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 25px;
        }

        .card-title {
          margin: 0;
          font-size: clamp(31px, 4vw, 48px);
          line-height: 1.05;
          letter-spacing: -1.7px;
          color: #083f33;
          font-weight: 800;
        }

        .step-caption {
          margin: 7px 0 0;
          color: #6c7d7a;
          font-size: 14px;
          font-weight: 700;
        }

        .progress {
          display: flex;
          align-items: flex-start;
          width: 100%;
          margin: 0 0 36px;
          overflow-x: auto;
          padding-bottom: 7px;
        }

        .progress-item {
          display: grid;
          grid-template-columns: 62px auto;
          grid-template-rows: 62px auto;
          align-items: center;
          flex: 1;
          min-width: 145px;
        }

        .progress-step {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #f6f7f8;
          border: 2px solid #d9dde0;
          color: #6b737a;
          font-size: 22px;
          font-weight: 700;
          box-sizing: border-box;
          cursor: pointer;
        }

        .progress-step.active {
          background: #21845f;
          border-color: #21845f;
          color: #fff;
          box-shadow: 0 7px 16px rgba(33, 132, 95, 0.18);
        }

        .progress-line {
          height: 2px;
          background: #d9dde0;
          align-self: center;
          margin: 0 10px;
        }

        .progress-line.active {
          background: #21845f;
        }

        .progress-label {
          grid-column: 1 / 3;
          color: #66736f;
          font-size: 12px;
          font-weight: 750;
          margin-top: 8px;
          padding-right: 10px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px 18px;
        }

        .span-2 {
          grid-column: 1 / -1;
        }

        .field {
          min-width: 0;
        }

        .field-label {
          display: block;
          margin: 0 0 10px;
          color: #465163;
          font-size: 16px;
          line-height: 1.2;
          font-weight: 800;
        }

        .optional {
          color: #8a9693;
          font-size: 12px;
          font-weight: 700;
        }

        .detail-input {
          width: 100%;
          box-sizing: border-box;
          min-height: 54px;
          border: 2px solid #dce3e6;
          border-radius: 15px;
          padding: 0 15px;
          background: #fbfcfc;
          color: #15392f;
          font: inherit;
          outline: none;
        }

        textarea.detail-input {
          padding-top: 13px;
          resize: vertical;
        }

        .detail-input:focus {
          border-color: #9bcdbb;
          background: #fff;
        }

        select.detail-input {
          cursor: pointer;
        }

        .input-with-select {
          display: grid;
          grid-template-columns: 1fr 150px;
        }

        .input-with-select .detail-input {
          border-radius: 15px 0 0 15px;
        }

        .unit-select {
          min-height: 54px;
          border: 2px solid #dce3e6;
          border-left: 0;
          border-radius: 0 15px 15px 0;
          background: #f5faf8;
          color: #0c4639;
          padding: 0 12px;
          font: inherit;
          font-weight: 800;
        }

        .icon-input {
          min-height: 54px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 2px solid #dce3e6;
          border-radius: 15px;
          padding: 0 13px;
          background: #fbfcfc;
          color: #0c8b64;
        }

        .icon-input input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          font: inherit;
          color: #15392f;
        }

        .choices {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .choice {
          min-height: 45px;
          border: 1.5px solid #dce6e3;
          border-radius: 13px;
          background: #fff;
          color: #38544e;
          padding: 9px 13px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .choice.selected {
          border-color: #2b956f;
          background: #e9f7f2;
          color: #0b6e50;
        }

        .quality-note {
          border-radius: 14px;
          padding: 13px 15px;
          background: #eff9f6;
          color: #50726a;
          font-size: 13px;
          font-weight: 700;
        }

        .location-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .location-button {
          min-height: 45px;
          border: 1.5px solid #bcd9cf;
          border-radius: 13px;
          background: #f4fbf8;
          color: #14785b;
          padding: 9px 14px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .location-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .coords {
          font-size: 12px;
          color: #668079;
          font-weight: 700;
        }

        .compact {
          margin-top: 10px;
          max-width: 260px;
        }

        .location-input {
          min-height: 90px;
        }

        .error {
          margin-top: 7px;
          color: #b83c3c;
          font-size: 13px;
          font-weight: 700;
        }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 13px;
        }

        .photo-tile,
        .photo-upload {
          aspect-ratio: 1;
          border-radius: 17px;
          overflow: hidden;
          position: relative;
        }

        .photo-tile {
          background: #edf6f3;
        }

        .photo-tile img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .photo-upload {
          border: 2px dashed #b8cfca;
          background: #f2f9f8;
          color: #157d60;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font: inherit;
        }

        .photo-upload span {
          font-size: 11px;
          color: #6c807b;
        }

        .remove-photo {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #fff;
          background: rgba(16, 35, 42, 0.68);
          cursor: pointer;
        }

        .photo-help {
          margin: 9px 0 0;
          color: #71817e;
          font-size: 12px;
        }

        .suffix-input {
          position: relative;
        }

        .suffix-input .detail-input {
          padding-right: 48px;
        }

        .suffix-input span {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #61736e;
          font-size: 13px;
          font-weight: 800;
        }

        .two-inputs {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .two-inputs .detail-input {
          flex: 1;
        }

        .custom-range {
          grid-column: 1 / -1;
        }

        .review {
          display: grid;
          gap: 16px;
        }

        .review-section {
          border: 1.5px solid #dfeae7;
          border-radius: 18px;
          overflow: hidden;
        }

        .review-header {
          padding: 15px 17px;
          background: #f3faf8;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .review-header strong {
          color: #0b5947;
          font-size: 14px;
          letter-spacing: 1.1px;
        }

        .edit-button {
          border: 0;
          background: transparent;
          color: #138560;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .review-body {
          padding: 5px 17px 10px;
        }

        .review-row {
          display: grid;
          grid-template-columns: 180px 1fr;
          gap: 15px;
          padding: 10px 0;
          border-bottom: 1px solid #edf1f0;
        }

        .review-row:last-child {
          border-bottom: 0;
        }

        .review-row span:first-child {
          color: #6c7a77;
          font-size: 13px;
          font-weight: 700;
        }

        .review-row span:last-child {
          color: #173c33;
          font-size: 14px;
          font-weight: 750;
          overflow-wrap: anywhere;
        }

        .publish-error {
          padding: 12px 14px;
          background: #fff2f2;
          border-radius: 12px;
        }

        .step-actions {
          margin-top: 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .publish-actions {
          display: flex;
          gap: 10px;
          margin-left: auto;
        }

        .next-button,
        .secondary-button {
          min-height: 54px;
          border-radius: 15px;
          padding: 0 20px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .next-button {
          border: 0;
          background: #21845f;
          color: #fff;
          box-shadow: 0 10px 22px rgba(33, 132, 95, 0.18);
        }

        .next-button:hover:not(:disabled) {
          background: #197552;
        }

        .next-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .secondary-button {
          border: 1.5px solid #cbdcd7;
          background: #fff;
          color: #2c6255;
        }

        .secondary-button:hover {
          background: #f5faf8;
        }

        .success-card {
          text-align: center;
          padding: 70px 40px;
        }

        .success-icon {
          width: 84px;
          height: 84px;
          margin: 0 auto 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #21845f;
          color: #fff;
        }

        .success-card h1 {
          color: #0b493b;
          font-size: clamp(34px, 5vw, 50px);
          margin: 12px 0;
        }

        .success-card p {
          max-width: 650px;
          margin: 0 auto;
          color: #5f726c;
          line-height: 1.6;
        }

        .success-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 30px;
        }

        @media (max-width: 760px) {
          .harvest-page {
            padding: 24px 14px 36px;
          }

          .harvest-heading {
            gap: 10px;
            margin-bottom: 18px;
          }

          .back-button {
            width: 46px;
            height: 46px;
          }

          .heading-title {
            font-size: 39px;
            letter-spacing: -1.6px;
          }

          .harvest-card {
            padding: 28px 20px 24px;
            border-radius: 25px;
          }

          .card-title {
            font-size: 31px;
          }

          .progress {
            margin-bottom: 28px;
          }

          .progress-item {
            min-width: 118px;
            grid-template-columns: 48px auto;
            grid-template-rows: 48px auto;
          }

          .progress-step {
            width: 48px;
            height: 48px;
            font-size: 19px;
          }

          .progress-label {
            font-size: 10px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 17px;
          }

          .span-2,
          .custom-range {
            grid-column: auto;
          }

          .photo-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .input-with-select {
            grid-template-columns: 1fr 105px;
          }

          .review-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .step-actions {
            align-items: stretch;
          }

          .publish-actions {
            width: 100%;
            flex-direction: column;
          }

          .step-actions > .next-button {
            width: 100%;
          }

          .secondary-button {
            min-height: 50px;
          }

          .success-card {
            padding: 50px 22px;
          }

          .success-actions {
            flex-direction: column;
          }

          .success-actions button {
            width: 100%;
          }
        }

        @media (max-width: 430px) {
          .harvest-card {
            padding-left: 15px;
            padding-right: 15px;
          }

          .progress-item {
            min-width: 100px;
          }

          .progress-label {
            font-size: 9px;
          }

          .choices {
            gap: 7px;
          }

          .choice {
            padding: 8px 10px;
            font-size: 13px;
          }

          .publish-actions {
            gap: 8px;
          }
        }
      `}</style>
    </main>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="review-section">
      <div className="review-header">
        <strong>{title}</strong>

        <button
          type="button"
          className="edit-button"
          onClick={onEdit}
        >
          <Pencil size={15} />
          Edit
        </button>
      </div>

      <div className="review-body">
        {children}
      </div>
    </section>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="review-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}