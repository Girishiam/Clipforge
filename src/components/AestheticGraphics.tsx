import React from 'react';

/**
 * Aesthetic Hero Filmstrip & Timeline Graphic
 * Depicts frame-precise timeline clipping with coral calipers and electric lime range
 */
export const HeroFilmstripGraphic: React.FC<{ className?: string }> = ({ className = 'w-full max-w-2xl mx-auto h-auto' }) => {
  return (
    <svg
      viewBox="0 0 680 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Editorial video timeline clipping graphic"
    >
      {/* Outer Chassis */}
      <rect x="2" y="2" width="676" height="166" rx="8" fill="#FFFFFF" stroke="#E8E3D8" strokeWidth="1.5" />

      {/* Top Film Sprocket Track */}
      <rect x="16" y="10" width="648" height="18" rx="3" fill="#F1EFE8" />
      {[...Array(24)].map((_, i) => (
        <rect
          key={`sprocket-top-${i}`}
          x={28 + i * 27}
          y="14"
          width="12"
          height="10"
          rx="2"
          fill="#FAF8F2"
          stroke="#E8E3D8"
          strokeWidth="1"
        />
      ))}

      {/* Bottom Film Sprocket Track */}
      <rect x="16" y="142" width="648" height="18" rx="3" fill="#F1EFE8" />
      {[...Array(24)].map((_, i) => (
        <rect
          key={`sprocket-bottom-${i}`}
          x={28 + i * 27}
          y="146"
          width="12"
          height="10"
          rx="2"
          fill="#FAF8F2"
          stroke="#E8E3D8"
          strokeWidth="1"
        />
      ))}

      {/* Film Video Frames Container */}
      <g transform="translate(16, 34)">
        {/* Frame 1: Before In-Point (Muted) */}
        <rect x="0" y="0" width="154" height="102" rx="4" fill="#FAF8F2" stroke="#E8E3D8" strokeWidth="1" />
        {/* Subtle Waveform Lines in Frame 1 */}
        <path d="M12 51 L30 38 L45 64 L65 32 L85 70 L105 44 L125 58 L142 51" stroke="#E8E3D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="12" y="90" fill="#6B7169" fontFamily="IBM Plex Mono, monospace" fontSize="8" fontWeight="600">00:54:12.000</text>

        {/* Frame 2 & 3: Selected Range with Electric Lime Highlight (#C9E865) */}
        <rect x="162" y="0" width="324" height="102" rx="4" fill="#C9E865" fillOpacity="0.22" stroke="#C9E865" strokeWidth="1.5" />
        
        {/* Waveform inside selected region */}
        <path d="M174 51 L195 30 L215 72 L240 24 L270 78 L300 28 L330 74 L360 32 L390 70 L420 34 L450 68 L474 51" stroke="#202822" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Start Point Marker & Caliper (Coral #FE5936) */}
        <g transform="translate(162, 0)">
          <rect x="-2" y="0" width="4" height="102" fill="#FE5936" />
          <polygon points="-8,0 8,0 8,14 0,22 -8,14" fill="#FE5936" />
          <polygon points="-8,102 8,102 8,88 0,80 -8,88" fill="#FE5936" />
          <circle cx="0" cy="8" r="2.5" fill="#FFFFFF" />
          <text x="10" y="16" fill="#FE5936" fontFamily="IBM Plex Mono, monospace" fontSize="8" fontWeight="700">IN: 00:57:58.000</text>
        </g>

        {/* Active Range Center Badge */}
        <rect x="264" y="12" width="120" height="22" rx="4" fill="#202822" />
        <circle cx="276" cy="23" r="4" fill="#C9E865" />
        <text x="286" y="26.5" fill="#FAF8F2" fontFamily="IBM Plex Mono, monospace" fontSize="9" fontWeight="700">
          CLIP: 00:04:00.000
        </text>

        {/* End Point Marker & Caliper (Coral #FE5936) */}
        <g transform="translate(486, 0)">
          <rect x="-2" y="0" width="4" height="102" fill="#FE5936" />
          <polygon points="-8,0 8,0 8,14 0,22 -8,14" fill="#FE5936" />
          <polygon points="-8,102 8,102 8,88 0,80 -8,88" fill="#FE5936" />
          <circle cx="0" cy="8" r="2.5" fill="#FFFFFF" />
          <text x="-98" y="16" fill="#FE5936" fontFamily="IBM Plex Mono, monospace" fontSize="8" fontWeight="700">OUT: 01:01:58.000</text>
        </g>

        {/* Frame 4: After Out-Point (Muted) */}
        <rect x="494" y="0" width="154" height="102" rx="4" fill="#FAF8F2" stroke="#E8E3D8" strokeWidth="1" />
        <path d="M506 51 L525 40 L545 62 L565 35 L585 68 L605 42 L625 56 L640 51" stroke="#E8E3D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="506" y="90" fill="#6B7169" fontFamily="IBM Plex Mono, monospace" fontSize="8" fontWeight="600">01:05:40.000</text>
      </g>

      {/* Technical Corner Crosshairs (+) */}
      <path d="M10 6 V14 M6 10 H14" stroke="#E8E3D8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M670 6 V14 M666 10 H674" stroke="#E8E3D8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 156 V164 M6 160 H14" stroke="#E8E3D8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M670 156 V164 M666 160 H674" stroke="#E8E3D8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Feature 1 Graphic: Instant Auto-Preview
 */
export const FeatureIngestGraphic: React.FC<{ className?: string }> = ({ className = 'w-full h-24' }) => {
  return (
    <svg viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="240" height="90" rx="6" fill="#FAF8F2" stroke="#E8E3D8" strokeWidth="1" />
      
      {/* Film roll / stream icon */}
      <circle cx="48" cy="45" r="26" fill="#FFFFFF" stroke="#E8E3D8" strokeWidth="1.5" />
      <circle cx="48" cy="45" r="10" fill="#202822" />
      <circle cx="48" cy="45" r="4" fill="#C9E865" />
      <circle cx="48" cy="28" r="3" fill="#E8E3D8" />
      <circle cx="65" cy="45" r="3" fill="#E8E3D8" />
      <circle cx="48" cy="62" r="3" fill="#E8E3D8" />
      <circle cx="31" cy="45" r="3" fill="#E8E3D8" />

      {/* Data stream beam to player frame */}
      <path d="M74 45 H112" stroke="#FE5936" strokeWidth="2" strokeDasharray="3 3" />
      <polygon points="112,41 118,45 112,49" fill="#FE5936" />

      {/* Mini Video Player Screen */}
      <rect x="124" y="20" width="96" height="50" rx="4" fill="#FFFFFF" stroke="#202822" strokeWidth="1.5" />
      <polygon points="166,40 178,46 166,52" fill="#FE5936" />
      <rect x="132" y="60" width="80" height="3" rx="1.5" fill="#F1EFE8" />
      <rect x="132" y="60" width="34" height="3" rx="1.5" fill="#FE5936" />
    </svg>
  );
};

/**
 * Feature 2 Graphic: Millisecond Precision Caliper
 */
export const FeaturePrecisionGraphic: React.FC<{ className?: string }> = ({ className = 'w-full h-24' }) => {
  return (
    <svg viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="240" height="90" rx="6" fill="#FAF8F2" stroke="#E8E3D8" strokeWidth="1" />

      {/* Measurement Ruler Track */}
      <rect x="20" y="24" width="200" height="42" rx="4" fill="#FFFFFF" stroke="#E8E3D8" strokeWidth="1" />
      
      {/* Millimeter Ticks */}
      {[...Array(19)].map((_, i) => (
        <line
          key={`tick-${i}`}
          x1={30 + i * 10}
          y1="24"
          x2={30 + i * 10}
          y2={i % 5 === 0 ? 36 : 30}
          stroke={i % 5 === 0 ? '#202822' : '#6B7169'}
          strokeWidth="1"
        />
      ))}

      {/* Range Highlight Box in Fresh Lime */}
      <rect x="70" y="38" width="90" height="22" rx="2" fill="#C9E865" fillOpacity="0.3" stroke="#C9E865" strokeWidth="1.5" />

      {/* Caliper Handles in Coral */}
      <path d="M70 20 V68 M66 20 H74 M66 68 H74" stroke="#FE5936" strokeWidth="2" strokeLinecap="round" />
      <path d="M160 20 V68 M156 20 H164 M156 68 H164" stroke="#FE5936" strokeWidth="2" strokeLinecap="round" />

      {/* Digital Precision Readout */}
      <rect x="86" y="42" width="58" height="14" rx="2" fill="#202822" />
      <text x="91" y="52.5" fill="#C9E865" fontFamily="IBM Plex Mono, monospace" fontSize="8" fontWeight="700">.250 ms</text>
    </svg>
  );
};

/**
 * Feature 3 Graphic: Local Browser Engine Privacy
 */
export const FeaturePrivacyGraphic: React.FC<{ className?: string }> = ({ className = 'w-full h-24' }) => {
  return (
    <svg viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="240" height="90" rx="6" fill="#FAF8F2" stroke="#E8E3D8" strokeWidth="1" />

      {/* Hardware / Browser Memory Perimeter */}
      <rect x="24" y="18" width="192" height="54" rx="5" fill="#FFFFFF" stroke="#E8E3D8" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Hardware Chip Core */}
      <rect x="52" y="30" width="46" height="30" rx="3" fill="#202822" />
      <text x="59" y="48" fill="#FAF8F2" fontFamily="IBM Plex Mono, monospace" fontSize="8" fontWeight="700">WASM</text>
      
      {/* Connection traces */}
      <path d="M98 45 H134" stroke="#3C7458" strokeWidth="2" />
      <circle cx="116" cy="45" r="3" fill="#3C7458" />

      {/* Shield Lock (Private / Local) */}
      <g transform="translate(142, 28)">
        <path d="M20 3 L6 8 V20 C6 28 20 34 20 34 C20 34 34 28 34 20 V8 L20 3 Z" fill="#3C7458" fillOpacity="0.15" stroke="#3C7458" strokeWidth="1.5" />
        <path d="M15 18 L19 22 L26 14" stroke="#3C7458" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
};

/**
 * Aesthetic Empty Shelf Graphic
 */
export const EmptyShelfGraphic: React.FC<{ className?: string }> = ({ className = 'w-36 h-24 mx-auto' }) => {
  return (
    <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Tape Cassette Silhouette */}
      <rect x="10" y="16" width="140" height="74" rx="6" fill="#FFFFFF" stroke="#E8E3D8" strokeWidth="1.5" />
      <rect x="24" y="28" width="112" height="34" rx="4" fill="#F1EFE8" stroke="#E8E3D8" strokeWidth="1" />
      
      {/* Spools */}
      <circle cx="52" cy="45" r="12" fill="#FFFFFF" stroke="#202822" strokeWidth="1.5" />
      <circle cx="52" cy="45" r="4" fill="#FE5936" />
      <circle cx="108" cy="45" r="12" fill="#FFFFFF" stroke="#202822" strokeWidth="1.5" />
      <circle cx="108" cy="45" r="4" fill="#C9E865" />

      {/* Tape Window Bridge */}
      <line x1="64" y1="45" x2="96" y2="45" stroke="#6B7169" strokeWidth="2" strokeDasharray="2 2" />

      {/* Scissor Cut Line */}
      <g transform="translate(80, 70)">
        <path d="M-6 -6 L6 6 M-6 6 L6 -6" stroke="#FE5936" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="-8" cy="-8" r="2.5" stroke="#FE5936" strokeWidth="1" />
        <circle cx="-8" cy="8" r="2.5" stroke="#FE5936" strokeWidth="1" />
      </g>
    </svg>
  );
};
