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

export function CheckSquareIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8.5 12 2.4 2.4 4.6-5" />
    </BaseIcon>
  );
}

export function ListChecksIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="4" height="4" rx="1" />
      <path d="M11 7h9" />
      <rect x="4" y="11" width="4" height="4" rx="1" />
      <path d="M11 13h9" />
      <path d="m5.4 13 1.1 1.1L8.6 12" />
      <rect x="4" y="17" width="4" height="3" rx="1" />
      <path d="M11 18.5h9" />
    </BaseIcon>
  );
}

export function SquareIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4.75" y="4.75" width="14.5" height="14.5" rx="2.5" />
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

export function GroupFilterIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 6h16" />
      <path d="M7 11h10" />
      <path d="M10.5 16h3" />
      <path d="M10.5 16v4l3-1.8V16" />
    </BaseIcon>
  );
}

export function GroupPlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="7" height="6" rx="1.5" />
      <rect x="13" y="5" width="7" height="6" rx="1.5" />
      <rect x="4" y="13" width="7" height="6" rx="1.5" />
      <path d="M16.5 13.5v5" />
      <path d="M14 16h5" />
    </BaseIcon>
  );
}

export function CircleHelpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9.3a2.4 2.4 0 0 1 4.6.9c0 1.6-2.1 2-2.1 3.5" />
      <path d="M12 17h.01" />
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

export function ChevronUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 15 6-6 6 6" />
    </BaseIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m15 6-6 6 6 6" />
    </BaseIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 6 6 6-6 6" />
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

export function EraserIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m7 16 7.5-7.5 3 3L10 19H7v-3Z" />
      <path d="m13.5 9.5 2-2a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2l-2 2" />
      <path d="M4 20h8" />
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

export function FilledPaletteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4a8 8 0 1 0 0 16h1.2a2.3 2.3 0 0 0 0-4.6h-.7A1.5 1.5 0 0 1 11 14v-.5A2.5 2.5 0 0 1 13.5 11H16a4 4 0 0 0 0-8Z" />
      <circle cx="7.5" cy="10" r="1.45" fill="#FF7A59" stroke="none" />
      <circle cx="9.5" cy="7.5" r="1.45" fill="#F4B942" stroke="none" />
      <circle cx="13" cy="7" r="1.45" fill="#2F6BFF" stroke="none" />
      <circle cx="15.2" cy="9.7" r="1.2" fill="#1FA87A" stroke="none" />
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

export function CopyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="9" y="7" width="10" height="12" rx="2" />
      <path d="M15 7V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </BaseIcon>
  );
}

export function PasteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 5.5h6" />
      <path d="M10 3h4a1 1 0 0 1 1 1v2H9V4a1 1 0 0 1 1-1Z" />
      <rect x="6" y="5.5" width="12" height="15" rx="2" />
      <path d="m12 10 3 3" />
      <path d="m12 16 3-3" />
      <path d="M9 13h6" />
    </BaseIcon>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 8-4 4 4 4" />
      <path d="M20 18a6 6 0 0 0-6-6H5" />
    </BaseIcon>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m15 8 4 4-4 4" />
      <path d="M4 18a6 6 0 0 1 6-6h9" />
    </BaseIcon>
  );
}

export function ClearIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h10" />
      <path d="M4 12h7" />
      <path d="M4 17h6" />
      <path d="m15 9 5 5" />
      <path d="m20 9-5 5" />
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

export function EnglishLanguageIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <text
        x="12"
        y="15.25"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        A
      </text>
    </BaseIcon>
  );
}

export function ChineseLanguageIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <text
        x="12"
        y="15.25"
        textAnchor="middle"
        fontSize="8.75"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        文
      </text>
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

export function Clock3Icon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

export function CalendarDaysIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 10h16" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 4 8 14H4L12 4Z" />
      <path d="M12 9v4.5" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function FastForwardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m4 7 6 5-6 5V7Z" />
      <path d="m11 7 6 5-6 5V7Z" />
      <path d="M20 7v10" />
    </BaseIcon>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 18a7 7 0 1 1 14 0" />
      <path d="m12 12 4-3" />
      <path d="M12 12v6" />
      <path d="M8 18h8" />
    </BaseIcon>
  );
}

export function HourglassIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 4h10" />
      <path d="M7 20h10" />
      <path d="M8 4c0 3 2 4.5 4 6 2-1.5 4-3 4-6" />
      <path d="M8 20c0-3 2-4.5 4-6 2 1.5 4 3 4 6" />
    </BaseIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function CornerDownLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15 6v8a3 3 0 0 1-3 3H5" />
      <path d="m9 13-4 4 4 4" />
    </BaseIcon>
  );
}

export function XIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </BaseIcon>
  );
}

export function PushPinIcon({ active = false, ...props }: IconProps & { active?: boolean }) {
  return (
    <BaseIcon {...props}>
      <g transform="rotate(40 12 12)">
        {active ? <path d="M9 4h6v4l2.5 4H6.5L9 8Z" fill="currentColor" opacity="0.2" stroke="none" /> : null}
        <path d="M8.5 4h7" />
        <path d="M9.5 4v4L7 12h10l-2.5-4V4" />
        <path d="M6.5 12h11" />
        <path d="M12 12v8" />
      </g>
    </BaseIcon>
  );
}
