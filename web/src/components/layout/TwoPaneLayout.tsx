import clsx from "clsx";

interface TwoPaneLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  // If true, mobile shows main pane and hides sidebar. Otherwise shows sidebar.
  showMainOnMobile?: boolean; 
}

export function TwoPaneLayout({ sidebar, main, showMainOnMobile = false }: TwoPaneLayoutProps) {
  return (
    <div className="flex-1 flex overflow-hidden w-full">
      {/* Sidebar Pane */}
      <div 
        className={clsx(
          "w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-zinc-800 bg-zinc-950/50 flex flex-col",
          showMainOnMobile ? "hidden md:flex" : "flex"
        )}
      >
        {sidebar}
      </div>
      
      {/* Main Pane */}
      <div 
        className={clsx(
          "flex-1 min-w-0 bg-zinc-950 flex flex-col relative",
          showMainOnMobile ? "flex" : "hidden md:flex"
        )}
      >
        {main}
      </div>
    </div>
  );
}
