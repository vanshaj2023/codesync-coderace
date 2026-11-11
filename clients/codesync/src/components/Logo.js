import React from "react";

/** Two overlapping rings, the same mark as the landing page logo. */
export const Logo = ({ size = 50, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    role="img"
    aria-label="CodeSync logo"
    style={style}
  >
    <circle cx="10" cy="14" r="7" stroke="#ffffff" strokeWidth="1.8" />
    <circle cx="18" cy="14" r="7" stroke="#5ed29c" strokeWidth="1.8" />
  </svg>
);
