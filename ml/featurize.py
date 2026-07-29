"""Feature extraction for the Relay Triage Engine.

This spec is mirrored exactly in lib/triage/index.ts. Any change here MUST be
mirrored there — ml/parity.py verifies both implementations agree.
"""
import re, json

# Normalise Indian-English and colloquial phrasing to a canonical form.
NORMALISE = {
    'paining': 'pain', 'pains': 'pain', 'aching': 'ache', 'hurting': 'hurt',
    'hurts': 'hurt', 'giddiness': 'dizzy', 'giddy': 'dizzy', 'lightheaded': 'dizzy',
    'lightheadedness': 'dizzy', 'breathlessness': 'breathless',
    'cant': 'cannot', "can't": 'cannot', 'couldnt': 'cannot', 'wont': 'not',
    "won't": 'not', 'isnt': 'not', "isn't": 'not', 'doesnt': 'not', "doesn't": 'not',
    'unresponsive': 'not_responding', 'collapsed': 'collapse', 'collapsing': 'collapse',
    'fainted': 'faint', 'fainting': 'faint', 'passed': 'pass',
    'palpitations': 'palpitation', 'tachycardia': 'racing_heart',
    'presyncope': 'near_faint', 'syncope': 'faint',
    'sob': 'breathless', 'pem': 'post_exertional', 'cfs': 'mecfs', 'me': 'mecfs',
    'tia': 'stroke', 'droop': 'drooping', 'slurring': 'slurred',
    'breathe': 'breath', 'breathing': 'breath', 'breaths': 'breath',
    'legs': 'leg', 'arms': 'arm', 'hands': 'hand', 'eyes': 'eye',
    'minutes': 'minute', 'hours': 'hour',
}

NEGATORS = {'no', 'not', 'cannot', 'without', 'never', 'nor', 'none'}
# 'cannot' negates in "no chest pain" style but is itself a symptom cue in
# "cannot breathe" — so these terms are never suppressed by a preceding negator.
NEGATION_IMMUNE = {'breath', 'breathe', 'talk', 'speak', 'move', 'wake', 'stand',
                   'walk', 'responding', 'not_responding', 'lift', 'grip', 'get'}
NEG_WINDOW = 3

STOP = {'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'to',
        'of', 'and', 'or', 'i', 'my', 'me', 'he', 'she', 'his', 'her', 'it', 'its',
        'they', 'them', 'their', 'we', 'us', 'you', 'your', 'this', 'that', 'these',
        'those', 'in', 'on', 'at', 'for', 'with', 'as', 'by', 'from', 'so', 'very',
        'just', 'like', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would'}


def tokenize(text: str) -> list[str]:
    t = text.lower().replace('’', "'")
    t = re.sub(r"[^a-z0-9' ]+", ' ', t)
    raw = [w for w in t.split() if w]
    out: list[str] = []
    for w in raw:
        out.append(NORMALISE.get(w, w))
    return out


def features(text: str) -> list[str]:
    toks = tokenize(text)
    feats: list[str] = []
    neg_until = -1
    for i, tok in enumerate(toks):
        if tok in NEGATORS:
            neg_until = i + NEG_WINDOW
            continue
        if tok in STOP:
            continue
        negated = i <= neg_until and tok not in NEGATION_IMMUNE
        feats.append(('NOT_' if negated else '') + tok)
    # bigrams over the non-stopword stream, preserving negation marks
    for i in range(len(feats) - 1):
        feats.append(feats[i] + '_' + feats[i + 1])
    return sorted(set(feats))


if __name__ == '__main__':
    for s in ["chest is paining and left hand numb",
              "no chest pain but cannot breathe",
              "he collapsed and is not responding",
              "giddiness on standing with racing heart"]:
        print(f'{s!r}\n  -> {features(s)}\n')
