import { useState } from 'react';

// Time still comes from the kiosk's existing server-corrected clock. Each
// digit animates only when its value changes, with no additional timer.
function ClockDigit({ value, paused }) {
  const [frame, setFrame] = useState({ value, previous: value, revision: 0 });
  if (frame.value !== value || (paused && frame.revision !== 0)) {
    setFrame({ value, previous: frame.value, revision: paused ? 0 : frame.revision + 1 });
  }
  return (
    <span className="metal-digit">
      <span className="metal-digit-rest">{value}</span>
      {frame.revision > 0 && !paused && (
        <span className="metal-digit-transition" key={frame.revision}>
          <span className="metal-half metal-old-bottom"><span>{frame.previous}</span></span>
          <span className="metal-half metal-flip-top"><span>{frame.previous}</span></span>
          <span className="metal-half metal-flip-bottom"><span>{value}</span></span>
        </span>
      )}
    </span>
  );
}

export default function KioskClock({ time, paused = false }) {
  const [digits, meridiem] = time.split(/\s+/);
  return (
    <span className="metal-clock" role="img" aria-label={time}>
      <span className="metal-clock-digits" aria-hidden="true">
        {[...digits].map((value, index) => value === ':'
          ? <span className="metal-clock-colon" key={index}>:</span>
          : <ClockDigit key={index} value={value} paused={paused} />)}
        <span className="metal-clock-meridiem">{meridiem}</span>
      </span>
    </span>
  );
}
