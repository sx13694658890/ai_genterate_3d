/**
 * 自 @react-bits/BlurText-TS-TW 移植（React Bits · DavidHDev）
 * 原文依赖 `motion/react`；本项目使用 `framer-motion`，API 兼容。
 * CLI 等价：`npx shadcn add @react-bits/BlurText-TS-TW`
 */
import { motion, type Easing, type Transition } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { cn } from "@/lib/utils";

export type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: Easing | Easing[];
  onAnimationComplete?: () => void;
  stepDuration?: number;
};

type StyleKeyframe = Record<string, string | number>;

function buildKeyframes(
  from: StyleKeyframe,
  steps: StyleKeyframe[]
): Record<string, (string | number)[]> {
  const keys = new Set<string>([...Object.keys(from), ...steps.flatMap((s) => Object.keys(s))]);
  const keyframes: Record<string, (string | number)[]> = {};
  keys.forEach((k) => {
    const out: (string | number)[] = [from[k]!];
    for (const s of steps) {
      out.push((s[k] ?? out[out.length - 1])!);
    }
    keyframes[k] = out;
  });
  return keyframes;
}

const BlurText: FC<BlurTextProps> = ({
  text = "",
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = (t: number) => t,
  onAnimationComplete,
  stepDuration = 0.35,
}) => {
  const elements = useMemo(() => {
    if (animateBy === "words") return text.split(/\s+/).filter(Boolean);
    return [...text];
  }, [text, animateBy]);

  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, y: -50 }
        : { filter: "blur(10px)", opacity: 0, y: 50 },
    [direction]
  );

  const defaultTo = useMemo(
    () =>
      [
        {
          filter: "blur(5px)",
          opacity: 0.5,
          y: direction === "top" ? 5 : -5,
        },
        { filter: "blur(0px)", opacity: 1, y: 0 },
      ] satisfies StyleKeyframe[],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * Math.max(stepCount - 1, 1e-6);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1)
  );

  return (
    <span
      ref={ref}
      className={cn("inline-flex max-w-full flex-wrap items-baseline gap-x-0.5", className)}
    >
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);

        const spanTransition: Transition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000,
          ease: easing,
        };

        return (
          <motion.span
            key={`${index}-${segment}`}
            className="inline-block will-change-[filter,opacity,transform]"
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
          >
            {segment}
            {animateBy === "words" && index < elements.length - 1 ? "\u00A0" : null}
          </motion.span>
        );
      })}
    </span>
  );
};

export default BlurText;
