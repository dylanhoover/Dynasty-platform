import { getLeague, getDraft } from "@/lib/sleeper";
import { leagueValueSettings } from "@/lib/fantasycalc";
import { leagueId } from "@/lib/config";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-zinc-800 open:bg-zinc-900/40">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium text-zinc-200">
        {title}
        <span className="text-zinc-600 transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4 text-sm text-zinc-400">{children}</div>
    </details>
  );
}

export default async function DraftGuide() {
  const league = await getLeague(leagueId());
  const valueSettings = leagueValueSettings(league);
  const isSuperflex = valueSettings.numQbs >= 2;
  const isPPR = valueSettings.ppr >= 1;

  const draft = league.draft_id ? await getDraft(league.draft_id) : null;
  const rounds = draft?.settings.rounds ?? 25;
  const teams = league.total_rosters;

  const foundationEnd = Math.max(1, Math.round(rounds * 0.12));
  const startersEnd = Math.max(foundationEnd + 1, Math.round(rounds * 0.32));
  const upsideEnd = Math.max(startersEnd + 1, Math.round(rounds * 0.6));

  return (
    <details className="rounded-lg border border-indigo-500/30 bg-indigo-500/5">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-indigo-200">
        📖 How to draft this league — {teams} teams, {rounds} rounds, {isSuperflex ? "superflex" : "1QB"},{" "}
        {isPPR ? "full PPR" : "PPR"}
        <span className="text-indigo-400">tap to expand</span>
      </summary>

      <div className="flex flex-col gap-2 border-t border-indigo-500/20 p-3">
        {isSuperflex && (
          <Section title="Superflex changes the QB math">
            <p>
              With a SUPER_FLEX slot, every team can start two QBs — so a startable QB2 has real
              lineup value, not just backup value. QB scarcity is much higher here than in a
              1-QB league. Historically in superflex startups, 3–5 QBs come off the board in the
              first two rounds. Treat a good (not just elite) QB as a top-15-overall asset, not a
              &quot;wait and stream it&quot; position.
            </p>
          </Section>
        )}

        <Section title={`Draft in phases (${rounds} rounds this draft)`}>
          <p>
            <span className="font-medium text-zinc-300">
              Rounds 1–{foundationEnd}: Foundation.
            </span>{" "}
            Take the best value on the board almost regardless of position — this is where
            multi-year league-winners live. Need barely matters yet since every team&apos;s
            roster is empty.
          </p>
          <p>
            <span className="font-medium text-zinc-300">
              Rounds {foundationEnd + 1}–{startersEnd}: Fill starters.
            </span>{" "}
            Value still leads, but start weighting your actual empty starting slots — this is
            where the &quot;My Draft Plan&quot; view below earns its keep over raw &quot;Best
            Available.&quot;
          </p>
          <p>
            <span className="font-medium text-zinc-300">
              Rounds {startersEnd + 1}–{upsideEnd}: Youth &amp; upside.
            </span>{" "}
            Prioritize buy-low and high-upside young players over proven-but-aging vets, unless
            you&apos;ve explicitly set your team timeline to Win Now. This is also where rookies
            and post-hype sleepers get taken.
          </p>
          <p>
            <span className="font-medium text-zinc-300">
              Rounds {upsideEnd + 1}–{rounds}: Depth &amp; dart throws.
            </span>{" "}
            Bench depth, handcuffs, late-round QBs, developmental stashes. Being wrong here costs
            almost nothing — being right can be a free league-winner two years from now.
          </p>
        </Section>

        <Section title="Positional notes for dynasty">
          <p>
            <span className="font-medium text-zinc-300">RB</span> ages the fastest of any
            position in dynasty — careers are short. An early-round RB needs to be a true
            difference-maker; it&apos;s fine to let RB depth come to you later, since youth and
            opportunity at RB are cheaper to find than at other positions.
          </p>
          <p>
            <span className="font-medium text-zinc-300">WR</span> ages the most gracefully and is
            the safest long-term hold. Building WR depth throughout the draft, not just early,
            is a defensible strategy.
          </p>
          <p>
            <span className="font-medium text-zinc-300">TE</span> is thin at the very top and
            replaceable in the middle. Either get a true difference-maker or don&apos;t reach for
            the &quot;pretty good but unspectacular&quot; tier — it ties up a pick without much
            payoff.
          </p>
          {isSuperflex && (
            <p>
              <span className="font-medium text-zinc-300">QB</span> — see above: don&apos;t
              punt this position the way you might in a 1-QB league.
            </p>
          )}
        </Section>

        <Section title="Prioritize youth — value compounds">
          <p>
            When two players are close in current value, default to the younger one. In dynasty,
            a 23-year-old holds and grows value over years; a 29-year-old is closer to the back
            half of theirs. FantasyCalc&apos;s values already price this in generally, but ties
            should break toward age unless you&apos;re explicitly building to win this year.
          </p>
        </Section>

        <Section title="How to use this page">
          <p>
            <span className="font-medium text-zinc-300">Best Available</span> is pure dynasty
            value.{" "}
            <span className="font-medium text-zinc-300">My Draft Plan</span> is personalized —
            it adds your roster&apos;s remaining need and how thin each position is about to get.
          </p>
          <p>
            A <span className="font-medium text-zinc-300">value cliff</span> tag means the
            position is about to get meaningfully worse in the next few picks — a signal not to
            wait.
          </p>
          <p>
            The <span className="font-medium text-zinc-300">Team Timeline</span> toggle shifts
            the whole plan toward youth (Build for future) or proven production (Win now). It
            auto-suggests from your team&apos;s Contend/Retool/Rebuild outlook once you have a
            roster, and you can override it any time.
          </p>
          <p>
            Star (★) players you like to build a queue in the{" "}
            <span className="font-medium text-zinc-300">Watchlist</span> so you&apos;re not
            scrambling when the clock is on you. Your upcoming pick numbers are shown at the top
            — remember other teams pick in between, so the board will look different by the time
            your turn comes back around.
          </p>
        </Section>
      </div>
    </details>
  );
}
