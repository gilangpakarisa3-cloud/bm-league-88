import React, { useId } from 'react';

/**
 * Authentic 1:1 Traced UEFA Champions League Starball Path
 * ViewBox: 0 0 166 160 (Spherical Center at X=83, Y=81)
 */
export const AUTHENTIC_STARBALL_PATH =
  'M90.8,4.1L96.0,4.0L96.8,4.6L87.3,9.6L85.7,11.4L86.4,12.2L94.2,14.4L102.4,18.0L110.0,19.4L117.2,21.4L127.0,25.6L127.8,25.5L128.6,24.0L129.0,19.0L129.4,18.7L130.1,18.9L135.2,25.1L140.3,33.7L144.9,38.1L149.1,42.9L152.9,48.5L155.0,52.7L154.4,53.3L153.3,52.3L151.2,51.4L146.6,50.0L146.0,50.4L148.0,63.0L148.3,70.3L147.6,72.2L145.9,68.5L138.9,56.8L135.1,51.3L133.2,49.5L129.3,49.3L127.3,50.0L123.7,50.0L121.0,51.0L117.4,51.4L116.3,52.0L112.1,52.5L108.4,55.8L104.6,60.3L97.3,69.9L96.4,71.7L94.1,74.1L94.0,76.0L95.1,77.9L103.1,86.9L112.6,96.4L114.0,97.0L121.0,97.4L123.3,98.0L133.3,98.0L136.9,96.9L137.9,95.9L140.5,89.5L142.9,84.9L146.1,76.1L147.7,73.7L148.6,75.0L150.3,93.4L150.9,93.5L153.6,92.2L157.5,89.2L158.6,87.9L159.2,87.8L159.3,88.7L157.9,94.2L155.6,100.2L152.6,105.6L151.4,106.4L149.8,109.8L148.6,117.0L146.5,123.5L145.6,125.3L145.0,125.6L144.3,125.3L141.7,122.3L139.9,120.8L138.4,120.4L126.2,126.9L121.8,128.1L120.3,129.0L118.6,129.2L119.4,126.4L121.9,123.6L125.1,118.1L126.6,116.6L127.9,113.9L127.7,112.9L122.1,107.9L111.9,97.8L86.0,91.0L83.1,91.1L80.1,95.1L78.3,98.7L77.4,99.4L71.1,111.1L69.4,117.0L67.0,129.7L67.2,135.8L68.5,136.5L70.1,137.9L77.4,141.6L82.8,143.9L88.0,145.0L103.0,145.0L104.4,144.4L111.3,137.9L113.3,134.9L115.6,132.6L116.9,129.9L118.0,129.4L118.3,130.0L118.0,139.7L117.4,142.0L118.1,142.9L120.0,143.0L124.7,141.0L126.2,140.9L134.5,137.2L134.5,137.8L133.6,138.3L131.7,140.4L120.5,147.9L112.5,151.9L111.0,152.0L106.3,154.0L99.0,156.0L87.3,157.6L86.0,157.3L86.5,156.1L90.6,154.6L93.5,152.8L93.6,152.0L92.9,151.1L83.3,145.0L67.1,145.1L66.7,146.3L67.0,151.0L68.6,155.6L68.0,156.0L63.4,154.3L57.3,150.4L53.3,146.7L50.9,143.8L42.0,141.6L33.8,138.6L31.9,137.1L29.1,135.9L26.9,134.1L26.7,133.4L27.0,133.0L34.7,133.0L39.2,131.9L40.8,130.8L40.9,129.1L36.1,120.2L32.8,112.5L20.6,103.4L19.4,103.0L18.3,103.7L16.1,108.1L14.3,113.7L13.8,114.5L13.2,114.5L11.0,108.0L10.0,102.3L10.0,94.0L7.3,89.7L5.4,85.0L8.3,82.3L12.2,80.2L16.1,70.1L19.3,63.7L20.4,62.8L21.0,63.7L21.0,68.7L22.0,76.3L22.6,77.4L23.3,77.7L31.0,76.6L32.7,76.0L43.3,75.0L54.8,70.1L56.2,69.9L59.5,68.1L61.2,67.9L64.7,66.1L66.4,48.7L68.0,42.0L68.0,39.4L65.4,36.6L59.4,27.9L58.7,26.3L57.3,25.0L53.4,25.4L47.1,27.5L44.5,28.9L42.8,29.1L39.2,30.9L38.5,30.8L38.4,30.4L44.3,24.3L52.9,17.2L52.6,15.1L49.1,10.9L49.6,9.9L58.3,8.7L69.0,9.0L73.7,7.0L75.3,7.0L78.0,6.0L80.0,6.0L82.7,5.0L86.0,5.0ZM94.0,18.7L79.0,20.0L77.6,20.6L75.8,22.5L73.4,26.8L70.0,37.4L70.0,40.3L75.1,49.9L81.8,59.5L83.6,59.6L95.0,56.0L103.4,53.4L106.2,52.9L107.7,52.0L110.1,51.7L116.7,45.1L122.5,37.2L122.7,36.3L121.9,34.8L114.1,27.3L108.1,22.3L106.9,21.7L104.2,19.1ZM31.7,21.5L31.9,22.9L28.4,28.8L27.5,32.5L28.0,32.9L30.7,32.0L34.0,32.0L36.3,31.3L37.2,31.6L23.8,43.1L22.0,48.4L21.0,55.3L21.0,61.3L20.6,62.1L19.1,61.2L16.0,55.3L15.4,53.9L14.2,53.8L12.3,55.9L11.6,57.6L10.4,58.4L9.9,59.9L7.1,63.5L7.0,61.4L10.1,51.1L15.1,41.1L19.6,34.3L22.8,30.1ZM42.0,77.0L33.3,84.3L26.9,90.9L26.0,92.4L26.0,94.3L28.5,101.9L33.2,111.8L39.3,117.4L48.1,123.9L51.4,126.0L53.1,125.4L62.7,118.4L69.0,112.0L68.0,105.0L67.0,102.3L67.0,98.7L66.0,94.3L66.0,90.3L65.3,86.0L64.2,84.5L53.1,80.9L43.9,77.1Z';

export interface UclIconProps extends React.SVGProps<SVGSVGElement> {
  showCore88?: boolean;
  starFill?: string;
  accentFill?: string;
  size?: number | string;
}

/**
 * Authentic 1:1 UEFA Champions League 8-Starball Icon
 */
export function UclStarballIcon({
  showCore88 = false,
  starFill = 'currentColor',
  accentFill = '#FBBF24',
  size = 24,
  className,
  ...props
}: UclIconProps) {
  return (
    <svg
      viewBox="0 0 166 160"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path d={AUTHENTIC_STARBALL_PATH} fill={starFill} fillRule="evenodd" />
      {showCore88 && (
        <g>
          <circle cx="81" cy="74" r="12.5" fill="#070B19" stroke={accentFill} strokeWidth="1.5" />
          <text
            x="81"
            y="78.5"
            textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontWeight="900"
            fontSize="12.5"
            fill={accentFill}
          >
            88
          </text>
        </g>
      )}
    </svg>
  );
}

export interface BmLeagueUclCrestProps extends React.SVGProps<SVGSVGElement> {
  arcText?: string;
  line1?: string;
  line2?: string;
  mainColor?: string;
  goldColor?: string;
  showCore88?: boolean;
}

/**
 * Official BM League 88 UEFA Champions League Crest (Varian 3)
 * Structure:
 * - Upper: 1:1 Authentic UEFA 8-Starball Ball
 * - Concentric Arched Banner: PES 2021 (with zero line clipping)
 * - Line 1: BM CHAMPIONS
 * - Line 2: LEAGUE 88®
 */
export function BmLeagueUclCrest({
  arcText = 'PES 2021',
  line1 = 'BM CHAMPIONS',
  line2 = 'LEAGUE 88',
  mainColor = 'currentColor',
  goldColor = '#FBBF24',
  showCore88 = false,
  className,
  ...props
}: BmLeagueUclCrestProps) {
  const id = useId().replace(/:/g, '');
  const pathId = `uclArcPath-${id}`;

  return (
    <svg
      viewBox="0 0 360 335"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        {/* Concentric Circular Arc centered at (180, 265) with Radius 63 (Peak at Y=202) */}
        <path id={pathId} d="M 124 236 A 63 63 0 0 1 236 236" fill="none" />
      </defs>

      {/* 1. Authentic 1:1 Starball */}
      <g transform="translate(97, 8)">
        <path d={AUTHENTIC_STARBALL_PATH} fill={mainColor} fillRule="evenodd" />
        {showCore88 && (
          <g>
            <circle cx="81" cy="74" r="12.5" fill="#070B19" stroke={goldColor} strokeWidth="1.5" />
            <text
              x="81"
              y="78.5"
              textAnchor="middle"
              fontFamily="Georgia, 'Times New Roman', serif"
              fontWeight="900"
              fontSize="12.5"
              fill={goldColor}
            >
              88
            </text>
          </g>
        )}
      </g>

      {/* 2. Concentric UEFA Arched Banner (PES 2021) */}
      <g>
        {/* Outer Arch (Radius 86, Peak at Y=179) */}
        <path
          d="M 110 215 A 86 86 0 0 1 250 215"
          fill="none"
          stroke={mainColor}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        {/* Inner Arch (Radius 53, Peak at Y=212) */}
        <path
          d="M 137 234 A 53 53 0 0 1 223 234"
          fill="none"
          stroke={mainColor}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        {/* Concentric Text (Baseline Y=202, 10px clear from both lines) */}
        <text
          fill={mainColor}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="14"
          letterSpacing="2.2"
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {arcText}
          </textPath>
        </text>
      </g>

      {/* 3. Monumental Serif Wordmark (BM CHAMPIONS / LEAGUE 88®) */}
      <g fill={mainColor}>
        <text
          x="180"
          y="274"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="900"
          fontSize="33"
          letterSpacing="2.5"
        >
          {line1}
        </text>
        <text
          x="180"
          y="318"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="900"
          fontSize="37"
          letterSpacing="3.5"
        >
          {line2}
        </text>
        {/* Registered Trademark ® */}
        <text
          x="315"
          y="299"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          fontWeight="700"
          fontSize="11.5"
        >
          ®
        </text>
      </g>
    </svg>
  );
}

export interface UclBigEarsTrophyProps extends React.SVGProps<SVGSVGElement> {
  glowColor?: string;
  size?: number | string;
}

/**
 * Authentic 1:1 UEFA Champions League "Big Ears" Trophy Component for Grand Final
 */
export function UclBigEarsTrophy({
  glowColor = '#FBBF24',
  size = 120,
  className,
  ...props
}: UclBigEarsTrophyProps) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      viewBox="16 2 228 326"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id={`cupSilver-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="22%" stopColor="#F8FAFC" />
          <stop offset="48%" stopColor="#94A3B8" />
          <stop offset="78%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        <linearGradient id={`cupGold-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        <linearGradient id={`cupInterior-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        <radialGradient id={`trophyAura-${id}`} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={glowColor} stopOpacity="0.4" />
          <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Clip path for trophy body so engravings never bleed outside the chalice */}
        <clipPath id={`chaliceClip-${id}`}>
          <path d="M 74 114 L 186 114 C 182 182, 162 226, 147 254 L 113 254 C 98 226, 78 182, 74 114 Z" />
        </clipPath>

        {/* Concentric curved text path for PES 2021 on Trophy Chest */}
        <path id={`trophyChestArc-${id}`} d="M 96 177 A 40 40 0 0 1 164 177" fill="none" />
      </defs>

      {/* Radiant Championship Halo */}
      <circle cx="130" cy="160" r="122" fill={`url(#trophyAura-${id})`} />

      {/* Floating 1:1 Authentic Starball Crown at Top */}
      <g transform="translate(87, 10) scale(0.52)">
        <path d={AUTHENTIC_STARBALL_PATH} fill={`url(#cupGold-${id})`} fillRule="evenodd" />
        <circle cx="81" cy="74" r="13" fill="#090D1A" stroke="#FEF08A" strokeWidth="2" />
        <text
          x="81"
          y="79"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontWeight="900"
          fontSize="13.5"
          fill="#FEF08A"
        >
          88
        </text>
      </g>

      {/* Iconic UEFA "Big Ears" Handles */}
      <path
        d="M 79 124 C 66 86, 26 92, 32 148 C 36 188, 66 208, 92 214"
        fill="none"
        stroke={`url(#cupSilver-${id})`}
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M 79 124 C 66 86, 26 92, 32 148 C 36 188, 66 208, 92 214"
        fill="none"
        stroke={`url(#cupGold-${id})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />

      <path
        d="M 181 124 C 194 86, 234 92, 228 148 C 224 188, 194 208, 168 214"
        fill="none"
        stroke={`url(#cupSilver-${id})`}
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M 181 124 C 194 86, 234 92, 228 148 C 224 188, 194 208, 168 214"
        fill="none"
        stroke={`url(#cupGold-${id})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Main Silver Chalice Body */}
      <path
        d="M 74 114 L 186 114 C 182 182, 162 226, 147 254 L 113 254 C 98 226, 78 182, 74 114 Z"
        fill={`url(#cupSilver-${id})`}
        stroke={`url(#cupGold-${id})`}
        strokeWidth="2.2"
      />

      {/* Chalice Specular Highlight & Engravings (Clipped cleanly inside chalice) */}
      <g clipPath={`url(#chaliceClip-${id})`}>
        <rect x="114" y="114" width="18" height="140" fill="#FFFFFF" opacity="0.28" />
        {/* Outer Engraved Arch (Radius 53, Peak at Y=145) */}
        <path
          d="M 90 163 A 53 53 0 0 1 170 163"
          fill="none"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.72"
        />
        {/* Inner Engraved Arch (Radius 33, Peak at Y=165) */}
        <path
          d="M 104 178 A 33 33 0 0 1 156 178"
          fill="none"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.72"
        />
        {/* Curved Engraved PES 2021 (Between arches, zero collision) */}
        <text
          fill="#0F172A"
          fontFamily="system-ui, sans-serif"
          fontWeight="800"
          fontSize="7.8"
          letterSpacing="1.4"
        >
          <textPath href={`#trophyChestArc-${id}`} startOffset="50%" textAnchor="middle">
            PES 2021
          </textPath>
        </text>
        {/* Engraved BM & LEAGUE 88 */}
        <text
          x="130"
          y="187"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontWeight="900"
          fontSize="16"
          fill="#0F172A"
          letterSpacing="2"
        >
          BM
        </text>
        <text
          x="130"
          y="203"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontWeight="900"
          fontSize="10.2"
          fill="#78350F"
          letterSpacing="1.2"
        >
          LEAGUE 88
        </text>
      </g>

      {/* Top Rim of the Chalice */}
      <ellipse
        cx="130"
        cy="114"
        rx="56"
        ry="9.5"
        fill={`url(#cupInterior-${id})`}
        stroke={`url(#cupGold-${id})`}
        strokeWidth="2.8"
      />

      {/* Neck Collar & Flared Silver Base */}
      <rect x="112" y="254" width="36" height="14" rx="3" fill={`url(#cupGold-${id})`} />
      <path
        d="M 94 268 L 166 268 L 182 298 L 78 298 Z"
        fill={`url(#cupSilver-${id})`}
        stroke={`url(#cupGold-${id})`}
        strokeWidth="2"
      />

      {/* Championship Pedestal Plaque */}
      <rect
        x="62"
        y="298"
        width="136"
        height="24"
        rx="6"
        fill="#090D1A"
        stroke={`url(#cupGold-${id})`}
        strokeWidth="2.5"
      />
      <text
        x="130"
        y="313.5"
        textAnchor="middle"
        fontFamily="'Rajdhani', sans-serif"
        fontWeight="700"
        fontSize="9.5"
        fill="#FBBF24"
        letterSpacing="1.6"
      >
        GRAND FINAL CHAMPION
      </text>
    </svg>
  );
}
