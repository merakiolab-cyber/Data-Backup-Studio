interface AppLogoProps {
  size?: number;
}

/** Bold geometric D (data + inner copy). Color from `currentColor`. */
export function AppLogo({ size = 44 }: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      aria-hidden
    >
      <path
        d="M16 10v44M16 10h14a22 22 0 0 1 0 44H16"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 24h12a8 8 0 0 1 0 16H16"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
