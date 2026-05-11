import { useCallback, useEffect, useState } from "react";

const CACHE_KEY = "americanizer:fx-cache";
const API_URL = "https://api.frankfurter.app/latest?from=USD";

const AUTO_FETCH_TTL_MS = 30 * 60 * 1000;  // skip auto-fetch if cache < 30 min old
const MANUAL_COOLDOWN_MS = 30 * 1000;       // min gap between manual refreshes

let _lastFetchedAt = 0;

const FALLBACK: Record<string, number> = {
  USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79,
  JPY: 149.5, CAD: 1.36, AUD: 1.53, CHF: 0.89, CNY: 7.18,
};

let _rates: Record<string, number> = { ...FALLBACK };
let _lastUpdated: string | null = null;

export function getRate(code: string): number {
  return _rates[code.toUpperCase()] ?? 1;
}

function loadCache(): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const { rates, lastUpdated } = JSON.parse(raw) as {
      rates?: Record<string, number>;
      lastUpdated?: string;
    };
    if (rates && typeof rates === "object") _rates = { USD: 1, ...rates };
    if (typeof lastUpdated === "string") _lastUpdated = lastUpdated;
  } catch {}
}

async function doFetch(): Promise<void> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { rates?: Record<string, number> };
  if (!data.rates) throw new Error("no rates in response");
  _rates = { USD: 1, ...data.rates };
  _lastUpdated = new Date().toISOString();
  _lastFetchedAt = Date.now();
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, lastUpdated: _lastUpdated }));
  } catch {}
}

function cacheAgeMs(): number {
  if (!_lastUpdated) return Infinity;
  return Date.now() - new Date(_lastUpdated).getTime();
}

export function formatRateAge(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 2) return "just updated";
  if (mins < 60) return `updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `updated ${hrs}h ago`;
  return `updated ${Math.floor(hrs / 24)}d ago`;
}

interface FxState {
  lastUpdated: string | null;
  isLoading: boolean;
  isError: boolean;
  onCooldown: boolean;
}

export function useFxRates() {
  const [state, setState] = useState<FxState>({
    lastUpdated: null,
    isLoading: false,
    isError: false,
    onCooldown: false,
  });

  const refresh = useCallback(async (force = false) => {
    if (!force && Date.now() - _lastFetchedAt < MANUAL_COOLDOWN_MS) return;
    setState((s) => ({ ...s, isLoading: true, isError: false, onCooldown: false }));
    try {
      await doFetch();
      setState({ lastUpdated: _lastUpdated, isLoading: false, isError: false, onCooldown: true });
      setTimeout(() => setState((s) => ({ ...s, onCooldown: false })), MANUAL_COOLDOWN_MS);
    } catch {
      setState((s) => ({ ...s, isLoading: false, isError: true, onCooldown: false }));
    }
  }, []);

  useEffect(() => {
    loadCache();
    setState((s) => ({ ...s, lastUpdated: _lastUpdated }));
    // Only hit the network if cached rates are stale
    if (cacheAgeMs() > AUTO_FETCH_TTL_MS) refresh(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refresh };
}
