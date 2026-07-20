type IconProps = { className?: string };

const base = "h-[18px] w-[18px]";

function wrap(children: React.ReactNode, className?: string) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const BellIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0" />
    </>,
    className
  );

export const ChevronDownIcon = ({ className }: IconProps) => wrap(<path d="m6 9 6 6 6-6" />, className);

export const UsersIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19c.7-3 3-4.75 5.5-4.75s4.8 1.75 5.5 4.75" />
      <path d="M16 8.25a3 3 0 1 1 3.4 2.97" />
      <path d="M15.5 14.5c2.2.3 4 1.9 4.6 4.5" />
    </>,
    className
  );

export const MailIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>,
    className
  );

export const AlertIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </>,
    className
  );

export const CheckCircleIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.5 2.4 2.4L15.8 9.6" />
    </>,
    className
  );

export const LinkIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <path d="M10 14a4.5 4.5 0 0 0 6.4.3l2-2a4.5 4.5 0 0 0-6.4-6.4l-1.1 1.1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4-.3l-2 2a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1" />
    </>,
    className
  );

export const CopyIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </>,
    className
  );

export const RefreshIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <path d="M20 11a8 8 0 0 0-14.6-4.6M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.6 4.6M20 20v-5h-5" />
    </>,
    className
  );

export const TrashIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7 7.3 19a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7" />
    </>,
    className
  );

export const PlusIcon = ({ className }: IconProps) => wrap(<path d="M12 5v14M5 12h14" />, className);

export const SettingsIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1h-.2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6v-.2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z" />
    </>,
    className
  );

export const ClipboardListIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
    </>,
    className
  );

export const BarChartIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M4 20h16" />
    </>,
    className
  );

export const ClipboardCheckIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" />
      <path d="m9 13 2 2 4-4.5" />
    </>,
    className
  );

export const CalendarIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>,
    className
  );

export const LogOutIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>,
    className
  );

export const GridIcon = ({ className }: IconProps) =>
  wrap(
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>,
    className
  );

export const WhatsAppIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? base} aria-hidden="true">
    <path d="M17.5 14.4c-.3-.1-1.6-.8-1.8-.9-.3-.1-.4-.1-.6.1-.2.2-.6.9-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.2-.5-.5-1-1.1-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.3 0-.5-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.7.7-1 1.5-1 2.4.1 1.1.5 2.1 1.2 3 1.1 1.7 2.6 3.1 4.4 4 .5.2.9.4 1.4.5.5.2 1 .2 1.6.1.7-.1 1.4-.6 1.8-1.2.2-.4.2-.8.2-1.2 0-.1-.2-.1-.4-.2Z" />
    <path d="M20.5 3.5A11 11 0 0 0 3.3 16.8L2 22l5.3-1.4A11 11 0 1 0 20.5 3.5Zm-8.5 18a9 9 0 0 1-4.6-1.3l-.3-.2-3.1.8.9-3-.2-.3A9 9 0 1 1 12 21.5Z" />
  </svg>
);

export const TelegramIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className ?? base} aria-hidden="true">
    <path d="M21.5 4.5 2.9 11.8c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.7l3-14.1c.3-1.2-.4-1.7-1.2-1.7ZM8.9 14.2l9.3-5.9c.4-.3.8-.1.5.2l-7.8 7.1-.3 3.1-1.4-4.5Z" />
  </svg>
);
