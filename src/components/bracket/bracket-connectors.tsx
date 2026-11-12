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
  const gradientId = `ti-fork-grad-${safeId}-${height}`;

  // High-precision dimensions aligned to card centers
  const w = 56;
  const h = isTall ? 376 : 176;
  const y1 = isTall ? 88 : 42;
  const y2 = isTall ? 288 : 134;
  const midY = isTall ? 188 : 88;
  const splitX = 18;
  const joinX = 34;

  // Sharp Angular Elbow Paths (TI Filigree Chamfered Geometry)
  const pathTop = `M 0,${y1} L ${splitX},${y1} L ${joinX},${midY}`;
  const pathBottom = `M 0,${y2} L ${splitX},${y2} L ${joinX},${midY}`;
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
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.5" />
            <stop offset="60%" stopColor={strokeColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FDE047" stopOpacity="1" />
          </linearGradient>
          <filter id={`glow-${gradientId}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Glow Aura */}
        <path d={fullRail} stroke={strokeColor} strokeWidth="6" strokeOpacity="0.2" strokeLinecap="square" filter={`url(#glow-${gradientId})`} />
        
        {/* Base Solid Rail in Season Palette */}
        <path d={fullRail} stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="square" />

        {/* Dynamic Energy Flow in Aegis Gold */}
        <path
          d={fullRail}
          stroke="#FDE047"
          strokeWidth="2"
          strokeLinecap="square"
          strokeDasharray="6 8"
          className="animate-energy-flow"
          opacity="0.95"
          style={{ filter: `drop-shadow(0 0 5px ${glowRgba}) drop-shadow(0 0 8px #FBBF24)` }}
        />

        {/* Top Branch Anchor Diamond (Aegis Gold) */}
        <g transform={`translate(0, ${y1})`}>
          <rect x="-3" y="-3" width="6" height="6" transform="rotate(45)" fill="#0B0912" stroke="#FBBF24" strokeWidth="1.2" />
          <rect x="-1.5" y="-1.5" width="3" height="3" transform="rotate(45)" fill="#FDE047" />
        </g>

        {/* Bottom Branch Anchor Diamond (Aegis Gold) */}
        <g transform={`translate(0, ${y2})`}>
          <rect x="-3" y="-3" width="6" height="6" transform="rotate(45)" fill="#0B0912" stroke="#FBBF24" strokeWidth="1.2" />
          <rect x="-1.5" y="-1.5" width="3" height="3" transform="rotate(45)" fill="#FDE047" />
        </g>

        {/* Center Aegis Relic Gem Node at Convergence */}
        <g transform={`translate(${joinX}, ${midY})`}>
          {/* Subtle Ping Ring */}
          <circle cx="0" cy="0" r="9" stroke="#FBBF24" strokeWidth="1" strokeOpacity="0.4" className="animate-ping" />
          
          {/* Outer Gold Diamond Relic */}
          <rect
            x="-6"
            y="-6"
            width="12"
            height="12"
            transform="rotate(45)"
            fill="#090712"
            stroke="#FBBF24"
            strokeWidth="1.8"
            style={{ filter: `drop-shadow(0 0 8px ${glowRgba}) drop-shadow(0 0 4px #FBBF24)` }}
          />

          {/* Inner Season Gem Inset */}
          <rect
            x="-3"
            y="-3"
            width="6"
            height="6"
            transform="rotate(45)"
            fill={strokeColor}
            stroke="#FDE047"
            strokeWidth="0.8"
          />
        </g>

        {/* Stem End Tip Node (Next Stage Entry) */}
        <g transform={`translate(${w - 2}, ${midY})`}>
          <rect x="-2.5" y="-2.5" width="5" height="5" transform="rotate(45)" fill="#FDE047" style={{ filter: `drop-shadow(0 0 6px #FBBF24)` }} className="animate-pulse" />
          <path d="M -5,-3.5 L 0,0 L -5,3.5" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="square" fill="none" />
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
          background: `linear-gradient(to right, ${strokeColor}66, #FBBF24, ${strokeColor}66)`,
          boxShadow: glowShadow
        }}
      >
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border" 
          style={{
            backgroundColor: strokeColor,
            borderColor: '#FBBF24',
            boxShadow: `0 0 8px #FBBF24, ${glowShadow}`
          }} 
        />
      </div>
    </div>
  );
};
