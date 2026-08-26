// ─── Shared hall pass iconography ──────────────────────────────────────────
// Line icons on a 24-grid, used by the kiosk, the staff manager page, and the
// student self-service page — kept in one place so all three read as the
// same product instead of drifting into emoji vs. SVG vs. different styles.
export function Ico({ d, size = 24, stroke = 1.6, fill = "none", children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children || <path d={d} />}
    </svg>
  );
}

const DEST_ICON = {
  Bathroom:  (p) => <Ico {...p}><path d="M4 21V6a2 2 0 0 1 2-2h5v17"/><path d="M11 21h9V9a2 2 0 0 0-2-2h-7"/><circle cx="8" cy="13" r="1"/></Ico>,
  Water:     (p) => <Ico {...p}><path d="M12 2.7s6 6.2 6 10.3a6 6 0 0 1-12 0C6 8.9 12 2.7 12 2.7Z"/></Ico>,
  Office:    (p) => <Ico {...p}><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M15 9h2a2 2 0 0 1 2 2v10"/><path d="M9 7h2M9 11h2M9 15h2"/></Ico>,
  Nurse:     (p) => <Ico {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M12 11v5M9.5 13.5h5"/></Ico>,
  Counselor: (p) => <Ico {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.8 9.8 0 0 1-2.9-.5L3 21l1.6-4.6A8.2 8.2 0 0 1 3.6 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.4 8.4Z"/></Ico>,
  Library:   (p) => <Ico {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></Ico>,
  Locker:    (p) => <Ico {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></Ico>,
};

export const DestIcon = ({ dest, size = 24 }) => {
  const C = DEST_ICON[dest];
  return C ? <C size={size} /> : <Ico size={size}><circle cx="12" cy="10" r="3"/><path d="M12 21s-7-5.7-7-11a7 7 0 1 1 14 0c0 5.3-7 11-7 11Z"/></Ico>;
};

export const IconSearch = (p) => <Ico {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Ico>;
export const IconLock   = (p) => <Ico {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></Ico>;
export const IconWalk   = (p) => <Ico {...p}><circle cx="13" cy="4" r="1.6"/><path d="m11 21 1.5-5.5L9 13l1-5 3 2 3 1"/><path d="m10 8-2.5 3M12.5 15.5 15 21"/></Ico>;
export const IconSwap   = (p) => <Ico {...p}><path d="M8 3 4 7l4 4"/><path d="M4 7h12a4 4 0 0 1 4 4v1"/><path d="m16 21 4-4-4-4"/><path d="M20 17H8a4 4 0 0 1-4-4v-1"/></Ico>;
export const IconBack   = (p) => <Ico {...p}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></Ico>;
export const IconReturn = (p) => <Ico {...p}><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/></Ico>;
export const IconCheck  = (p) => <Ico {...p}><path d="m5 13 4 4L19 7"/></Ico>;
export const IconAlert  = (p) => <Ico {...p}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></Ico>;
export const IconClock  = (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ico>;
export const IconSend   = (p) => <Ico {...p}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></Ico>;
