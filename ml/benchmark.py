"""Head-to-head: Relay Triage Engine vs Groq llama-3.1-8b-instant.

Same held-out utterances through both. Measures accuracy and latency. The Groq
prompt is copied verbatim from app/api/groq/classify-emergency/route.ts so this
is a fair comparison of what the product actually shipped.
"""
import os, json, time, random, re, urllib.request
import numpy as np
from corpus import CORPUS
from featurize import features

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLASSES = ['chest_pain', 'unconscious', 'breathing', 'pots', 'stroke', 'mecfs', 'other']

THRESH = 0.40

def _train(rows, epochs=250, lr=2.6, l2=2e-3):
    vocab, counts = {}, {}
    for text, _ in rows:
        for f in features(text):
            counts[f] = counts.get(f, 0) + 1
    for n, f in enumerate(sorted(counts)):
        vocab[f] = n
    X = np.zeros((len(rows), len(vocab)), dtype=np.float64)
    y = np.zeros(len(rows), dtype=np.int64)
    for r, (text, label) in enumerate(rows):
        for f in features(text):
            if f in vocab:
                X[r, vocab[f]] = 1.0
        y[r] = CLASSES.index(label)
    n, d, k = len(rows), len(vocab), len(CLASSES)
    W = np.zeros((d, k)); B = np.zeros(k)
    Y = np.zeros((n, k)); Y[np.arange(n), y] = 1.0
    for _ in range(epochs):
        Z = X @ W + B
        Z -= Z.max(axis=1, keepdims=True)
        E = np.exp(Z); P = E / E.sum(axis=1, keepdims=True)
        G = (P - Y) / n
        W -= lr * (X.T @ G + l2 * W)
        B -= lr * G.sum(axis=0)
    return vocab, W, B

def _predict(vocab, W, B, text):
    z = B.copy()
    for f in features(text):
        j = vocab.get(f)
        if j is not None:
            z += W[j]
    z = z - z.max()
    e = np.exp(z); p = e / e.sum()
    i = int(p.argmax())
    return CLASSES[i], float(p[i])

# ── Evaluation set: held out by seed, never used for the numbers below ──
random.seed(99)
by_class = {c: [] for c in CLASSES}
for t, l in CORPUS:
    by_class[l].append((t, l))
EVAL = []
PER_CLASS = int(os.environ.get('PER_CLASS', '7'))
for c, rows in by_class.items():
    random.shuffle(rows)
    EVAL += rows[:PER_CLASS]
random.shuffle(EVAL)
eval_texts = {t for t, _ in EVAL}
TRAIN = [(t, l) for t, l in CORPUS if t not in eval_texts]
print(f'evaluation set: {len(EVAL)} utterances the device model has NEVER seen')
print(f'device model trained on the remaining {len(TRAIN)} examples\n')
_vocab, _W, _B = _train(TRAIN)

# ── Relay Triage Engine ──
t0 = time.perf_counter()
dev = [_predict(_vocab, _W, _B, t) for t, _ in EVAL]
dev_ms = (time.perf_counter() - t0) * 1000 / len(EVAL)
dev_correct = sum(1 for (p, _), (_, l) in zip(dev, EVAL) if p == l)
dev_conf_correct = sum(1 for (p, c), (_, l) in zip(dev, EVAL) if c >= THRESH and p == l)
dev_conf_total = sum(1 for (p, c) in dev if c >= THRESH)

print('RELAY TRIAGE ENGINE (on-device)')
print(f'  accuracy            {dev_correct}/{len(EVAL)} = {dev_correct/len(EVAL):.3f}')
print(f'  confident subset    {dev_conf_total}/{len(EVAL)} covered, accuracy {dev_conf_correct/max(1,dev_conf_total):.3f}')
print(f'  latency             {dev_ms:.3f} ms per call')

# ── Groq ──
key = os.environ.get('GROQ_API_KEY')
if not key:
    env = os.path.join(ROOT, '.env.local')
    if os.path.exists(env):
        for line in open(env):
            if line.startswith('GROQ_API_KEY='):
                key = line.split('=', 1)[1].strip()

SYSTEM = """You classify a spoken emergency description into exactly one category. Categories:
- chest_pain: chest pain, pressure, tightness, jaw/arm pain, heart attack symptoms
- unconscious: someone collapsed, unresponsive, fainted and not waking
- breathing: severe shortness of breath, cannot breathe, choking
- pots: severe dizziness on standing, racing heart, near-fainting (POTS episode)
- stroke: face drooping, slurred speech, one-sided weakness
- mecfs: severe ME/CFS crash, post-exertional collapse
- other: anything else urgent

Respond ONLY with valid JSON, no other text: {"type":"chest_pain","confidence":"high"}"""

def groq_predict(text, tries=4):
    """Retry with backoff: a rate-limited call is not a wrong answer, and
    conflating the two would flatter our own model."""
    last = None
    for attempt in range(tries):
        try:
            return _groq_once(text)
        except Exception as e:
            last = e
            code = getattr(e, 'code', None)
            if code in (429, 500, 502, 503) or code is None:
                time.sleep(1.2 * (attempt + 1))
                continue
            break
    raise last if last else RuntimeError('groq failed')

def _groq_once(text):
    body = json.dumps({
        'model': 'llama-3.1-8b-instant', 'temperature': 0, 'max_tokens': 60,
        'messages': [{'role': 'system', 'content': SYSTEM},
                     {'role': 'user', 'content': f'Spoken description: "{text}"'}],
    }).encode()
    req = urllib.request.Request('https://api.groq.com/openai/v1/chat/completions', data=body,
        headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json',
                 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                               'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'})
    with urllib.request.urlopen(req, timeout=30) as r:
        j = json.load(r)
    raw = j['choices'][0]['message']['content']
    m = re.search(r'\{[\s\S]*\}', raw)
    return (json.loads(m.group(0)).get('type') if m else 'other') or 'other'

if not key:
    print('\nGROQ_API_KEY not found — skipping the cloud comparison.')
else:
    print('\nGROQ llama-3.1-8b-instant (cloud)')
    ok_n, lat, failed = 0, [], 0
    errors = []
    for text, label in EVAL:
        t0 = time.perf_counter()
        try:
            p = groq_predict(text)
            lat.append((time.perf_counter() - t0) * 1000)
        except Exception as e:
            failed += 1
            errors.append((text, label, f'API FAILED ({getattr(e, "code", type(e).__name__)})'))
            continue
        if p == label: ok_n += 1
        else: errors.append((text, label, p))
        time.sleep(0.25)   # be a good citizen; also keeps us off the rate limiter
    answered = len(EVAL) - failed
    lat.sort()
    print(f'  answered            {answered}/{len(EVAL)} calls ({failed} failed after retries)')
    print(f'  accuracy (answered) {ok_n}/{answered} = {ok_n/max(1,answered):.3f}')
    if lat:
        print(f'  latency             median {lat[len(lat)//2]:.0f} ms · p90 {lat[min(len(lat)-1,int(len(lat)*0.9))]:.0f} ms')
        print(f'  speed difference    on-device is {lat[len(lat)//2]/max(dev_ms,0.001):.0f}x faster')

    print('\n  groq misclassifications:')
    for text, label, p in errors[:12]:
        print(f'    "{text}"  true={label}  groq={p}')

    print('\n  device misclassifications:')
    dev_errs = [(t, l, p, c) for (p, c), (t, l) in zip(dev, EVAL) if p != l]
    if not dev_errs: print('    none')
    for t, l, p, c in dev_errs[:12]:
        gate = 'ABSTAINED -> defers to cloud' if c < THRESH else 'confident'
        print(f'    "{t}"  true={l}  device={p}({c:.2f})  [{gate}]')
