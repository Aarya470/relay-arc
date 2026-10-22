"""Neural triage model: a small multilayer perceptron, trained from scratch.

Why a second model at all: the logistic regression in train.py only knows the
exact words and word pairs it was trained on. A misspelling ("brethe"), an
unaccented Spanish word it has not seen, or a new inflection is invisible to it.
This network also reads CHARACTER trigrams, so "respirando" shares most of its
input with "respirar", and "brethe" shares most of its input with "breathe".

Architecture (deliberately tiny so it ships inside the app):
    hashed binary features (1024)  ->  32 ReLU units  ->  7-way softmax
Inputs are the same word/bigram features as the linear model, plus character
trigrams of every token, hashed into 1024 buckets with 32-bit FNV-1a. The same
hash is implemented in lib/triage/index.ts, and parity fixtures prove the two
implementations agree.

Trained with Adam, dropout and weight decay; no ML library, NumPy only.
Weights are quantised to int8 for shipping (about 33 KB).
"""
import numpy as np
from featurize import features, tokenize

D = 1024          # hashed input width
H = 32            # hidden units


def fnv1a(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def nn_inputs(text: str) -> list[int]:
    """Indices of the active input buckets. Mirrored in TS: nnInputs()."""
    keys = list(features(text))
    for tok in tokenize(text):
        w = '#' + tok + '#'
        for i in range(len(w) - 2):
            keys.append('c:' + w[i:i + 3])
    return sorted({fnv1a(k) % D for k in keys})


def matrix(texts):
    X = np.zeros((len(texts), D), dtype=np.float32)
    for r, t in enumerate(texts):
        for j in nn_inputs(t):
            X[r, j] = 1.0
    return X


def softmax(Z):
    Z = Z - Z.max(axis=1, keepdims=True)
    E = np.exp(Z)
    return E / E.sum(axis=1, keepdims=True)


def train(X, y, k, epochs=260, lr=0.01, wd=1e-4, drop_in=0.15, drop_h=0.3, seed=7):
    rng = np.random.default_rng(seed)
    n = X.shape[0]
    W1 = rng.normal(0, np.sqrt(2.0 / 40), (D, H))   # ~40 active inputs per example
    b1 = np.zeros(H)
    W2 = rng.normal(0, np.sqrt(1.0 / H), (H, k))
    b2 = np.zeros(k)
    params = [W1, b1, W2, b2]
    m = [np.zeros_like(p) for p in params]
    v = [np.zeros_like(p) for p in params]
    Y = np.zeros((n, k)); Y[np.arange(n), y] = 1.0
    b1_, b2_, eps = 0.9, 0.999, 1e-8
    for ep in range(1, epochs + 1):
        mi = (rng.random(X.shape) > drop_in) / (1 - drop_in)
        Xd = X * mi
        A = Xd @ W1 + b1
        Hh = np.maximum(A, 0)
        mh = (rng.random(Hh.shape) > drop_h) / (1 - drop_h)
        Hd = Hh * mh
        P = softmax(Hd @ W2 + b2)
        G = (P - Y) / n
        gW2 = Hd.T @ G + wd * W2
        gb2 = G.sum(0)
        dH = (G @ W2.T) * mh * (A > 0)
        gW1 = Xd.T @ dH + wd * W1
        gb1 = dH.sum(0)
        for i, g in enumerate([gW1, gb1, gW2, gb2]):
            m[i] = b1_ * m[i] + (1 - b1_) * g
            v[i] = b2_ * v[i] + (1 - b2_) * g * g
            mh_ = m[i] / (1 - b1_ ** ep)
            vh_ = v[i] / (1 - b2_ ** ep)
            params[i] -= lr * mh_ / (np.sqrt(vh_) + eps)
    return params


def logits(params, X):
    W1, b1, W2, b2 = params
    return np.maximum(X @ W1 + b1, 0) @ W2 + b2


def predict(params, X, T=1.0):
    return softmax(logits(params, X) / T)


def fit_temperature(Z, y):
    """Temperature scaling (Guo et al., 2017). A network this size trained to
    convergence is badly overconfident: it says 0.99 when it is wrong. Dividing
    its logits by one scalar T, chosen to minimise negative log-likelihood on
    out-of-fold predictions, fixes the confidence without changing any answer."""
    best = (1e9, 1.0)
    for T in np.arange(1.0, 12.01, 0.25):
        P = softmax(Z / T)
        nll = -np.log(P[np.arange(len(y)), y] + 1e-12).mean()
        best = min(best, (nll, float(T)))
    return best[1]


def quantise(params):
    """int8 per-tensor quantisation. Returns the dequantised params (what the
    shipped model actually computes) plus the payload to serialise."""
    out, payload = [], []
    for p in params:
        scale = float(np.abs(p).max() / 127.0) or 1.0
        q = np.clip(np.round(p / scale), -127, 127).astype(np.int8)
        out.append(q.astype(np.float64) * scale)
        payload.append((q, scale))
    return out, payload
