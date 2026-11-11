import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";

// Plain anchors on purpose: these leave this app for the hub and for CodeRace.
const APP_LINKS = [
  { label: "All apps", href: "/" },
  { label: "CodeRace", href: "/coderace/" },
];

export const HomeHeader = () => {
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
    <header className="cs-header">
      <a href="/codesync/" className="cs-logo" aria-label="CodeSync home">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="10" cy="14" r="7" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="18" cy="14" r="7" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <span>CodeSync</span>
      </a>

      <nav className="cs-nav" aria-label="Main">
        {APP_LINKS.map(({ label, href }) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
        <Link to="/Home">Join a room</Link>
      </nav>

      <button
        type="button"
        className="cs-menu-button"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
        aria-controls="cs-mobile-menu"
        onClick={() => setIsMenuOpen((open) => !open)}
      >
        {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
      </button>

      {isMenuOpen && (
        <div id="cs-mobile-menu" className="cs-mobile-menu">
          {APP_LINKS.map(({ label, href }) => (
            <a key={href} href={href}>
              {label}
              <ArrowRight size={26} />
            </a>
          ))}
          <Link to="/Home" onClick={() => setIsMenuOpen(false)}>
            Join a room
            <ArrowRight size={26} />
          </Link>
        </div>
      )}
    </header>
  );
};
