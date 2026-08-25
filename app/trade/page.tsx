import TradeEvaluator from "./TradeEvaluator";
import Movers from "./Movers";
import RookiePickValues from "./RookiePickValues";
import TradeActivity from "./TradeActivity";

export default function TradePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Trade & Value</h1>
        <p className="text-sm text-zinc-500">
          Build both sides of a trade and compare dynasty value, using this league&apos;s
          superflex-adjusted values.
        </p>
      </div>
      <TradeEvaluator />

      <section>
        <h2 className="mb-1 text-lg font-medium text-white">League Trade Activity</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Completed trades in this league, most recent first — real market context for what your
          leaguemates value.
        </p>
        <TradeActivity />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-white">Buy-low / Sell-high</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Based on FantasyCalc&apos;s 30-day value trend, cross-referenced against your
          league&apos;s actual rosters.
        </p>
        <Movers />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium text-white">Rookie & Future Pick Values</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Reference chart of every future draft pick FantasyCalc prices for this league.
        </p>
        <RookiePickValues />
      </section>
    </div>
  );
}
