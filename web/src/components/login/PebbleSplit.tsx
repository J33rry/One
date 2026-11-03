"use client";

import React, { useRef } from "react";
import { SkippingStoneCanvas } from "./SkippingStoneCanvas";
import { PebbleLogo } from "./PebbleAuth";

// Split screen for the auth pages: form on the left, live skipping-stone water on
// the right. Ripples that reach the seam carry on faintly under the form.
export function PebbleSplit({ children }: { children: React.ReactNode }) {
  const shoreRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="grid h-full overflow-y-auto bg-[#f6f4fd] text-[#14121f] [color-scheme:light] lg:grid-cols-[minmax(440px,40%)_1fr] lg:overflow-hidden">
      <div className="relative lg:overflow-hidden">
        <canvas ref={shoreRef} className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" />
        <div className="relative flex min-h-full flex-col px-6 py-12 sm:px-12 lg:h-full lg:overflow-y-auto lg:px-16 xl:px-20">
          <div className="m-auto w-full max-w-[440px]">
            <div className="flex items-center gap-3">
              <PebbleLogo className="h-10 w-12" />
              <span className="text-[38px] font-semibold leading-none tracking-tight">pebble</span>
            </div>
            <div className="mt-12">{children}</div>
          </div>
        </div>
      </div>

      <SkippingStoneCanvas className="hidden lg:block" shoreRef={shoreRef} />
    </div>
  );
}
