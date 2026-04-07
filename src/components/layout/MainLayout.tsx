import { motion } from "framer-motion";
import { Box, ChevronRight, Sparkles } from "lucide-react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import { DemoCanvas } from "@/components/canvas/DemoCanvas";
import { Badge } from "@/components/ui/badge";
import BlurText from "@/components/react-bits/BlurText";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { demoRegistry, getDemoById } from "@/demos/_registry";
import { HaiBootProvider } from "@/demos/hai-scene/haiBootContext";
import { HaiBootOverlayDom } from "@/demos/hai-scene/HaiBootOverlayDom";
import { cn } from "@/lib/utils";

export function MainLayout() {
  const { demoId } = useParams<{ demoId: string }>();
  const entry = demoId ? getDemoById(demoId) : undefined;
  const Scene = entry?.Scene;

  if (!demoId || !entry || !Scene) {
    return <Navigate to="/demo/example-basic" replace />;
  }

  const isHaiScene = entry.id === "hai-scene";
  const canvasBlock = (
    <DemoCanvas key={demoId} overlay={isHaiScene ? <HaiBootOverlayDom /> : undefined}>
      <Scene />
    </DemoCanvas>
  );

  return (
    <div className="relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-background"
      >
        <div className="demo-bg-blob-a absolute -left-[20%] top-[-25%] h-[min(70vw,520px)] w-[min(70vw,520px)] rounded-full bg-primary/25 blur-[100px]" />
        <div className="demo-bg-blob-b absolute -right-[15%] bottom-[-20%] h-[min(65vw,480px)] w-[min(65vw,480px)] rounded-full bg-violet-600/20 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
      </div>

      <div className="flex min-h-full flex-col md:flex-row">
        <aside className="w-full shrink-0 border-b border-border/60 bg-card/35 p-4 backdrop-blur-xl md:w-60 md:border-b-0 md:border-r md:border-border/60">
          <div className="mb-5 flex items-center gap-2 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
              <Box className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Showcase
              </h1>
              <p className="text-sm font-semibold text-foreground">案例</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1" aria-label="案例导航">
            {demoRegistry.map((d) => (
              <NavLink
                key={d.id}
                to={`/demo/${d.id}`}
                className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {({ isActive }) => (
                  <span
                    className={cn(
                      "relative block overflow-hidden rounded-lg px-3 py-2.5 text-sm transition-colors duration-200",
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="demo-nav-active"
                        className="absolute inset-0 rounded-lg bg-primary/12 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]"
                        transition={{ type: "spring", stiffness: 440, damping: 34 }}
                      />
                    ) : null}
                    <span className="relative z-10 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
                      {d.tag ? (
                        <Badge variant="outline" className="hidden shrink-0 text-[0.65rem] md:inline-flex">
                          {d.tag}
                        </Badge>
                      ) : null}
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 text-primary transition-transform duration-200",
                          isActive ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
                        )}
                        aria-hidden
                      />
                    </span>
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-7">
          <motion.div
            key={demoId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-w-0 flex-1 flex-col gap-5"
          >
            <Card className="border-border/70 bg-card/50 shadow-lg backdrop-blur-md">
              <CardHeader className="space-y-3 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                      <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-balance text-xl font-semibold leading-none tracking-tight md:text-2xl">
                        <BlurText
                          key={demoId}
                          text={entry.title}
                          animateBy={/\s/.test(entry.title) ? "words" : "letters"}
                          delay={/\s/.test(entry.title) ? 85 : 40}
                          className="text-card-foreground"
                          direction="top"
                          threshold={0.15}
                        />
                      </h3>
                      <CardDescription className="mt-2 max-w-3xl text-pretty leading-relaxed">
                        {entry.description}
                      </CardDescription>
                    </div>
                  </div>
                  {entry.tag ? (
                    <Badge variant="glow" className="shrink-0">
                      {entry.tag}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="pb-6 pt-0">
                {isHaiScene ? <HaiBootProvider>{canvasBlock}</HaiBootProvider> : canvasBlock}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
