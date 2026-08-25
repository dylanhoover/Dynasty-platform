import MockDraft from "./MockDraft";

export default function MockDraftPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Mock Draft</h1>
        <p className="text-sm text-zinc-500">
          Practice against the real player pool before your actual draft. Nothing here touches
          your real Sleeper draft — it&apos;s a local simulation only.
        </p>
      </div>
      <MockDraft />
    </div>
  );
}
