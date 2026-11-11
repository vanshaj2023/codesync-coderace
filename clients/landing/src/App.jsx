import { Header } from "./components/Header.jsx";
import { HeroBackground } from "./components/HeroBackground.jsx";
import { Hero } from "./components/Hero.jsx";

export const App = () => (
  <div className="relative min-h-screen overflow-hidden bg-ink font-inter text-white">
    <HeroBackground />
    <Header />
    <Hero />
  </div>
);
