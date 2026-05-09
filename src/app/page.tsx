"use client";

import dynamic from "next/dynamic";

const Americanizer = dynamic(() => import("@/components/Americanizer"), {
  ssr: false,
});

export default function Home() {
  return <Americanizer />;
}
