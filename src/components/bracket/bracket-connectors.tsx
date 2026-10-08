'use client';

import { cn } from "@/lib/utils";

export interface CyberConnectorForkProps {
  color?: "primary" | "amber" | "cyan" | "rose" | "purple";
  customHex?: string;
  customGlow?: string;
  height?: "standard" | "tall";
  className?: string;
}

export const CyberConnectorFork = ({ color = "primary", customHex, customGlow, height = "standard", className }: CyberConnectorForkProps) => {
  const isTall = height === "tall";
  const defaultStrokeColor = color === "amber" ? "#FBBF24" : color === "cyan" ? "#06B6D4" : color === "rose" ? "#F43F5E" : color === "purple" ? "#A855F7" : "#CCFD01";
  const defaultGlowRgba = color === "amber" ? "rgba(251, 191, 36, 0.9)" : color === "cyan" ? "rgba(6, 182, 212, 0.9)" : color === "rose" ? "rgba(244, 63, 94, 0.9)" : color === "purple" ? "rgba(168, 85, 247, 0.9)" : "rgba(204, 253, 1, 0.9)";
  
  const strokeColor = customHex || defaultStrokeColor;
  const glowRgba = customGlow || defaultGlowRgba;
  const safeId = (customHex || color).replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `cyber-fork-grad-${safeId}-${height}`;

  // High-precision dimensions aligned to card centers
  const w = 56;
  const h = isTall ? 376 : 176;
  const y1 = isTall ? 88 : 42;
  const y2 = isTall ? 288 : 134;
  const midY = isTall ? 188 : 88;
  const splitX = 22;
  const joinX = 36;

  // Path 1 (Top branch to mid)
  const pathTop = `M 0,${y1} L ${splitX},${y1} Q ${joinX},${y1} ${joinX},${midY}`;
  // Path 2 (Bottom branch to mid)
  const pathBottom = `M 0,${y2} L ${splitX},${y2} Q ${joinX},${y2} ${joinX},${midY}`;
  // Path 3 (Stem to next node)
  const pathStem = `M ${joinX},${midY} L ${w},${midY}`;
  const fullRail = `${pathTop} ${pathBottom} ${pathStem}`;

  return (
    <div className={cn("relative shrink-0 pointer-events-none flex items-center justify-center", isTall ? "w-12 sm:w-14 h-[376px]" : "w-10 sm:w-14 h-[176px]", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
            <stop offset="70%" stopColor={strokeColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </linearGradient>
          <filter id={`glow-${gradientId}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path d={fullRail} stroke={strokeColor} strokeWidth="6" strokeOpacity="0.15" strokeLinecap="round" filter={`url(#glow-${gradientId})`} />
        <path d={fullRail} stroke={`url(#${gradientId})`} strokeWidth="1.75" strokeLinecap="round" />

        <path
          d={fullRail}
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 10"
          className="animate-energy-flow"
          opacity="0.9"
          style={{ filter: `drop-shadow(0 0 4px ${glowRgba})` }}
        />

        <g transform={`translate(0, ${y1})`}>
          <circle cx="0" cy="0" r="4" fill={strokeColor} opacity="0.35" />
          <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" stroke={strokeColor} strokeWidth="1" />
        </g>
        <g transform={`translate(0, ${y2})`}>
          <circle cx="0" cy="0" r="4" fill={strokeColor} opacity="0.35" />
          <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" stroke={strokeColor} strokeWidth="1" />
        </g>

        <g transform={`translate(${joinX}, ${midY})`}>
          <circle cx="0" cy="0" r="8" stroke={strokeColor} strokeWidth="1" strokeOpacity="0.6" className="animate-ping" />
          <line x1="-7" y1="0" x2="-4" y2="0" stroke={strokeColor} strokeWidth="1" />
          <line x1="4" y1="0" x2="7" y2="0" stroke={strokeColor} strokeWidth="1" />
          <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#070B12" stroke={strokeColor} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 6px ${glowRgba})` }} />
          <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>

        <g transform={`translate(${w - 2}, ${midY})`}>
          <circle cx="0" cy="0" r="3" fill="#FFFFFF" style={{ filter: `drop-shadow(0 0 8px ${glowRgba})` }} className="animate-pulse" />
          <path d="M -5,-3 L -1,0 L -5,3" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
};

export const BracketConnectorFork = CyberConnectorFork;

export const BracketConnectorStraight = ({ 
  color = "primary", 
  customHex, 
  customGlow 
}: { 
  color?: "primary" | "amber" | "cyan" | "rose" | "purple";
  customHex?: string;
  customGlow?: string;
}) => {
  const defaultStrokeColor = color === "amber" ? "#FBBF24" : color === "cyan" ? "#06B6D4" : color === "rose" ? "#F43F5E" : color === "purple" ? "#A855F7" : "#CCFD01";
  const strokeColor = customHex || defaultStrokeColor;
  const glowShadow = customGlow ? `0 0 10px ${customGlow}` : `0 0 10px ${strokeColor}`;

  return (
    <div className="w-8 sm:w-12 h-full flex items-center relative justify-center shrink-0 pointer-events-none">
      <div 
        className="w-full h-[2px] relative"
        style={{
          background: `linear-gradient(to right, ${strokeColor}66, ${strokeColor}, ${strokeColor}66)`,
          boxShadow: glowShadow
        }}
      >
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full" 
          style={{ backgroundColor: strokeColor, boxShadow: glowShadow }} 
        />
      </div>
    </div>
  );
};
