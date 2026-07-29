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
          "w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-border bg-surface-2/30 flex flex-col h-full overflow-hidden transition-all duration-300",
          showMainOnMobile ? "hidden md:flex" : "flex"
        )}
      >
        {sidebar}
      </div>
      
      {/* Main Pane */}
      <div 
        className={clsx(
          "flex-1 min-w-0 bg-transparent flex flex-col relative h-full overflow-hidden",
          showMainOnMobile ? "flex" : "hidden md:flex"
        )}
      >
        {main}
      </div>
    </div>
  );
}
