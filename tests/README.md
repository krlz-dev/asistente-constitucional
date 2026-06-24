# Scope tests (LLM-as-judge)

These tests verify that the chatbot stays focused on the **Constitución Política
del Estado Plurinacional de Bolivia (CPE 2009)** and refuses off-topic questions
(programming, biology, math, cooking, other countries, etc.).

Each case runs the **real** chat core (`src/lib/chat-core.js` — the exact prompt,
grounding and model that ship in `/api/chat`), then a judge model scores whether
the reply matched the expected behaviour:

- `expect: 'refuse'` — off-topic; the bot must decline.
- `expect: 'answer'` — on-topic control; the bot must answer (guards against
  the bot becoming *too* restrictive and refusing valid questions).

## Run

```bash
GROQ_API_KEY=your_groq_key npm run test:scope
```

Run a subset:

```bash
GROQ_API_KEY=your_groq_key npm run test:scope -- --only=python-loop,biology-cell
```

The command exits non-zero if any case fails, so it can gate CI.

### Optional environment variables

| Variable           | Default                   | Purpose                                  |
| ------------------ | ------------------------- | ---------------------------------------- |
| `GROQ_API_KEY`     | _(required)_              | Groq API key for both chatbot and judge. |
| `JUDGE_MODEL`      | `llama-3.3-70b-versatile` | Model used to grade the replies.         |
| `TEST_CONCURRENCY` | `4`                       | Parallel cases (keep modest for rate limits). |

## Add cases

Edit `tests/scope.cases.js` and add objects with `name`, `category`, `expect`
and `prompt`. The runner picks them up automatically.
