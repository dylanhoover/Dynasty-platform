import Parser from "rss-parser";

const parser = new Parser();

const FEEDS = [
  { url: "https://www.espn.com/espn/rss/nfl/news", source: "ESPN" },
  { url: "https://www.cbssports.com/rss/headlines/nfl/", source: "CBS Sports" },
];

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string | null;
}

export async function fetchNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items ?? []).map((item) => ({
        title: item.title ?? "Untitled",
        link: item.link ?? "",
        source: feed.source,
        pubDate: item.pubDate ?? item.isoDate ?? null,
      }));
    })
  );

  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return items
    .sort((a, b) => new Date(b.pubDate ?? 0).getTime() - new Date(a.pubDate ?? 0).getTime())
    .slice(0, 40);
}
