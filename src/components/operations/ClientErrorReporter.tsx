"use client";

import { useEffect } from "react";

const reported = new Set<string>();

export function ClientErrorReporter() {
  useEffect(() => {
    function report(message: string) {
      if (reported.size >= 3) return;
      const normalized = message.replace(/\s+/g, " ").trim().slice(0, 500);
      if (normalized.length < 3 || reported.has(normalized)) return;
      reported.add(normalized);
      void fetch("/api/telemetry/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "client_runtime_error",
          message: normalized,
          route: window.location.pathname
        }),
        keepalive: true
      });
    }

    const onError = (event: ErrorEvent) => report(event.message || "Unhandled client error");
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report(reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection"));
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
