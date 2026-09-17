/** The same Garfield mark in the school and student navigation. */
export default function SchoolLogo({ size = 42 }) {
  return (
    <img
      className="school-logo"
      src="/gg-emblem.svg"
      alt="James A. Garfield"
      width={size}
      height={size}
    />
  );
}
