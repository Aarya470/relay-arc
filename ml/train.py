"""Train the Relay Triage Engine and export it as a zero-dependency TS model.

Multinomial logistic regression over binary n-gram features. No sklearn: the
maths is 30 lines and controlling the export format exactly matters more than
convenience.
"""
import json, random, math, os
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__))
from corpus import CORPUS
from featurize import features, NORMALISE, NEGATORS, NEGATION_IMMUNE, STOP, NEG_WINDOW

random.seed(7)
np.random.seed(7)

CLASSES = ['chest_pain', 'unconscious', 'breathing', 'pots', 'stroke', 'mecfs', 'other']
CIDX = {c: i for i, c in enumerate(CLASSES)}


def build_vocab(rows):
    counts = {}
    for text, _ in rows:
        for f in features(text):
            counts[f] = counts.get(f, 0) + 1
    return {f: i for i, f in enumerate(sorted(counts))}


def matrix(rows, vocab):
    X = np.zeros((len(rows), len(vocab)), dtype=np.float32)
    y = np.zeros(len(rows), dtype=np.int64)
    for r, (text, label) in enumerate(rows):
        for f in features(text):
            j = vocab.get(f)
            if j is not None:
                X[r, j] = 1.0
        y[r] = CIDX[label]
    return X, y


def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def train(X, y, epochs=250, lr=2.6, l2=2e-3):
    n, d = X.shape
    k = len(CLASSES)
    W = np.zeros((d, k), dtype=np.float64)
    b = np.zeros(k, dtype=np.float64)
    Y = np.zeros((n, k)); Y[np.arange(n), y] = 1.0
    for ep in range(epochs):
        P = softmax(X @ W + b)
        G = (P - Y) / n
        W -= lr * (X.T @ G + l2 * W)
        b -= lr * G.sum(axis=0)
    return W, b


def evaluate(W, b, X, y):
    P = softmax(X @ W + b)
    pred = P.argmax(axis=1)
    conf = P.max(axis=1)
    return pred, conf, (pred == y).mean()


# ── Honest evaluation: 5-fold stratified cross-validation ──
# A single hold-out split of this corpus is high variance, so every example is
# tested exactly once across the folds.
FOLDS = 5
by_class = {c: [] for c in CLASSES}
for text, label in CORPUS:
    by_class[label].append((text, label))
folds = [[] for _ in range(FOLDS)]
for c, rows in by_class.items():
    random.shuffle(rows)
    for i, r in enumerate(rows):
        folds[i % FOLDS].append(r)

all_true, all_pred, all_conf, all_text = [], [], [], []
for f in range(FOLDS):
    test_rows = folds[f]
    train_rows = [r for g in range(FOLDS) if g != f for r in folds[g]]
    v = build_vocab(train_rows)
    Xtr, ytr = matrix(train_rows, v)
    Xte, yte = matrix(test_rows, v)
    Wf, bf = train(Xtr, ytr)
    pred_f, conf_f, acc_f = evaluate(Wf, bf, Xte, yte)
    print(f'  fold {f+1}: {len(train_rows)} train / {len(test_rows)} test  accuracy {acc_f:.3f}')
    all_true += list(yte); all_pred += list(pred_f); all_conf += list(conf_f)
    all_text += [t for t, _ in test_rows]

import numpy as _np
yte = _np.array(all_true); pred = _np.array(all_pred); conf = _np.array(all_conf)
test_rows = [(t, CLASSES[l]) for t, l in zip(all_text, all_true)]
acc_te = (pred == yte).mean()
print(f'\n{FOLDS}-fold CV accuracy over all {len(CORPUS)} examples: {acc_te:.3f}')

print('\nmisclassified:')
errs = 0
for i, (text, label) in enumerate(test_rows):
    if pred[i] != yte[i]:
        errs += 1
        print(f'  "{text}"\n    true={label}  predicted={CLASSES[pred[i]]}  conf={conf[i]:.2f}')
if not errs:
    print('  none')

# ── Abstention: where should we defer to the LLM? ──
print('\nabstention sweep (defer to LLM below threshold):')
for th in (0.30, 0.40, 0.50, 0.60):
    keep = conf >= th
    cov = keep.mean()
    acc = (pred[keep] == yte[keep]).mean() if keep.any() else float('nan')
    print(f'  threshold {th:.2f}  coverage {cov*100:5.1f}%  accuracy on kept {acc:.3f}')

# ── Ship: retrain on the full corpus, prune, export ──
vocab = build_vocab(CORPUS)
X, y = matrix(CORPUS, vocab)
W, b = train(X, y)
_, _, acc_full = evaluate(W, b, X, y)

inv = {i: f for f, i in vocab.items()}
strength = np.abs(W).max(axis=1)
keep_idx = [i for i in range(len(vocab)) if strength[i] >= 0.02]
kept = {inv[i]: n for n, i in enumerate(keep_idx)}
Wk = np.round(W[keep_idx, :], 4)

model = {
    'version': 1,
    'classes': CLASSES,
    'vocab': kept,
    'weights': [[float(x) for x in row] for row in Wk],
    'bias': [round(float(x), 4) for x in b],
    'config': {
        'normalise': NORMALISE,
        'negators': sorted(NEGATORS),
        'negationImmune': sorted(NEGATION_IMMUNE),
        'stop': sorted(STOP),
        'negWindow': NEG_WINDOW,
    },
    'meta': {
        'trainedExamples': len(CORPUS),
        'heldOutAccuracy': round(float(acc_te), 4),
        'fullFitAccuracy': round(float(acc_full), 4),
        'abstainThreshold': 0.40,
    },
}
# Emit a TypeScript module rather than JSON: identical semantics in Next and in
# plain Node (no import-attribute differences), and type-checked at build time.
model_path = os.path.join(ROOT, 'lib', 'triage', 'model.generated.ts')
with open(model_path, 'w') as f:
    f.write('// GENERATED by ml/train.py - do not edit by hand.\n')
    f.write('// %d examples, %d-fold CV accuracy %.4f, %d features\n' % (
        model['meta']['trainedExamples'], FOLDS, model['meta']['heldOutAccuracy'], len(kept)))
    f.write('const MODEL = ')
    f.write(json.dumps(model, separators=(',', ':')))
    f.write(' as const\nexport default MODEL\n')

size = os.path.getsize(model_path)
print(f'\nexported lib/triage/model.generated.ts  {len(kept)} features (pruned from {len(vocab)})  {size/1024:.1f} KB')
print(f'full-fit accuracy {acc_full:.3f}')

# Parity fixtures: TS must reproduce these exactly
fixtures = [
    "chest is paining and left hand numb", "no chest pain but cannot breathe",
    "he collapsed and is not responding", "giddiness on standing with racing heart",
    "face drooping and slurred speech", "crashed after shopping trip cannot move",
    "severe stomach pain and vomiting", "my father is clutching his chest sweating",
    "gasping for air inhaler not working", "heart rate shot up when i stood",
]
Xf, _ = matrix([(t, 'other') for t in fixtures], kept if False else vocab)
Pf = softmax(Xf @ W + b)
fx = [{'text': t,
       'class': CLASSES[int(Pf[i].argmax())],
       'confidence': round(float(Pf[i].max()), 4)}
      for i, t in enumerate(fixtures)]
with open(os.path.join(ROOT, 'tests', 'parity.fixtures.ts'), 'w') as f:
    f.write('// GENERATED by ml/train.py - expected outputs from the Python trainer.\n')
    f.write('const FIXTURES = ')
    f.write(json.dumps(fx, indent=1))
    f.write(' as const\nexport default FIXTURES\n')
print('wrote tests/parity.fixtures.ts')
