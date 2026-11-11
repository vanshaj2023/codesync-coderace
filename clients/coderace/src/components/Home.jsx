import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ArrowRight, Trophy } from "lucide-react";
import { HeroBackground } from "./home/HeroBackground.jsx";
import { GlassCard } from "./home/GlassCard.jsx";
import { HomeSections } from "./home/HomeSections.jsx";

const BUTTON_BASE =
  "group inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-4";

const Home = () => {
  const contentRef = useRef(null);

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
    }, contentRef);

    return () => context.revert();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex min-h-[calc(100vh-60px)] items-end overflow-hidden px-6 pb-14 pt-24 font-inter md:px-12 md:pb-20 lg:px-20">
        <HeroBackground />

        <div ref={contentRef} className="relative z-10 w-full max-w-3xl">
          <div className="mb-10 w-[200px] translate-y-[-50px]">
            <GlassCard />
          </div>

          <p
            data-hero
            className="mb-4 font-jakarta text-[11px] font-bold uppercase tracking-[0.18em] text-brand"
          >
            1v1 coding races
          </p>

          <h1
            data-hero
            className="text-[40px] font-extrabold uppercase leading-[0.98] tracking-tight text-white md:text-6xl lg:text-[72px]"
          >
            Race your friends.
            <br />
            Code faster. Win<span className="text-brand">.</span>
          </h1>

          <p data-hero className="mt-6 max-w-[512px] text-[14px] leading-relaxed text-white/70">
            Choose your mode. Hone your skills solo, or challenge an opponent in a multiplayer
            coding race with ratings and a leaderboard.
          </p>

          <div data-hero className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/lobby"
              className={`${BUTTON_BASE} bg-brand text-dark hover:bg-[#7be3b3] focus-visible:outline-brand`}
            >
              Create / join a race
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <Link
              to="/practice-lobby"
              className={`${BUTTON_BASE} border border-white/25 bg-white/5 text-white backdrop-blur-md hover:border-white/50 hover:bg-white/10 focus-visible:outline-white`}
            >
              Practice solo
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>

          <Link
            to="/leaderboard"
            data-hero
            className="mt-6 inline-flex items-center gap-2 text-[13px] text-white/60 transition-colors hover:text-brand"
          >
            <Trophy size={15} />
            View rankings
          </Link>
        </div>
      </div>
      <HomeSections />
    </div>
  );
};

export default Home;
