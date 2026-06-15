# carta

**Open standard and CLI for platform accountability.**

> I used Claude — which lives inside one of these platforms — to build the accountability charter *against* the platform model. This is not ironic. It's the point.

---

## The thesis

Tech feudalism: platforms as fiefdoms, terms of service as feudal contracts, data as land tenure, APIs as toll roads.

The Magna Carta's key move was forcing power to submit to **written, verifiable, third-party-enforceable** law. That's the gap Carta fills. The goal: make platform power subject to a standard a machine can audit — like OpenAPI for human dignity.

---

## Install

```bash
npm install -g carta-cli
```

Or run without installing:

```bash
npx carta-cli watch github
```

---

## Commands

### `carta watch <platform>` — THE KILLER FEATURE

Monitors a platform's ToS for changes month-over-month. First run takes a snapshot; subsequent runs diff against it and report what changed.

```bash
carta watch github           # watch GitHub ToS (registry URL)
carta watch openai --url https://openai.com/policies/terms-of-use  # custom URL

carta watch --list           # list all watched platforms
carta watch github --history # show detected changes over time
```

Output when changes are found:
```
✓ Changes detected — GitHub

  ────────────────────────────────────────────────────────────
  § User-Generated Content
  ────────────────────────────────────────────────────────────
  - We may use your content to improve our services.
  + We may use your content to train machine learning models.

  Summary: +1 lines added, -1 lines removed
```

Snapshots and history are stored in `~/.carta/` as plain text — human-readable, no database.

### `carta audit <platform-url>`

Interactive guided audit that walks through all 18 criteria in the Carta spec. Outputs a `carta-audit-result.json` that can be submitted to the community registry.

```bash
carta audit https://twitter.com/en/tos
carta audit github --badge --output twitter-audit.json
```

### `carta score [platform]`

Looks up platform scores from the community registry.

```bash
carta score              # show all audited platforms
carta score mastodon     # detailed breakdown for Mastodon
carta score --all        # include unaudited platforms
```

Current registry snapshot:

| Platform | Score | Tier |
|---|---|---|
| Mastodon | 88.3 | Platinum |
| (submit yours) | — | — |

### `carta charter`

Prints and saves a timestamped Digital Rights Declaration in JSON format.

```bash
carta charter --issuer yourgithubname
```

### `carta badge <platform-or-file>`

Generates an SVG badge for README embedding.

```bash
carta badge mastodon
carta badge carta-audit-result.json
```

Embed in your README:
```markdown
![carta score](./carta-badge.svg)
```

---

## The Carta Spec

`spec/carta-spec.json` is the machine-readable standard. Version 1.0.0.

**6 categories, 18 criteria:**

| Category | Weight | What it measures |
|---|---|---|
| **DP** Data Portability | 20% | Can you export your data — including inferred data — in an open format? |
| **DR** Deletion Rights | 20% | Does deletion actually delete, including ad profiles and third-party copies? |
| **TN** Terms Notice | 20% | How many days of advance notice before a ToS change becomes binding? |
| **SV** Surveillance | 20% | Does the platform sell your data? ("Share" vs. "sell" is load-bearing under CCPA.) |
| **EC** Exit Costs | 10% | API deprecation policy — how hard is it to leave, technically? |
| **AC** Accountability | 10% | Can you appeal an algorithmic moderation decision to a human reviewer? |

**Tier thresholds:**

| Tier | Min overall | Min per category |
|---|---|---|
| Platinum | 85 | 60 |
| Gold | 70 | 45 |
| Silver | 50 | — |
| Bronze | 30 | — |
| Failing | 0 | — |

**The hardest criteria:**

- **DP-3** (50% of DP): Export includes *inferred* data — ad interest profiles, behavioral segments. Most platforms fail this. A "data export" that omits your advertising profile is exporting your handwriting while retaining your soul.
- **DR-3** (50% of DR): Deletion scope covers derived and third-party data. GDPR Art. 17 exceptions let platforms retain inferred data indefinitely — this criterion asks whether they do.
- **TN-1** (40% of TN): "We may update these terms at any time" is the feudal clause. 30+ days advance notice before changes take effect is the minimum for meaningful consent.

---

## Community Registry

The `registry/platforms.json` file is the community-maintained audit database. To submit an audit:

1. Run `carta audit <platform-url>`
2. Review the generated `carta-audit-result.json`
3. Add your result to `registry/platforms.json`
4. Open a pull request

Audits are attributed to the GitHub user who submits them. The spec, not the tool, makes the determination — Carta doesn't score platforms itself.

---

## Architecture

```
carta/
├── spec/carta-spec.json      # THE STANDARD — machine-readable, versioned
├── registry/platforms.json   # community audit results
└── src/
    ├── commands/
    │   ├── watch.ts          # ToS diffing (killer feature)
    │   ├── audit.ts          # interactive guided audit
    │   ├── score.ts          # registry lookup
    │   └── charter.ts        # Digital Rights Declaration
    └── lib/
        ├── fetcher.ts        # HTTP with retry
        ├── parser.ts         # HTML → structured plain text
        ├── differ.ts         # line-level diff with section context
        ├── storage.ts        # JSON file storage in ~/.carta/
        ├── spec.ts           # spec loader + scoring engine
        ├── registry.ts       # registry loader
        └── badge.ts          # SVG badge generator
```

**Storage design note:** Snapshots are stored as plain text files in `~/.carta/snapshots/`. No database. Users can read their own snapshot history with any text editor, which is philosophically consistent with the project's thesis about data transparency.

**Stack:** TypeScript + Node.js. Zod for spec schema validation. No database dependencies.

---

## Why this exists

The same concentration of power that Carta audits is present in every piece of software that lives on these platforms. The irony of building this with Claude — an AI that lives inside Anthropic, one of the most powerful AI platforms — is intentional. The tool should exist whether or not the platform that helped build it earns a good score.

---

## License

MIT — because the commons should be open.

77 tests passing. Spec version 1.0.0.
