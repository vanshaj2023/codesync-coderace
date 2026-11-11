import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { APPS } from "../apps.js";

const Logo = () => (
  <a href="/" className="flex items-center gap-2.5 text-white" aria-label="CodeSync and CodeRace home">
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="10" cy="14" r="7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="14" r="7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
    <span className="text-base font-bold tracking-tight">
      CodeSync<span className="px-1.5 text-white/50">+</span>CodeRace
    </span>
  </a>
);

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  return (
    <header className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 lg:px-20">
      <Logo />

      <nav className="hidden items-center gap-10 md:flex" aria-label="Apps">
        {APPS.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            className="text-base uppercase tracking-wide text-white transition-colors hover:text-mint"
          >
            {label}
          </a>
        ))}
      </nav>

      <button
        type="button"
        className="relative z-50 rounded-full p-2 text-white md:hidden"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
        aria-controls="mobile-menu"
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
      </button>

      {isMenuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-40 flex flex-col justify-center gap-6 bg-ink/95 px-8 backdrop-blur-md md:hidden"
        >
          {APPS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="flex items-center justify-between border-b border-white/10 pb-5 text-3xl font-extrabold uppercase tracking-tight text-white transition-colors hover:text-mint"
              onClick={() => setIsMenuOpen(false)}
            >
              {label}
              <ArrowRight size={26} />
            </a>
          ))}
        </div>
      )}
    </header>
  );
};
