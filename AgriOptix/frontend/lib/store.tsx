"use client";
/**
 * AgriOptix workflow store.
 * Single source of truth for the step-by-step farmer/buyer/driver journey.
 * Persisted to localStorage so a browser refresh never destroys progress
 * (mirrors the backend order/harvest state which is the durable source of truth).
 */
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const STORAGE_KEY = "agrioptix.workflow.v1";

export type Role = "farmer" | "buyer" | "driver" | null;

export type Workflow = {
  role: Role;
  farmer: { name: string; mobile: string; language: string; village: string; crops: string } | null;
  harvest: any | null;
  photos: string[];
  quality: any | null;
  perishability: any | null;
  buyers: any[];
  optimization: any | null;
  acceptedPlan: boolean;
  aggregation: any | null;
  route: any | null;
  order: any | null;
  orderStatus: string;
  settlement: any | null;
};

const EMPTY: Workflow = {
  role: null,
  farmer: null,
  harvest: null,
  photos: [],
  quality: null,
  perishability: null,
  buyers: [],
  optimization: null,
  acceptedPlan: false,
  aggregation: null,
  route: null,
  order: null,
  orderStatus: "PLANNED",
  settlement: null,
};

type Ctx = {
  wf: Workflow;
  setWf: (patch: Partial<Workflow>) => void;
  reset: () => void;
  ready: boolean;
};

const WorkflowContext = createContext<Ctx | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [wf, setWfState] = useState<Workflow>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWfState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);

  function setWf(patch: Partial<Workflow>) {
    setWfState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setWfState(EMPTY);
  }

  const value = useMemo(() => ({ wf, setWf, reset, ready }), [wf, ready]);
  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider");
  return ctx;
}

export async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}
