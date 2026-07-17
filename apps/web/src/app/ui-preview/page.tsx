import {
  BottomSheetPreview,
  Button,
  Card,
  CheckboxField,
  DataTable,
  DrawerPreview,
  Field,
  IconButton,
  MetricCard,
  ModalPreview,
  SegmentedControl,
  SelectField,
  Skeleton,
  SliderField,
  StatePanel,
  StepperField,
  Tabs,
  TextInput,
  ToastPreview,
  Toggle
} from "@fpp/ui";
import type { CSSProperties } from "react";

const swatches = [
  ["Background", "var(--color-background)", "var(--color-text)"],
  ["Surface", "var(--color-surface)", "var(--color-text)"],
  ["Elevated", "var(--color-elevated)", "var(--color-text)"],
  ["Primary", "var(--color-primary)", "white"]
] as const;

function PreviewSurface({
  theme,
  dir,
  title
}: {
  theme: "dark" | "light" | "system";
  dir: "ltr" | "rtl";
  title: string;
}) {
  return (
    <main className="ui-preview" data-theme={theme} dir={dir}>
      <div className="ui-preview__inner">
        <header className="ui-preview__header">
          <p className="ui-eyebrow">{theme} / {dir}</p>
          <h1>{title}</h1>
          <p>Stage 4 UI infrastructure preview.</p>
        </header>

        <section className="ui-preview__section">
          <h2>Tokens</h2>
          <div className="ui-preview__swatches">
            {swatches.map(([label, color, text]) => (
              <div
                className="ui-swatch"
                key={label}
                style={
                  {
                    "--swatch": color,
                    "--swatch-text": text
                  } as CSSProperties
                }
              >
                <strong>{label}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="ui-preview__section">
          <h2>Controls</h2>
          <div className="ui-preview__grid">
            <Card eyebrow="Buttons" title="Actions">
              <div className="ui-stepper">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <IconButton label="Search" symbol="?" />
              </div>
            </Card>

            <Card eyebrow="Inputs" title="Fields">
              <Field hint="Uses tokenized focus and border states." label="Player name">
                <TextInput defaultValue="Sample player" />
              </Field>
              <Field label="Role">
                <SelectField defaultValue="coach">
                  <option value="owner">Owner</option>
                  <option value="coach">Coach</option>
                  <option value="assistant">Assistant</option>
                  <option value="player">Player</option>
                </SelectField>
              </Field>
              <CheckboxField defaultChecked label="Require approval" />
            </Card>

            <Card eyebrow="Modes" title="Selectors">
              <SegmentedControl active="Dark" options={["Dark", "Light", "System"]} />
              <Tabs active="Today" items={["Today", "Training", "Wellness"]} />
              <div className="ui-stepper">
                <Toggle checked label="Notifications enabled" />
                <StepperField label="Sets" value={3} />
              </div>
            </Card>

            <Card eyebrow="Range" title="Readiness">
              <SliderField label="Readiness score" value={8} />
            </Card>
          </div>
        </section>

        <section className="ui-preview__section">
          <h2>Decision Surfaces</h2>
          <div className="ui-preview__grid">
            <MetricCard label="Readiness" tone="success" value="8/10" />
            <MetricCard label="Fatigue" tone="warning" value="6/10" />
            <MetricCard label="Pain" tone="danger" value="2/10" />
            <MetricCard label="Sync" tone="info" value="3 pending" />
          </div>
          <DataTable />
        </section>

        <section className="ui-preview__section">
          <h2>Overlays And States</h2>
          <div className="ui-preview__grid">
            <ModalPreview />
            <DrawerPreview />
            <BottomSheetPreview />
            <ToastPreview />
            <Skeleton />
            <StatePanel title="Empty state" text="No assigned items yet." />
            <StatePanel tone="danger" title="Error state" text="The request could not be completed." />
            <StatePanel tone="warning" title="Offline state" text="Saved locally and waiting to sync." />
            <StatePanel tone="info" title="Sync state" text="Syncing latest changes." />
            <StatePanel tone="danger" title="Conflict state" text="Review local and server versions." />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function UiPreviewPage() {
  return (
    <>
      <PreviewSurface dir="ltr" theme="dark" title="Design System" />
      <PreviewSurface dir="rtl" theme="light" title="نمونه سیستم طراحی" />
    </>
  );
}
