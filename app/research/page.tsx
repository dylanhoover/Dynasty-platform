import ResearchFeed from "./ResearchFeed";

export default function ResearchPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Research</h1>
      <ResearchFeed />
    </div>
  );
}
