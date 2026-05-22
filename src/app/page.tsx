"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

const Americanizer = dynamic(() => import("@/components/Americanizer"), {
  ssr: false,
});
const InstallPrompt = dynamic(() => import("@/components/InstallPrompt"), {
  ssr: false,
});

export default function Home() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW registered:", reg.scope))
          .catch((err) => console.error("SW registration failed:", err));
      });
    }
  }, []);

  return (
    <>
      <Americanizer />
      <InstallPrompt />
    </>
  );
}
