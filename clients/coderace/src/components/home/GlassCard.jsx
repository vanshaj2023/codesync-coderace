export const GlassCard = () => (
  <div
    data-hero
    className="liquid-glass flex h-[200px] w-[200px] flex-col justify-between rounded-3xl p-5 font-inter"
  >
    <span className="text-[14px] text-white/80">[ {new Date().getFullYear()} ]</span>

    <div>
      <h2 className="text-[18px] leading-tight text-white">
        Outcode your <span className="font-instrument italic">rival</span>
      </h2>
      <p className="mt-2 text-[11px] leading-snug text-white/60">
        Same problem, same clock. First to pass every test wins.
      </p>
    </div>
  </div>
);
