"use client";

import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/query-provider";

export default function Home() {
  return (
    <QueryProvider>
      <AppShell />
    </QueryProvider>
  );
}
