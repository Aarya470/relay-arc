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
import neural, base64

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
lin_pred = []
oof = []   # (linear probs, neural logits) per fold, to calibrate before averaging
for f in range(FOLDS):
    test_rows = folds[f]
    train_rows = [r for g in range(FOLDS) if g != f for r in folds[g]]
    v = build_vocab(train_rows)
    Xtr, ytr = matrix(train_rows, v)
    Xte, yte = matrix(test_rows, v)
    Wf, bf = train(Xtr, ytr)
    Pl = softmax(Xte @ Wf + bf)
    # The shipped engine averages the linear model with the neural one.
    nn_f = neural.train(neural.matrix([t for t, _ in train_rows]), ytr, len(CLASSES))
    Zn = neural.logits(nn_f, neural.matrix([t for t, _ in test_rows]))
    oof.append((Pl, Zn, yte))
    lin_pred += list(Pl.argmax(axis=1))
    all_text += [t for t, _ in test_rows]

# Calibrate the neural half on out-of-fold logits, then score the ensemble.
_Zall = np.concatenate([z for _, z, _ in oof]); _yall = np.concatenate([yy for _, _, yy in oof])
NN_T = neural.fit_temperature(_Zall, _yall)
print(f'  neural temperature (fitted on out-of-fold logits): T = {NN_T:.2f}')
for f, (Pl, Zn, yte_f) in enumerate(oof):
    Pe = (Pl + softmax(Zn / NN_T)) / 2
    pred_f, conf_f = Pe.argmax(axis=1), Pe.max(axis=1)
    print(f'  fold {f+1}: {len(yte_f)} test  ensemble accuracy {(pred_f == yte_f).mean():.3f}  (linear alone {(Pl.argmax(axis=1) == yte_f).mean():.3f})')
    all_true += list(yte_f); all_pred += list(pred_f); all_conf += list(conf_f)

import numpy as _np
yte = _np.array(all_true); pred = _np.array(all_pred); conf = _np.array(all_conf)
test_rows = [(t, CLASSES[l]) for t, l in zip(all_text, all_true)]
acc_te = (pred == yte).mean()
acc_lin = (_np.array(lin_pred) == yte).mean()
print(f'\n{FOLDS}-fold CV accuracy over all {len(CORPUS)} examples: {acc_te:.3f}  (linear alone {acc_lin:.3f})')

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
for th in (0.40, 0.50, 0.60, 0.70):
    keep = conf >= th
    cov = keep.mean()
    acc = (pred[keep] == yte[keep]).mean() if keep.any() else float('nan')
    print(f'  threshold {th:.2f}  coverage {cov*100:5.1f}%  accuracy on kept {acc:.3f}')

# ── Ship: retrain on the full corpus, prune, export ──
vocab = build_vocab(CORPUS)
X, y = matrix(CORPUS, vocab)
W, b = train(X, y)
_, _, acc_full = evaluate(W, b, X, y)

# Neural model on the full corpus, quantised to int8 for shipping.
nn_full = neural.train(neural.matrix([t for t, _ in CORPUS]), y, len(CLASSES))
nnW1, nnb1, nnW2, nnb2 = nn_full
def _q(m):
    scale = float(np.abs(m).max() / 127.0) or 1.0
    q = np.clip(np.round(m / scale), -127, 127).astype(np.int8)
    return q, round(scale, 9)
q1, s1 = _q(nnW1); q2, s2 = _q(nnW2)
nn_model = {
    'inputs': neural.D, 'hidden': neural.H,
    'w1': base64.b64encode(q1.tobytes()).decode(), 's1': s1,
    'b1': [round(float(x), 5) for x in nnb1],
    'w2': base64.b64encode(q2.tobytes()).decode(), 's2': s2,
    'b2': [round(float(x), 5) for x in nnb2],
    'temperature': NN_T,
}

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
    'nn': nn_model,
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
        'linearOnlyAccuracy': round(float(acc_lin), 4),
        'languages': ['en', 'hi', 'mr', 'es'],
        'fullFitAccuracy': round(float(acc_full), 4),
        'abstainThreshold': 0.60,
    },
}
# Emit ONE self-contained module: runtime + weights inlined. No intra-package
# imports means no module-resolution differences between Next, webpack and plain
# Node — which is exactly what broke the build when the model was a separate file.
template = open(os.path.join(HERE, 'runtime_template.ts')).read()
assert '/*__MODEL__*/' in template, 'runtime template lost its model placeholder'
banner = ('// Runtime is maintained in ml/runtime_template.ts; the model below is\n'
          '// GENERATED by ml/train.py. Regenerate with:  cd ml && python3 train.py\n'
          '// %d examples, %d-fold CV accuracy %.4f, %d features\n' % (
              model['meta']['trainedExamples'], FOLDS,
              model['meta']['heldOutAccuracy'], len(kept)))
generated = banner + template.replace('/*__MODEL__*/ null as any',
                                      json.dumps(model, separators=(',', ':')))
model_path = os.path.join(ROOT, 'lib', 'triage', 'index.ts')
with open(model_path, 'w') as f:
    f.write(generated)

size = os.path.getsize(model_path)
print(f'\nexported lib/triage/index.ts (self-contained)  {len(kept)} features (pruned from {len(vocab)})  {size/1024:.1f} KB')
print(f'full-fit accuracy {acc_full:.3f}')

# Parity fixtures: TS must reproduce these exactly
fixtures = [
    "chest is paining and left hand numb", "no chest pain but cannot breathe",
    "he collapsed and is not responding", "giddiness on standing with racing heart",
    "face drooping and slurred speech", "crashed after shopping trip cannot move",
    "severe stomach pain and vomiting", "my father is clutching his chest sweating",
    "gasping for air inhaler not working", "heart rate shot up when i stood",
    # Devanagari and romanised — parity must hold across scripts
    "सीने में दर्द और पसीना", "seene mein dard aur paseena",
    "सांस नहीं आ रही", "saans nahi aa rahi",
    "वह बेहोश है", "behosh ho gaya",
    "खड़े होते ही चक्कर आते हैं", "munh tedha ho gaya",
    "पेट में बहुत दर्द",
    # Spanish, with and without accents, plus misspellings the neural half handles
    "dolor de pecho y sudor frío", "no puedo respirar", "se desmayó y no responde",
    "me mareo al levantarme", "tiene la cara torcida", "dolor de estomago",
    "cant brethe", "chesst pain and swetting",
]
# Compute fixtures from EXACTLY what was serialised — the pruned, rounded model.
# Using the full unpruned matrix here produced confidences the shipped engine
# could not reproduce, which the parity test correctly rejected.
_Ws = np.array(model['weights'])
_bs = np.array(model['bias'])
Xf = np.zeros((len(fixtures), len(kept)))
for _r, _t in enumerate(fixtures):
    for _f in features(_t):
        _j = kept.get(_f)
        if _j is not None:
            Xf[_r, _j] = 1.0
_Pl = softmax(Xf @ _Ws + _bs)
# Neural half, from exactly the dequantised int8 weights that were serialised.
_W1 = q1.astype(np.float64) * s1; _W2 = q2.astype(np.float64) * s2
_b1 = np.array(nn_model['b1']); _b2 = np.array(nn_model['b2'])
_Xn = neural.matrix(fixtures).astype(np.float64)
_Pn = softmax((np.maximum(_Xn @ _W1 + _b1, 0) @ _W2 + _b2) / NN_T)
Pf = (_Pl + _Pn) / 2
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
