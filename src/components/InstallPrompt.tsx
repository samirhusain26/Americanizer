"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Platform = "ios" | "android" | "desktop";

const DISMISSED_KEY = "americanizer:install-dismissed";
const VISIT_COUNT_KEY = "americanizer:install-vc";
// Legacy key — treat existing dismissals as permanent
const LEGACY_KEY = "americanizer:install-seen";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mm = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return !!mm || iosStandalone;
}

export default function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    if (isStandalone()) return;
    try {
      // Permanently dismissed (new key or legacy key)
      if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(LEGACY_KEY)) return;
      // Increment visit counter
      const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? "0", 10) + 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(count));
      if (count !== 1 && count !== 3) return;
    } catch {
      return;
    }
    setPlatform(detectPlatform());
    const id = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(id);
  }, []);

  // Permanent dismiss — clicking "Got it"
  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    setOpen(false);
  };

  // Soft close — backdrop tap; prompt may still return on visit 3
  const softClose = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="install-backdrop"
          className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={softClose}
          style={{ background: "rgba(20,20,15,0.55)" }}
        >
          <motion.div
            key="install-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md m-4 rounded-3xl"
            style={{
              background: "var(--color-shell)",
              border: "2px solid var(--color-ink)",
              boxShadow: "6px 6px 0 0 var(--color-ink)",
            }}
          >
            <div className="px-6 pt-5 pb-4 border-b-2" style={{ borderColor: "var(--color-ink)" }}>
              <div className="ui-mono text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-ink-soft)" }}>
                Install
              </div>
              <div className="num-display text-[28px] leading-none mt-1" style={{ color: "var(--color-ink)" }}>
                Add to Home Screen
              </div>
              <div className="text-[13px] mt-2 leading-[1.5]" style={{ color: "var(--color-ink-soft)" }}>
                Get the full tactile experience. Runs offline, launches from your home screen like a native app.
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              <InstructionBlock
                title="iOS — Safari"
                highlighted={platform === "ios"}
                steps={[
                  <>Tap the <Badge>Share</Badge> icon at the bottom of Safari.</>,
                  <>Scroll and tap <Badge>Add to Home Screen</Badge>.</>,
                  <>Confirm with <Badge>Add</Badge> in the top-right.</>,
                ]}
              />
              <InstructionBlock
                title="Android — Chrome"
                highlighted={platform === "android"}
                steps={[
                  <>Tap the <Badge>⋮</Badge> menu in the top-right.</>,
                  <>Tap <Badge>Install app</Badge> or <Badge>Add to Home screen</Badge>.</>,
                  <>Confirm with <Badge>Install</Badge>.</>,
                ]}
              />
            </div>

            <div
              className="px-6 py-4 flex items-center justify-end gap-3 border-t-2"
              style={{ borderColor: "var(--color-ink)", background: "var(--color-shell-2)" }}
            >
              <button
                type="button"
                onClick={dismiss}
                className="num-display text-[14px] px-4 py-2 rounded-xl"
                style={{
                  background: "var(--color-ink)",
                  color: "var(--color-shell)",
                  boxShadow: "3px 3px 0 0 var(--color-ink)",
                }}
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InstructionBlock({
  title,
  steps,
  highlighted,
}: {
  title: string;
  steps: React.ReactNode[];
  highlighted: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: highlighted ? "var(--color-lime)" : "var(--color-shell-2)",
        border: "2px solid var(--color-ink)",
      }}
    >
      <div className="ui-mono text-[11px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--color-ink)" }}>
        {title}
        {highlighted && <span className="ml-2 opacity-60">— detected</span>}
      </div>
      <ol className="space-y-1.5 text-[13px] leading-[1.5]" style={{ color: "var(--color-ink)" }}>
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span
              className="ui-mono text-[11px] min-w-5 h-5 flex items-center justify-center rounded-full"
              style={{ background: "var(--color-ink)", color: "var(--color-shell)" }}
            >
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="ui-mono text-[11px] px-1.5 py-0.5 rounded-md"
      style={{
        background: "var(--color-shell)",
        border: "1.5px solid var(--color-ink)",
      }}
    >
      {children}
    </span>
  );
}
