import React from "react";
import { PebbleSplit } from "@/components/login/PebbleSplit";

// Shared shell for the auth pages; living in the layout keeps the water running
// while moving between login, register and password reset.
export default function PebbleAuthLayout({ children }: { children: React.ReactNode }) {
  return <PebbleSplit>{children}</PebbleSplit>;
}
