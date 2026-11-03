import clsx from "clsx";

interface TwoPaneLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  // If true, mobile shows main pane and hides sidebar. Otherwise shows sidebar.
  showMainOnMobile?: boolean; 
}

export function TwoPaneLayout({ sidebar, main, showMainOnMobile = false }: TwoPaneLayoutProps) {
  return (
    <div className="flex-1 flex h-full overflow-hidden w-full bg-transparent">
      {/* Sidebar Pane */}
      <div 
        className={clsx(
          "w-full md:w-[340px] lg:w-[392px] flex-shrink-0 border-r border-border bg-surface flex flex-col h-full overflow-hidden",
          showMainOnMobile ? "hidden md:flex" : "flex"
        )}
      >
        {sidebar}
      </div>
      
      {/* Main Pane */}
      <div 
        className={clsx(
          "flex-1 min-w-0 bg-bg flex flex-col relative h-full overflow-hidden",
          showMainOnMobile ? "flex" : "hidden md:flex"
        )}
      >
        {main}
      </div>
    </div>
  );
}
