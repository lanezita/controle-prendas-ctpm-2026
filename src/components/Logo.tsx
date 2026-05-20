import React, { useState } from 'react';
import { LOGO_URL } from '../constants';

interface LogoProps {
  className?: string;
  fallbackSize?: "sm" | "md" | "lg" | "xl";
}

export function Logo({ className = "h-16 w-auto", fallbackSize = "md" }: LogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <svg 
        viewBox="0 0 100 100" 
        className={className} 
        xmlns="http://www.w3.org/2000/svg"
        title="CTPM"
      >
        {/* Simple elegant vector shield as a robust fallback */}
        <path 
          d="M 50,5 C 80,5 95,15 95,45 C 95,75 75,92 50,97 C 25,92 5,75 5,45 C 5,15 20,5 50,5 Z" 
          fill="#1e3a8a" 
          stroke="#d97706" 
          strokeWidth="5" 
          strokeLinejoin="round"
        />
        <text 
          x="50" 
          y="56" 
          textAnchor="middle" 
          fontSize="24" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontWeight="900" 
          fill="#ffffff"
        >
          CTPM
        </text>
      </svg>
    );
  }

  return (
    <img 
      src={LOGO_URL} 
      alt="CTPM Gameleira Logo" 
      className={className}
      onError={() => {
        console.warn("Logo image failed to load, rendering simple CTPM shield fallback.");
        setHasError(true);
      }}
      referrerPolicy="no-referrer"
    />
  );
}
