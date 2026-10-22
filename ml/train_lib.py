import numpy as np
from featurize import features

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


