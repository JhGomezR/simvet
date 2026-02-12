export function UniversityLogo(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <circle cx="50" cy="50" r="48" fill="hsl(var(--primary))" />
        <path
          d="M50 25 L30 37.5 V 62.5 L50 75 L70 62.5 V 37.5 L50 25 Z M 50 28 L 67 39 V 61 L 50 72 L 33 61 V 39 L 50 28 Z"
          fill="hsl(var(--primary-foreground))"
          opacity="0.2"
        />
        <path 
            d="M 40 40 L 40 60 L 45 60 L 45 45 L 55 45 L 55 40 Z"
            fill="hsl(var(--primary-foreground))"
        />
        <path 
            d="M 60 40 L 60 60 L 55 60 L 55 55 L 48 55 L 48 50 L 55 50 L 55 45 L 60 45 Z"
            transform="rotate(180 54 50)"
            fill="hsl(var(--primary-foreground))"
        />
      </svg>
    );
  }
  