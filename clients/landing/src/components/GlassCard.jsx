export const GlassCard = () => (
  <div
    data-hero
    className="liquid-glass flex h-[200px] w-[200px] flex-col justify-between rounded-3xl p-5"
  >
    <span className="text-[14px] text-white/80">[ {new Date().getFullYear()} ]</span>

    <div>
      <h2 className="text-[18px] leading-tight text-white">
        Code with <span className="font-instrument italic">anyone</span>, anywhere
      </h2>
      <p className="mt-2 text-[11px] leading-snug text-white/60">
        Live cursors, shared output, and ranked 1v1 races in one place.
      </p>
    </div>
  </div>
);
