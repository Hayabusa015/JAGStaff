import { useId } from 'react';

const channels = [
  'M-20 204 H490 Q510 204 524 218 L562 256 Q576 270 596 270 H650',
  'M-20 298 H447 Q467 298 481 312 L519 350 Q533 364 553 364 H628',
  'M-20 392 H400 Q420 392 434 406 L472 444 Q486 458 506 458 H595',
  'M1620 204 H1110 Q1090 204 1076 218 L1038 256 Q1024 270 1004 270 H950',
  'M1620 298 H1153 Q1133 298 1119 312 L1081 350 Q1067 364 1047 364 H972',
  'M1620 392 H1200 Q1180 392 1166 406 L1128 444 Q1114 458 1094 458 H1005',
];

export default function KioskBackdrop() {
  const crestId = useId().replace(/:/g, "");
  const edgeId = `${crestId}-edge`;
  return (
    <div className="kiosk-atmosphere" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="none" focusable="false">
        {channels.map((d, index) => (
          <g key={d}>
            <path className="kiosk-groove-shadow" d={d} />
            <path className="kiosk-groove-edge" d={d} transform="translate(0 1.5)" />
            <path className={`kiosk-groove-light kiosk-groove-light-${index}`} d={d} pathLength="1000"
              style={{ animationDuration: `${[13, 19, 16, 23, 15, 21][index]}s`, animationDelay: `${[-3, -11, -6, -17, -9, -2][index]}s` }} />
          </g>
        ))}
      </svg>
      <svg className="kiosk-engraving" viewBox="0 0 912 1184" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Use the artwork only as an edge stencil: none of its colors or background are painted. */}
          <filter id={edgeId} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .2126 .7152 .0722 0 0" result="height" />
            <feMorphology in="height" operator="erode" radius="1.6" result="inset" />
            <feComposite in="height" in2="inset" operator="out" />
          </filter>
          <mask id={crestId} maskUnits="userSpaceOnUse" x="0" y="0" width="912" height="1184" style={{ maskType: 'alpha' }}>
            <image href="/logo.png" width="912" height="1184" filter={`url(#${edgeId})`} />

          </mask>
        </defs>
        <g mask={`url(#${crestId})`}>
          <rect width="912" height="1184" fill="#060708" />
          <ellipse className="kiosk-crest-light kiosk-crest-light-a" cx="220" cy="360" rx="210" ry="330" fill="#f0ca79" />
          <ellipse className="kiosk-crest-light kiosk-crest-light-b" cx="690" cy="760" rx="170" ry="280" fill="#d4c8ad" />
        </g>
      </svg>
    </div>
  );
}
