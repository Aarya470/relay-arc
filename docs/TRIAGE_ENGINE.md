# Relay Triage Engine

Our own emergency classifier. No API, no network, ~0.1 ms per call.

```
lib/triage/index.ts            runtime (zero dependencies)
lib/triage/model.generated.ts  trained weights — GENERATED, do not hand-edit
ml/corpus.py                   397 labeled utterances
ml/featurize.py                feature spec (mirrored in index.ts)
ml/train.py                    trainer + exporter
ml/benchmark.py                head-to-head against Groq
tests/triage.test.ts           parity + behaviour suite
```

Retrain and re-verify:

```bash
cd ml && python3 train.py
cd ../tests && node --experimental-strip-types triage.test.ts
cd ../ml && PER_CLASS=4 python3 benchmark.py     # needs GROQ_API_KEY for the cloud leg
```

## How it works

Multinomial logistic regression over binary n-gram features — deliberately simple,
because the whole point is that it runs on a phone with no signal and can explain
itself.

1. **Normalise** Indian-English and colloquial phrasing: `paining → pain`,
   `giddiness → dizzy`, `cant → cannot`, `unresponsive → not_responding`.
2. **Negation scope**: a negator suppresses the next 3 content tokens
   (`NOT_chest`, `NOT_pain`) — except terms that are themselves the symptom in
   negated form (`cannot breathe`, `not responding`, `cannot lift`), which are
   negation-immune.
3. **Features**: unigrams + bigrams over the non-stopword stream, preserving
   negation marks.
4. **Score**: softmax over 7 classes; the winning class's strongest positive
   features become human-readable *evidence*.
5. **Abstain** below 0.40 confidence and let the language model decide.

The lexicon lives inside the exported model, so the Python trainer and the
TypeScript runtime cannot drift. `tests/triage.test.ts` asserts parity against
fixtures produced by the trainer — if the two implementations ever diverge, that
test fails.

## Measured results

5-fold cross-validation over all 397 examples: **89.2%** (folds 86.3–92.3%).

Head-to-head on 28 utterances the device model had never seen, against
`llama-3.1-8b-instant` using the exact prompt the product ships
(`docs/triage-benchmark.txt` is the raw run):

| | Relay Triage Engine | Groq llama-3.1-8b |
| --- | --- | --- |
| Accuracy (all cases) | 85.7% | **96.4%** |
| Accuracy when confident | **100%** (61% of cases) | — |
| Median latency | **0.11 ms** | 155 ms |
| Works offline | **yes** | no |
| Cost per call | **0** | metered |
| Explains its decision | **yes** | no |

**The honest read: Llama is more accurate than our model on raw classification,
and we are not going to out-classify an 8B model with 397 examples.** That is not
the win we are claiming.

The win is that **every single case our model got wrong, it abstained on**
(confidence 0.32–0.38, under the 0.40 gate). So in the shipped architecture:

- ~61% of emergencies are classified **on-device, instantly, offline, and — on
  this evaluation — with no errors**
- ~39% fall through to the language model, which is strong on exactly the
  ambiguous phrasings our small corpus is weak on
- If the network is unavailable, the on-device best guess is used rather than
  dead-ending an emergency

A model that knows when to be quiet is worth more here than a model that is
slightly more accurate but needs a network. Voice SOS now works with no signal.

## Known weaknesses

- **Sparse-vocabulary phrasings.** Terms appearing once or twice are unreliable;
  every distinctive clinical term needs ≥3 phrasings in the corpus.
- **Stroke vs unconscious on speech symptoms.** "words coming out wrong",
  "cannot get my words out" lean unconscious. More stroke-speech data needed.
- **Injury vocabulary is thin** — "twisted my ankle badly" misfired. `other` is a
  grab-bag class and deserves subdivision.
- **English only.** Hindi/Marathi phrasing is the highest-value next expansion
  for the target market, and the normalise map is the place to start.
- 397 examples is small. This model improves with data, and the real corpus
  should come from anonymised production transcripts under consent.

## Roadmap

1. Grow the corpus toward ~2,000 utterances, weighted to the weaknesses above.
2. Add Hindi and Marathi transliteration to the normalise map.
3. Apply the same approach to **crash risk** and **health score**, which are
   currently LLM calls that would be better as explainable feature models —
   a medical flag should be able to state its reasons.
4. Make the recovery **timeline** deterministic clinical protocol rather than
   generated text.
