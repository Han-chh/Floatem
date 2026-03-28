import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function BaseIcon({ size = 18, className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function NotebookPenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M8 2v4" />
      <path d="M12 2v4" />
      <path d="M16 2v4" />
      <path d="m9 14 5.5-5.5a1.4 1.4 0 0 1 2 2L11 16l-3 1Z" />
    </BaseIcon>
  );
}

export function CircleCheckBigIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.4 2.4L15.8 9.5" />
    </BaseIcon>
  );
}

export function SlidersHorizontalIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16" />
      <path d="M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="17" r="2" />
    </BaseIcon>
  );
}

export function SquarePenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m10 14 6-6" />
      <path d="m9 15-1 3 3-1" />
    </BaseIcon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 1.1 3.3L16.5 7l-3.4.8L12 11l-1.1-3.2L7.5 7l3.4-.7Z" />
      <path d="m18 13 .7 2.1L21 16l-2.3.7L18 19l-.7-2.3L15 16l2.3-.9Z" />
      <path d="m6 13 .8 2.2L9 16l-2.2.8L6 19l-.8-2.2L3 16l2.2-.8Z" />
    </BaseIcon>
  );
}

export function GripVerticalIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="7" r="1" />
      <circle cx="15" cy="7" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="17" r="1" />
      <circle cx="15" cy="17" r="1" />
    </BaseIcon>
  );
}

export function ChevronsUpDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m8 9 4-4 4 4" />
      <path d="m16 15-4 4-4-4" />
    </BaseIcon>
  );
}

export function Trash2Icon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M8 10v7" />
      <path d="M12 10v7" />
      <path d="M16 10v7" />
      <path d="M6 6l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
    </BaseIcon>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4a8 8 0 1 0 0 16h1.2a2.3 2.3 0 0 0 0-4.6h-.7A1.5 1.5 0 0 1 11 14v-.5A2.5 2.5 0 0 1 13.5 11H16a4 4 0 0 0 0-8Z" />
      <circle cx="7.5" cy="10" r="1" />
      <circle cx="9.5" cy="7.5" r="1" />
      <circle cx="13" cy="7" r="1" />
    </BaseIcon>
  );
}

export function PaintbrushIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 4 7 11" />
      <path d="m15.5 2.5 6 6" />
      <path d="m13 3 8 8" />
      <path d="M6 12c-2.2 0-4 1.8-4 4 0 1.7 1.3 3 3 3 2.2 0 4-1.8 4-4v-2H6Z" />
    </BaseIcon>
  );
}

export function ImagePlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 15-4.5-4.5L8 19" />
      <path d="M19 3v4" />
      <path d="M17 5h4" />
    </BaseIcon>
  );
}

export function BoldIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 5h6a3 3 0 1 1 0 6H7Z" />
      <path d="M7 11h7a3.5 3.5 0 1 1 0 7H7Z" />
    </BaseIcon>
  );
}

export function ItalicIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10 4h8" />
      <path d="M6 20h8" />
      <path d="M14 4 10 20" />
    </BaseIcon>
  );
}

export function UnderlineIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4v7a4 4 0 0 0 8 0V4" />
      <path d="M6 20h12" />
    </BaseIcon>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01" />
      <path d="M10 10h.01" />
      <path d="M13 10h.01" />
      <path d="M16 10h.01" />
      <path d="M7 14h10" />
    </BaseIcon>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </BaseIcon>
  );
}
