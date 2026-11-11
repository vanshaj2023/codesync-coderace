import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import { APPS } from "../apps.js";
import { GlassCard } from "./GlassCard.jsx";

const PRIMARY_BUTTON =
  "bg-mint text-ink hover:bg-[#7be3b3] focus-visible:outline-mint";
const SECONDARY_BUTTON =
  "border border-white/25 bg-white/5 text-white backdrop-blur-md hover:border-white/50 hover:bg-white/10 focus-visible:outline-white";

export const Hero = () => {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const context = gsap.context(() => {
      gsap.from("[data-hero]", {
        opacity: 0,
        y: 28,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.1,
      });
    }, rootRef);

    return () => context.revert();
  }, []);

  return (
    <main className="relative z-10 flex min-h-screen items-end px-6 pb-14 pt-36 md:px-12 md:pb-24 lg:px-20">
      <div ref={rootRef} className="w-full max-w-3xl">
        <div className="mb-10 w-[200px] translate-y-[-50px]">
          <GlassCard />
        </div>

        <p
          data-hero
          className="mb-4 font-jakarta text-[11px] font-bold uppercase tracking-[0.18em] text-mint"
        >
          Two ways to code with others
        </p>

        <h1
          data-hero
          className="text-[40px] font-extrabold uppercase leading-[0.98] tracking-tight md:text-6xl lg:text-[72px]"
        >
          Code together.
          <br />
          Race each other<span className="text-mint">.</span>
        </h1>

        <p data-hero className="mt-6 max-w-[512px] text-[14px] leading-relaxed text-white/70">
          Pair program in a shared real-time editor with live cursors, or go head to head on the
          same problem with ratings and a leaderboard. Pick a mode and be coding in seconds.
        </p>

        <div data-hero className="mt-9 flex flex-col gap-3 sm:flex-row">
          {APPS.map(({ cta, href }, index) => (
            <a
              key={href}
              href={href}
              className={`group inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 ${
                index === 0 ? PRIMARY_BUTTON : SECONDARY_BUTTON
              }`}
            >
              {cta}
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </a>
          ))}
        </div>
      </div>
    </main>
  );
};
