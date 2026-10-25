"use client";

import { Home } from "@/features/generator/views/home/Home";

// Thin route wrapper: the full zero -> auto/manual -> showcase flow
// lives in the feature Home component.
export default function GeneratorPage() {
  return <Home />;
}
