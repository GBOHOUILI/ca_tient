"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccessDeniedError } from "@/lib/api/http";
import { fetchIdea, type IdeaDetail } from "@/lib/api/ideas";
import { fetchPaymentStatus, startPayment } from "@/lib/api/payments";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

export type PaymentGateView =
  | { kind: "loading" }
  | { kind: "no-access" }
  | { kind: "pending"; timedOut: boolean }
  | { kind: "failed" }
  // Never tried to pay (left before the offer, or came back later): show the offer, not a failure.
  | { kind: "unpaid"; idea: IdeaDetail }
  | { kind: "error" }
  | { kind: "paid"; idea: IdeaDetail };

// Opens the paid analysis only once the server confirms the payment; polls while it is pending.
export function usePaymentGate(ideaId: string) {
  const [view, setView] = useState<PaymentGateView>({ kind: "loading" });
  const [retrying, setRetrying] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartedAt = useRef<number>(0);
  // Holds the latest `check` so timer callbacks can call it without referencing it before its
  // declaration (react-hooks/immutability).
  const checkRef = useRef<() => void>(() => {});
  // Guards setState/timer re-arms after unmount. Set inside the effect (not at ref creation) so
  // it survives React 19 StrictMode's dev-only mount -> cleanup -> remount cycle.
  const mountedRef = useRef(false);

  const check = useCallback(async () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    try {
      const payment = await fetchPaymentStatus(ideaId);
      if (!mountedRef.current) return;
      if (payment.paid) {
        const idea = await fetchIdea(ideaId);
        if (mountedRef.current) setView({ kind: "paid", idea });
        return;
      }
      if (payment.status === "pending") {
        const timedOut = Date.now() - pollStartedAt.current >= POLL_TIMEOUT_MS;
        setView({ kind: "pending", timedOut });
        if (!timedOut) pollTimer.current = setTimeout(() => checkRef.current(), POLL_INTERVAL_MS);
        return;
      }
      if (payment.status === null) {
        const idea = await fetchIdea(ideaId);
        if (mountedRef.current) setView({ kind: "unpaid", idea });
        return;
      }
      setView({ kind: "failed" });
    } catch (error) {
      // No token in this browser: the API answers 401, turned into the "no-access" view.
      if (mountedRef.current) setView({ kind: error instanceof AccessDeniedError ? "no-access" : "error" });
    }
  }, [ideaId]);

  useEffect(() => {
    checkRef.current = () => void check();
  }, [check]);

  // The first check is deferred to a timer so the effect never calls setState synchronously
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    mountedRef.current = true;
    pollStartedAt.current = Date.now();
    const timeout = setTimeout(() => checkRef.current(), 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const checkAgain = useCallback(() => {
    pollStartedAt.current = Date.now();
    setView({ kind: "loading" });
    void check();
  }, [check]);

  const retryPayment = useCallback(async () => {
    setRetrying(true);
    try {
      const { redirectUrl } = await startPayment(ideaId);
      window.location.assign(redirectUrl);
    } catch {
      setRetrying(false);
      setView({ kind: "error" });
    }
  }, [ideaId]);

  return { view, checkAgain, retryPayment, retrying };
}
