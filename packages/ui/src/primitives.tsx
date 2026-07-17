import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type Tone = "neutral" | "success" | "warning" | "info" | "danger";

export function Button({
  variant = "primary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`ui-button ui-button--${variant}`} {...props}>
      {children}
    </button>
  );
}

export function IconButton({
  label,
  symbol,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  symbol: string;
}) {
  return (
    <button className="ui-icon-button" aria-label={label} title={label} {...props}>
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

export function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="ui-field">
      <span className="ui-field__label">{label}</span>
      {children}
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="ui-input" {...props} />;
}

export function SelectField({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className="ui-input ui-select" {...props}>
      {children}
    </select>
  );
}

export function CheckboxField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="ui-check">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Toggle({
  label,
  checked
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <span className="ui-toggle" aria-label={label} role="switch" aria-checked={checked}>
      <span className="ui-toggle__thumb" />
    </span>
  );
}

export function SegmentedControl({
  options,
  active
}: {
  options: string[];
  active: string;
}) {
  return (
    <div className="ui-segmented" role="tablist">
      {options.map((option) => (
        <button
          className="ui-segmented__item"
          data-active={option === active}
          key={option}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function SliderField({ label, value }: { label: string; value: number }) {
  return (
    <Field label={label}>
      <input className="ui-slider" max={10} min={0} readOnly type="range" value={value} />
    </Field>
  );
}

export function StepperField({ label, value }: { label: string; value: number }) {
  return (
    <div className="ui-stepper" aria-label={label}>
      <IconButton label="Decrease" symbol="-" />
      <span>{value}</span>
      <IconButton label="Increase" symbol="+" />
    </div>
  );
}

export function Card({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="ui-card">
      {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <article className="ui-metric" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className="ui-badge" data-tone={tone}>
      {children}
    </span>
  );
}

export function Tabs({ items, active }: { items: string[]; active: string }) {
  return (
    <div className="ui-tabs" role="tablist">
      {items.map((item) => (
        <button className="ui-tab" data-active={item === active} key={item} type="button">
          {item}
        </button>
      ))}
    </div>
  );
}

export function DataTable() {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Status</th>
            <th>Readiness</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sample player</td>
            <td>
              <StatusBadge tone="success">Ready</StatusBadge>
            </td>
            <td>8/10</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ModalPreview() {
  return (
    <div className="ui-modal-preview" role="dialog" aria-label="Modal preview">
      <div>
        <strong>Confirm change</strong>
        <p>This preview shows modal spacing and surface tokens.</p>
      </div>
      <IconButton label="Close" symbol="x" />
    </div>
  );
}

export function DrawerPreview() {
  return (
    <aside className="ui-drawer-preview" aria-label="Drawer preview">
      <strong>Filters</strong>
      <StatusBadge tone="info">Active</StatusBadge>
    </aside>
  );
}

export function BottomSheetPreview() {
  return (
    <div className="ui-bottom-sheet-preview" aria-label="Bottom sheet preview">
      <span />
      <strong>Completion reason</strong>
      <p>Compact mobile action surface.</p>
    </div>
  );
}

export function ToastPreview({ tone = "success" }: { tone?: Tone }) {
  return (
    <div className="ui-toast" data-tone={tone} role="status">
      Saved locally
    </div>
  );
}

export function Skeleton() {
  return (
    <div className="ui-skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function StatePanel({
  title,
  text,
  tone = "neutral"
}: {
  title: string;
  text: string;
  tone?: Tone;
}) {
  return (
    <section className="ui-state" data-tone={tone}>
      <strong>{title}</strong>
      <p>{text}</p>
    </section>
  );
}
