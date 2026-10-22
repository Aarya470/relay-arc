"""Honest comparison: linear model vs neural model vs the two averaged.
Same 5-fold stratified split as train.py, every example tested exactly once."""
import random, numpy as np
from corpus import CORPUS
import neural
from train_lib import CLASSES, CIDX, build_vocab, matrix, train as lr_train, softmax

random.seed(7); np.random.seed(7)
FOLDS = 5
by = {c: [] for c in CLASSES}
for t, l in CORPUS: by[l].append((t, l))
folds = [[] for _ in range(FOLDS)]
for c, rows in by.items():
    random.shuffle(rows)
    for i, r in enumerate(rows): folds[i % FOLDS].append(r)

res = {'linear': [], 'neural': [], 'ensemble': []}
ys = []; texts = []
for f in range(FOLDS):
    te = folds[f]; tr = [r for g in range(FOLDS) if g != f for r in folds[g]]
    v = build_vocab(tr); Xtr, ytr = matrix(tr, v); Xte, yte = matrix(te, v)
    W, b = lr_train(Xtr, ytr)
    Pl = softmax(Xte @ W + b)
    Ntr = neural.matrix([t for t, _ in tr]); Nte = neural.matrix([t for t, _ in te])
    params = neural.train(Ntr, ytr, len(CLASSES))
    Pn = neural.predict(params, Nte)
    res['linear'].append(Pl); res['neural'].append(Pn); res['ensemble'].append((Pl + Pn) / 2)
    ys.append(yte); texts += [t for t, _ in te]
y = np.concatenate(ys)
spanish = np.array([any(c in t for c in 'áéíóúñ') or any(w in t.split() for w in ('de','el','la','no puede','mi','me','se','está','esta','dolor','pecho')) for t in texts])
for name, Ps in res.items():
    P = np.concatenate(Ps); pred = P.argmax(1); conf = P.max(1)
    acc = (pred == y).mean()
    keep = conf >= 0.40
    print(f'{name:9s} accuracy {acc:.3f} | conf>=0.40 covers {keep.mean()*100:5.1f}% at {(pred[keep]==y[keep]).mean():.3f} | spanish-ish subset {(pred[spanish]==y[spanish]).mean():.3f} (n={spanish.sum()})')

print('\nthreshold sweep (coverage / accuracy on the cases kept on the phone)')
for name, Ps in res.items():
    P = np.concatenate(Ps); pred = P.argmax(1); conf = P.max(1)
    row = []
    for th in (0.4, 0.5, 0.6, 0.7, 0.8):
        k = conf >= th
        row.append(f'{th:.1f}: {k.mean()*100:4.1f}%/{(pred[k]==y[k]).mean():.3f}')
    print(f'  {name:9s} ' + '  '.join(row))

# typo robustness: drop or swap one character inside each word longer than 4
rng = random.Random(3)
def typo(t):
    out = []
    for w in t.split():
        if len(w) > 4 and rng.random() < 0.5:
            i = rng.randrange(1, len(w) - 1)
            w = w[:i] + w[i+1:] if rng.random() < 0.5 else w[:i] + w[i+1] + w[i] + w[i+2:]
        out.append(w)
    return ' '.join(out)
res_t = {'linear': [], 'neural': [], 'ensemble': []}; yt = []
for f in range(FOLDS):
    te = folds[f]; tr = [r for g in range(FOLDS) if g != f for r in folds[g]]
    v = build_vocab(tr); Xtr, ytr = matrix(tr, v)
    tte = [(typo(t), l) for t, l in te]; Xte, yte = matrix(tte, v)
    W, b = lr_train(Xtr, ytr); Pl = softmax(Xte @ W + b)
    params = neural.train(neural.matrix([t for t, _ in tr]), ytr, len(CLASSES))
    Pn = neural.predict(params, neural.matrix([t for t, _ in tte]))
    res_t['linear'].append(Pl); res_t['neural'].append(Pn); res_t['ensemble'].append((Pl+Pn)/2); yt.append(yte)
yt = np.concatenate(yt)
print('\nwith typos injected into the held-out text:')
for name, Ps in res_t.items():
    P = np.concatenate(Ps); print(f'  {name:9s} accuracy {(P.argmax(1)==yt).mean():.3f}')
