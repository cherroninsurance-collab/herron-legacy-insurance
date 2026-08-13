// netlify/functions/coach.js
//
// Producer OS — Alpha Coach role-play + rep scoring for /training.
// Internal agent training only. This endpoint never talks to a client or prospect.
//
// SETUP: same key as the Legacy Concierge — Netlify → Site configuration →
// Environment variables → ANTHROPIC_API_KEY. Nothing else to configure.
//
// WHY A FUNCTION: the API key stays on the server. The phone only ever talks to
// this domain, so the key can't be lifted out of View Source.

const MODEL = "claude-sonnet-5"; // role-play quality matters more here than the last cent
const MAX_TOKENS = 900;
const MAX_INPUT_CHARS = 2000;
const MAX_TURNS = 24;

// The five things the training copy is built to prevent. Both prompts carry them:
// the prospect never rewards them, and the grader marks them down hard.
const COMPLIANCE = `COMPLIANCE — these are state insurance law, not style preferences. An agent who
does any of these is WRONG, no matter how smooth the delivery:
1. Borrowed authority. Claiming to be a "field underwriting director", a state program
   representative, or affiliated with the prospect's lender. Invented rate-lock deadlines
   or "regional logs". Impersonating a regulator is an unfair-and-deceptive-practices
   violation in every state.
2. False MIB claims. Telling a prospect a declination permanently bars them from coverage
   or "marks their file forever". MIB entries age off after seven years and a decline never
   bars future coverage. Pre-qualifying protects their RATE CLASS — that true benefit is the
   only one that may be stated.
3. Unplaceable quotes. Any premium quoted must match the carrier's real rate class for that
   age, build and tobacco status. A quote walked back after the application is a bait-and-switch.
4. Mislabeled steps. A signature, payment authorization or bank draft must be described as
   exactly what it is. Never calling the application "just a check".
5. Free-look suppression. Framing bank data collection as a medical or underwriting step, or
   coaching a client against the free-look period. The 30-day right is disclosed proactively,
   as a feature.`;

function roleplaySystem(mod, demo) {
  return `You are Alpha Coach, an elite high-ticket life insurance and annuities training strategist. Framework: Jeremy Miner's NEPQ fused with advanced product mechanics (max-funded IUL / LASER Fund, DI, LTC, annuities). You are training the user to become a $100K-a-month producer.

Active module: ${mod.n} — ${mod.name}. Focus: ${mod.focus}
Prospect scenario (you PLAY this prospect; the user plays the agent): ${demo}

Rules:
- Stay in character as the prospect. Realistic, guarded, human. 1–4 sentences per reply. Never a text wall.
- Every turn, silently evaluate the agent's tone, pacing, and sales pressure. If they pitch before uncovering pain, argue with an objection, use high-pressure logic traps, or transactional vocabulary ("deal", "sign up", "to be honest"), append a correction on its own line starting with exactly "COACH:" — direct, punchy, empathetic, max 2 sentences. Omit the COACH line when the turn was clean.
- If the agent runs a stage well, occasionally reward with a short COACH: note naming the NEPQ stage they nailed.
- If the agent earns it across the conversation (real discovery, consequence, commitment), let the prospect warm up and eventually agree to next steps.
- Your FIRST message only: one line starting "SCENE:" setting the scene in under 25 words, then the prospect's opening line. No greeting as a coach, no meta talk.

${COMPLIANCE}
If the agent uses any of the five above, the prospect does NOT reward it. Push back in character
and add a COACH: line naming the violation plainly.`;
}

function gradeSystem(phase) {
  return `You are Alpha Coach grading one rep of an in-home life insurance presentation.

Phase under test: ${phase}
Prospect: Dave, age 52. High friction, smoker, budget defensive. His opening state is
"I filled out that online thing, but my budget is tighter than a drum right now. I don't see
why I shouldn't just let the bank take the house if I kick it."

Grade the agent's delivery on three axes, 0–10 each:
- technical: structure, sequence, and whether the phase's actual job got done. COMPLIANCE LIVES HERE.
- tone: pacing, down-swing inflection, silence, whether it sounds like a peer or a pitcher.
- objection: how budget resistance and friction were absorbed rather than argued with.

${COMPLIANCE}
Any of the five drops technical to 3 or below and the fix must name the violation first. An agent
who scripts a fake underwriting title scores badly no matter how polished the delivery is.

Reply with ONLY a JSON object, no prose, no code fences:
{"technical":0-10,"tone":0-10,"objection":0-10,"fix":"...","next":"..."}
- fix: 2–4 sentences of specific, tactical critique. Name the exact words to change. Blunt, useful,
  never generic praise.
- next: the prospect's next in-character move and line, written as one short paragraph in the
  present tense, the way it would actually go at that table.`;
}

const MODULES = [
  { n: 1, name: "Phone Script & Lead Triage", focus: "Defensive reflexes, “just browsing” leads, booking fit-checks." },
  { n: 2, name: "The Laser IUL Presentation", focus: "Max-funded accumulation, 0% floors, tax-free distributions, WL vs IUL." },
  { n: 3, name: "Supplemental Risk Protection", focus: "Rider up-selling, standalone DI, high-risk niches like truck drivers." },
  { n: 4, name: "Advanced NEPQ Objections", focus: "“Think about it,” “too expensive,” “covered through work” — no arguing." },
  { n: 5, name: "High-Risk Underwriting", focus: "Clinical pre-qual, budget approvals for T2 diabetes, heart history." },
  { n: 6, name: "Elite Annuities Mechanics", focus: "SPIA/DIA/FIA/MYGA, participation rates, caps, spreads, index tracks." },
  { n: 7, name: "Annuity Conversions & Rollovers", focus: "401(k)/IRA rollovers, shortfall discovery, income riders, step-ups." }
];

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("ANTHROPIC_API_KEY is not set in Netlify environment variables");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "not_configured" }) };
  }

  let system, messages;
  try {
    const body = JSON.parse(event.body || "{}");

    if (body.mode === "grade") {
      const delivery = String(body.delivery || "").slice(0, MAX_INPUT_CHARS);
      if (!delivery.trim()) throw new Error("no delivery");
      system = gradeSystem(String(body.phase || "").slice(0, 120));
      messages = [{ role: "user", content: "Here is the rep, word for word:\n\n" + delivery }];
    } else {
      const mod = MODULES.find((m) => m.n === Number(body.module)) || MODULES[1];
      const demo = String(body.demo || "").slice(0, MAX_INPUT_CHARS);
      if (!demo.trim()) throw new Error("no scenario");
      if (!Array.isArray(body.messages) || !body.messages.length) throw new Error("no messages");

      messages = body.messages.slice(-MAX_TURNS).map((m) => {
        if (!["user", "assistant"].includes(m.role) || typeof m.content !== "string") {
          throw new Error("bad message shape");
        }
        return { role: m.role, content: m.content.slice(0, MAX_INPUT_CHARS) };
      });
      system = roleplaySystem(mod, demo);
    }
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "bad_request" }) };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Anthropic API error", res.status, detail);
      return { statusCode: 502, headers, body: JSON.stringify({ error: "upstream" }) };
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) return { statusCode: 502, headers, body: JSON.stringify({ error: "empty" }) };

    const isGrade = JSON.parse(event.body || "{}").mode === "grade";
    if (!isGrade) return { statusCode: 200, headers, body: JSON.stringify({ reply: text }) };

    // grading: pull the JSON object out even if the model wrapped it in prose or a fence
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { statusCode: 502, headers, body: JSON.stringify({ error: "unparsable" }) };
    const raw = JSON.parse(match[0]);
    const clamp = (v) => Math.max(0, Math.min(10, Math.round(Number(v) || 0)));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        feedback: {
          technical: clamp(raw.technical),
          tone: clamp(raw.tone),
          objection: clamp(raw.objection),
          fix: String(raw.fix || "").slice(0, 1200),
          next: String(raw.next || "").slice(0, 1200),
        },
      }),
    };
  } catch (err) {
    console.error("coach function failed:", err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "upstream" }) };
  }
};
