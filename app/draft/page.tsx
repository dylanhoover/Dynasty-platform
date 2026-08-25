import DraftBoard from "./DraftBoard";
import DraftGuide from "./DraftGuide";

export default function DraftPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Draft Assistant</h1>
      <DraftGuide />
      <DraftBoard />
    </div>
  );
}
