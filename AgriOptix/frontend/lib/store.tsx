"use client";

/**
 * AgriOptix workflow store.
 * Single source of truth for the step-by-step farmer/buyer/driver journey.
 *
 * Persisted to localStorage so a browser refresh never destroys progress.
 * The backend remains the durable source of truth for server-side data.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReactNode } from "react";

export const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STORAGE_KEY = "agrioptix.workflow.v1";

export type Role = "farmer" | "buyer" | "driver" | null;

export type Workflow = {
  role: Role;

  farmer: {
    name: string;
    mobile: string;
    language: string;
    village: string;
    crops: string;
  } | null;

  harvest: any | null;
  photos: string[];
  quality: any | null;
  aiQuality: any | null;
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

  aiQuality: null,

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

export function WorkflowProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [wf, setWfState] = useState<Workflow>(EMPTY);

  const [ready, setReady] = useState(false);

  /**
   * Restore workflow from localStorage after the client mounts.
   */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const saved = JSON.parse(raw);

        setWfState({
          ...EMPTY,
          ...saved,
        });
      }
    } catch (error) {
      console.warn(
        "AgriOptix: unable to restore workflow from localStorage.",
        error
      );
    } finally {
      setReady(true);
    }
  }, []);

  /**
   * Update workflow state and persist it locally.
   */
  function setWf(patch: Partial<Workflow>) {
    setWfState((previous) => {
      const next: Workflow = {
        ...previous,
        ...patch,
      };

      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch (error) {
        console.warn(
          "AgriOptix: unable to save workflow to localStorage.",
          error
        );
      }

      return next;
    });
  }

  /**
   * Completely reset the local workflow.
   */
  function reset() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn(
        "AgriOptix: unable to clear workflow from localStorage.",
        error
      );
    }

    setWfState(EMPTY);
  }

  const value = useMemo<Ctx>(
    () => ({
      wf,
      setWf,
      reset,
      ready,
    }),
    [wf, ready]
  );

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

/**
 * Access the AgriOptix workflow.
 */
export function useWorkflow() {
  const ctx = useContext(WorkflowContext);

  if (!ctx) {
    throw new Error(
      "useWorkflow must be used within WorkflowProvider"
    );
  }

  return ctx;
}

/**
 * Common API helper for the existing AgriOptix backend.
 *
 * Example:
 *
 * await api("/api/auth/login", {
 *   method: "POST",
 *   body: JSON.stringify({
 *     mobile: "...",
 *     password: "..."
 *   })
 * });
 */
export async function api(
  path: string,
  opts: RequestInit = {}
) {
  const headers = new Headers(opts.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API}${path}`, {
    ...opts,
    headers,
  });

  /**
   * Some endpoints may return an empty response.
   * Handle that safely instead of forcing JSON parsing.
   */
  const contentType =
    response.headers.get("content-type") || "";

  let payload: any = {};

  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => "");
    payload = text ? { message: text } : {};
  }

  if (!response.ok) {
    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : typeof payload?.message === "string"
        ? payload.message
        : Array.isArray(payload?.detail)
        ? payload.detail
            .map((item: any) => {
              if (typeof item === "string") {
                return item;
              }

              if (item?.msg) {
                return item.msg;
              }

              return JSON.stringify(item);
            })
            .join(", ")
        : `${path} failed: ${response.status}`;

    throw new Error(detail);
  }

  return payload;
}