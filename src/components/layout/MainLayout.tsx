import { NavLink, Navigate, useParams } from "react-router-dom";
import { DemoCanvas } from "@/components/canvas/DemoCanvas";
import { demoRegistry, getDemoById } from "@/demos/_registry";

export function MainLayout() {
  const { demoId } = useParams<{ demoId: string }>();
  const entry = demoId ? getDemoById(demoId) : undefined;
  const Scene = entry?.Scene;

  if (!demoId || !entry || !Scene) {
    return <Navigate to="/demo/example-basic" replace />;
  }

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-neutral-800 bg-neutral-900/50 p-4 md:w-56 md:border-b-0 md:border-r">
        <h1 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400">
          案例
        </h1>
        <nav className="flex flex-col gap-1">
          {demoRegistry.map((d) => (
            <NavLink
              key={d.id}
              to={`/demo/${d.id}`}
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white",
                ].join(" ")
              }
            >
              {d.title}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <header>
          <h2 className="text-xl font-semibold text-white">{entry.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-400">
            {entry.description}
          </p>
        </header>

        <DemoCanvas key={demoId}>
          <Scene />
        </DemoCanvas>
      </main>
    </div>
  );
}
