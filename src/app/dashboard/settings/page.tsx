import PreferencesForm from "@/components/PreferencesForm";

export default function PreferencesSettingsPage() {
  return <main className="mx-auto max-w-2xl px-5 py-10"><h1 className="font-display text-3xl font-bold text-white">Preferences</h1><p className="mt-2 text-sm text-smoke-3">Language and time zone apply to your personal account.</p><section className="mt-6 rounded-xl border border-line-1 bg-ink-3 p-6"><PreferencesForm settings /></section></main>;
}
