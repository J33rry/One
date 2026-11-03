import React from "react";
import { SkippingStoneCanvas } from "@/components/login/SkippingStoneCanvas";
import { PebbleLogo } from "@/components/login/PebbleAuth";

// Split screen for login/register: form on the left, live skipping-stone water on
// the right. Living in the layout keeps the water running across both pages.
export default function PebbleAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full overflow-y-auto bg-[#f6f4fd] text-[#14121f] [color-scheme:light] lg:grid-cols-[minmax(440px,40%)_1fr] lg:overflow-hidden">
      <div className="flex min-h-full flex-col px-6 py-12 sm:px-12 lg:overflow-y-auto lg:px-16 xl:px-20">
        <div className="m-auto w-full max-w-[440px]">
          <div className="flex items-center gap-3">
            <PebbleLogo className="h-10 w-12" />
            <span className="text-[38px] font-semibold leading-none tracking-tight">pebble</span>
          </div>
          <div className="mt-12">{children}</div>
        </div>
      </div>

      <SkippingStoneCanvas className="hidden lg:block" />
    </div>
  );
}
