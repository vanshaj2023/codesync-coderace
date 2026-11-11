import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { FEATURES, LANGUAGES, STEPS } from "./home-content.js";

gsap.registerPlugin(ScrollTrigger);

const SECTION = "relative border-t border-white/10 px-6 py-20 md:px-12 md:py-28 lg:px-20";
const EYEBROW =
  "mb-4 font-jakarta text-[11px] font-bold uppercase tracking-[0.18em] text-brand";
const HEADING =
  "text-[clamp(1.9rem,4.4vw,3rem)] font-extrabold leading-[1.06] tracking-tight text-white";
const SERIF = "font-instrument text-[1.08em] font-normal italic";

const Heading = ({ kicker, id, children }) => (
  <div data-reveal className="mb-12 max-w-2xl">
    <p className={EYEBROW}>{kicker}</p>
    <h2 id={id} className={HEADING}>
      {children}
    </h2>
  </div>
);

export const HomeSections = () => {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const context = gsap.context(() => {
      gsap.utils.toArray("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          opacity: 0,
          y: 32,
          duration: 0.8,
          ease: "power3.out",
          clearProps: "transform",
          scrollTrigger: { trigger: element, start: "top 90%", once: true },
        });
      });
    }, rootRef);

    return () => context.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative bg-dark font-inter">
      <section className={SECTION} aria-labelledby="about-heading">
        <div className="mx-auto grid max-w-6xl gap-10 min-[900px]:grid-cols-[1.1fr_1fr]">
          <Heading kicker="About CodeRace" id="about-heading">
            Race head to head on the <span className={SERIF}>same</span> problem.
          </Heading>
          <div data-reveal className="space-y-5 text-base leading-[1.75] text-white/70">
            <p>
              CodeRace is a real-time coding duel. Two players join a room, ready up, and receive
              the same problem at the same moment. Each of you writes a solution in your own
              editor, and the first to pass every test wins the match.
            </p>
            <p>
              Your code runs against the full test suite the moment you submit, so there is no
              waiting on a judge. No account is needed to play: guests can race too, and signing
              in adds ratings and a place on the leaderboard.
            </p>
          </div>
        </div>
      </section>

      <section className={SECTION} aria-labelledby="features-heading">
        <div className="mx-auto max-w-6xl">
          <Heading kicker="Features" id="features-heading">
            Everything you need to <span className={SERIF}>outcode</span> your rival.
          </Heading>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                data-reveal
                className="rounded-[1.25rem] border border-white/10 bg-white/[0.02] p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:bg-brand/[0.04]"
              >
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
                  <Icon size={20} />
                </span>
                <h3 className="mb-2 text-[1.05rem] font-bold tracking-tight text-white">{title}</h3>
                <p className="text-[0.9rem] leading-[1.65] text-white/60">{text}</p>
              </article>
            ))}
          </div>

          <div data-reveal className="mt-12 border-t border-white/10 pt-8">
            <p className="mb-4 text-[0.85rem] text-white/60">Languages</p>
            <ul className="flex flex-wrap gap-2">
              {LANGUAGES.map(({ name, isReady }) => (
                <li
                  key={name}
                  className={`rounded-full border px-3.5 py-1.5 text-[0.8rem] ${
                    isReady
                      ? "border-brand/40 text-brand"
                      : "border-white/15 text-white/50"
                  }`}
                >
                  {isReady ? name : `${name} (soon)`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={SECTION} aria-labelledby="steps-heading">
        <div className="mx-auto max-w-6xl">
          <Heading kicker="How a race works" id="steps-heading">
            From room to <span className={SERIF}>winner</span> in four steps.
          </Heading>

          <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ title, text }, index) => (
              <li key={title} data-reveal className="border-t border-white/10 pt-6">
                <span className="mb-4 block font-instrument text-6xl italic leading-none text-brand">
                  0{index + 1}
                </span>
                <h3 className="mb-2 text-xl font-bold tracking-tight text-white">{title}</h3>
                <p className="text-[0.95rem] leading-[1.65] text-white/60">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={SECTION} aria-labelledby="final-heading">
        <div className="mx-auto max-w-6xl">
          <div
            data-reveal
            className="liquid-glass flex flex-col items-center gap-4 rounded-[28px] px-6 py-12 text-center"
          >
            <h2 id="final-heading" className={HEADING}>
              Ready to <span className={SERIF}>race</span>?
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-white/65">
              Create a room, send the code, and the first problem is only a countdown away.
            </p>
            <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                to="/lobby"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-4 text-sm font-bold uppercase tracking-wide text-dark transition-colors hover:bg-[#7be3b3]"
              >
                Create / join a race
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
              <Link
                to="/practice-lobby"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-8 py-4 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-md transition-colors hover:border-white/50 hover:bg-white/10"
              >
                Practice solo
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="flex justify-center gap-8 border-t border-white/10 px-6 pb-12 pt-8 text-[0.85rem]">
        <a href="/" className="text-white/60 transition-colors hover:text-brand">
          All apps
        </a>
        <a href="/codesync/" className="text-white/60 transition-colors hover:text-brand">
          Try CodeSync
        </a>
      </footer>
    </div>
  );
};
