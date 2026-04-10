# Quality Tests — Instagram Carousel Edition

Five tests to run against any draft or angle before validating. Adapted from the `/copywriting` self-review for the Instagram carousel context.

Apply all five. A draft that fails any test needs iteration.

## 1. Swap test

Replace Jules's name, stack, or context with any other French dev freelancer. Does the post still work identically?

- **Fail** = the post is generic. It could be posted by any of 500 other accounts. Add specifics until only Jules could have written it (exact stack versions, real decisions, real bugs, real numbers).
- **Pass** = the post leans on a specific experience, stack choice, or opinion that is non-transferable.

## 2. Scroll test

Read slide 1 alone, as if scrolling Instagram fast. Does it stop the scroll in under 2 seconds?

- **Fail** = slide 1 is a definition, an introduction, or a polite opener. Rewrite as a contrarian take, a sharp stat, or a provocation tied to the reader's current reality.
- **Pass** = slide 1 raises immediate tension, asks a pointed question, or promises a payoff strong enough to swipe.

## 3. Surprise test

Is there at least one slide that surprises, provokes, or delights? Is there one moment where the reader thinks "I didn't expect that"?

- **Fail** = every slide confirms what a mid-level dev already knows. Add a counter-intuitive angle, a hidden cost, a non-consensus opinion, or a concrete number that changes the frame.
- **Pass** = at least one slide challenges a common assumption or reveals something non-obvious.

## 4. Earn test

Does every slide earn its place? Is any slide filler — repetition, transition, padding to reach a round number?

- **Fail** = a slide exists only to make the count look bigger ("5 slides because round"), to paraphrase the previous one, or to buffer before the CTA. Cut it.
- **Pass** = removing any slide would visibly weaken the post.

## 5. AI smell test

Read the full post as if you received it. Does it feel like a human wrote it?

Red flags:
- Uniform slide lengths (same body word count on every slide)
- Symmetrical bullet lists on every slide
- "That being said…", "Moving forward…", "In conclusion…"
- Over-polished phrasing with zero sentence fragments
- Empty superlatives: "game-changing", "revolutionary", "powerful", "next-level"
- Hedging: "It could be argued that perhaps…"
- Every slide ends on the same rhythm

For the exhaustive banned patterns list, cross-reference `~/.claude/skills/copywriting/references/banned-patterns.md` (read-only, optional).

## Verdict rubric

| Verdict | Criteria | Action |
|---|---|---|
| **Ready to ship** | All 5 tests pass | Validate, send to `/api/intake` flow |
| **Needs iteration** | 1-2 tests fail, local fixes suffice | Propose alternatives on failing slides only |
| **Reshape needed** | 3+ tests fail | The angle itself is probably wrong; go back to `angle` mode |
