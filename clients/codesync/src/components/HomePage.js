import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { HeroBackground } from "./home/HeroBackground";
import { HomeHeader } from "./home/HomeHeader";
import { FEATURES, LANGUAGES, STEPS, USE_CASES } from "./home/home-content";
import "./HomePage.css";

gsap.registerPlugin(ScrollTrigger);

const CtaButtons = () => (
  <div className="cs-cta-row">
    <Link to="/Home" className="cs-btn cs-btn--primary">
      Create a room
      <ArrowRight size={18} />
    </Link>
    <Link to="/Home" className="cs-btn cs-btn--ghost">
      Join a room
      <ArrowRight size={18} />
    </Link>
  </div>
);

const SectionHeading = ({ kicker, id, children }) => (
  <div className="cs-section__heading" data-reveal>
    <p className="cs-eyebrow">{kicker}</p>
    <h2 id={id} className="cs-h2">
      {children}
    </h2>
  </div>
);

function HomePage() {
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
    <div className="cs-home" ref={rootRef}>
      <section className="cs-hero">
        <HeroBackground />
        <HomeHeader />

        <div className="cs-hero__content">
          <div className="cs-card-wrap">
            <div data-hero className="liquid-glass cs-glass-card">
              <span className="cs-glass-card__year">[ {new Date().getFullYear()} ]</span>
              <div>
                <h2>
                  Every cursor <span className="cs-serif">aligned</span>
                </h2>
                <p>Live cursors, shared output, and rooms that remember.</p>
              </div>
            </div>
          </div>

          <p data-hero className="cs-eyebrow">
            Real-time code collaboration
          </p>
          <h1 data-hero className="cs-title">
            Code together.
            <br />
            In real time<span className="cs-accent">.</span>
          </h1>
          <p data-hero className="cs-lead">
            Share a room link, watch every edit appear instantly, and run code with zero setup.
            Built for pair programming, interviews, and classrooms.
          </p>
          <div data-hero>
            <CtaButtons />
          </div>
        </div>
      </section>

      <section className="cs-section" aria-labelledby="about-heading">
        <div className="cs-container cs-about">
          <SectionHeading kicker="About CodeSync" id="about-heading">
            A shared editor that keeps <span className="cs-serif">everyone</span> in sync.
          </SectionHeading>
          <div className="cs-about__text" data-reveal>
            <p>
              CodeSync is a real-time collaborative code editor. You create a room, share its
              ID, and everyone who joins types in the same file at the same time. There is
              nothing to install and no account to set up: choose a name and start coding.
            </p>
            <p>
              Edits are merged automatically, so two people can type on the same line without
              overwriting each other. You always see who is where, and when someone runs the
              code, the whole room sees the same output.
            </p>
          </div>
        </div>
      </section>

      <section className="cs-section cs-section--bordered" aria-labelledby="features-heading">
        <div className="cs-container">
          <SectionHeading kicker="Features" id="features-heading">
            Everything you need to <span className="cs-serif">code together</span>.
          </SectionHeading>

          <div className="cs-cards">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="cs-card" data-reveal>
                <span className="cs-card__icon">
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>

          <div className="cs-languages" data-reveal>
            <p>Run code in {LANGUAGES.length} languages</p>
            <ul>
              {LANGUAGES.map((language) => (
                <li key={language}>{language}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="cs-section cs-section--bordered" aria-labelledby="steps-heading">
        <div className="cs-container">
          <SectionHeading kicker="How it works" id="steps-heading">
            From zero to <span className="cs-serif">coding together</span> in three steps.
          </SectionHeading>

          <ol className="cs-steps">
            {STEPS.map(({ title, text }, index) => (
              <li key={title} className="cs-step" data-reveal>
                <span className="cs-step__number cs-serif">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cs-section cs-section--bordered" aria-labelledby="use-cases-heading">
        <div className="cs-container">
          <SectionHeading kicker="Built for" id="use-cases-heading">
            However you like to <span className="cs-serif">work together</span>.
          </SectionHeading>

          <div className="cs-uses">
            {USE_CASES.map(({ title, text }) => (
              <div key={title} className="cs-use" data-reveal>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cs-section cs-final" aria-labelledby="final-heading">
        <div className="cs-container">
          <div className="liquid-glass cs-final__card" data-reveal>
            <h2 id="final-heading" className="cs-h2">
              Ready to code <span className="cs-serif">together</span>?
            </h2>
            <p>Open a room, send the ID, and you are live in seconds.</p>
            <CtaButtons />
          </div>
        </div>
      </section>

      <footer className="cs-footer">
        <a href="/">All apps</a>
        <a href="/coderace/">Try CodeRace</a>
      </footer>
    </div>
  );
}

export default HomePage;
