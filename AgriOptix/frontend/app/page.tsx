"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Root entry point. The app is now a guided step-by-step journey rather than
 * a single dashboard, so "/" hands off to the welcome/splash screen.
 * The original all-in-one dashboard is preserved, unchanged, at /farmer/dashboard.
 */
export default function RootRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/welcome");
  }, [router]);
  return null;
}
