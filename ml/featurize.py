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

# ── Hindi / Marathi → canonical tokens ────────────────────────────────────────
# Deliberately mapped onto the English canonical forms so a Hindi utterance
# produces the same features as its English equivalent. With a corpus this size,
# sharing the feature space matters far more than modelling each language apart.
#
# NOTE: authored from general knowledge, NOT by a clinical native speaker.
# Native-speaker review is required before real-patient deployment; see
# docs/TRIAGE_ENGINE.md.
MULTILINGUAL = {
    # pain / hurt
    'दर्द': 'pain', 'dard': 'pain', 'दुखत': 'pain', 'dukhat': 'pain',
    'दुखणे': 'pain', 'dukhne': 'pain', 'peeda': 'pain', 'पीड़ा': 'pain',
    # chest
    'सीने': 'chest', 'seene': 'chest', 'seena': 'chest', 'सीना': 'chest',
    'छाती': 'chest', 'chhati': 'chest', 'chaati': 'chest', 'छातीत': 'chest',
    'chhatit': 'chest',
    # heart
    'दिल': 'heart', 'dil': 'heart', 'हृदय': 'heart', 'hriday': 'heart',
    'daura': 'attack', 'दौरा': 'attack',
    # breath
    'सांस': 'breath', 'saans': 'breath', 'साँस': 'breath', 'shwas': 'breath',
    'श्वास': 'breath', 'dam': 'breath', 'दम': 'breath',
    'takleef': 'difficulty', 'तकलीफ': 'difficulty', 'तकलीफ़': 'difficulty',
    # consciousness
    'बेहोश': 'unconscious', 'behosh': 'unconscious', 'बेशुद्ध': 'unconscious',
    'beshuddha': 'unconscious', 'होश': 'consciousness', 'hosh': 'consciousness',
    'गिर': 'collapse', 'gir': 'collapse', 'पडला': 'collapse', 'padla': 'collapse',
    'गिरगया': 'collapse',
    # dizziness
    'चक्कर': 'dizzy', 'chakkar': 'dizzy', 'भोवळ': 'dizzy', 'bhoval': 'dizzy',
    # autonomic / cardiac
    'धड़कन': 'palpitation', 'dhadkan': 'palpitation', 'धड़क': 'racing_heart',
    'dhadak': 'racing_heart', 'tez': 'fast', 'तेज़': 'fast', 'तेज': 'fast',
    # stroke
    'बोल': 'speak', 'bol': 'speak', 'बोलणे': 'speak',
    'चेहरा': 'face', 'chehra': 'face', 'चेहऱ्या': 'face',
    'मुंह': 'mouth', 'munh': 'mouth', 'तेढ़ा': 'drooping', 'tedha': 'drooping',
    'कमजोरी': 'weakness', 'kamzori': 'weakness', 'कमज़ोरी': 'weakness',
    'सुन्न': 'numb', 'sunn': 'numb', 'लकवा': 'paralysis', 'lakwa': 'paralysis',
    # body parts
    'हाथ': 'arm', 'haath': 'arm', 'बांह': 'arm', 'baanh': 'arm',
    'सिर': 'head', 'sir': 'head', 'डोके': 'head', 'doke': 'head',
    'पेट': 'stomach', 'pet': 'stomach', 'पोट': 'stomach',
    'जबड़ा': 'jaw', 'jabda': 'jaw',
    # associated symptoms
    'पसीना': 'sweating', 'paseena': 'sweating', 'घाम': 'sweating', 'gham': 'sweating',
    'उल्टी': 'vomiting', 'ulti': 'vomiting', 'ओकारी': 'vomiting',
    'बुखार': 'fever', 'bukhar': 'fever', 'ताप': 'fever',
    'थकान': 'fatigue', 'thakan': 'fatigue', 'थकवा': 'fatigue', 'thakva': 'fatigue',
    'खून': 'blood', 'khoon': 'blood', 'रक्त': 'blood',
    # severity / negation helpers
    'बहुत': 'severe', 'bahut': 'severe', 'जास्त': 'severe',
    'तीव्र': 'severe', 'teevra': 'severe',
    'नहीं': 'not', 'nahi': 'not', 'नाही': 'not', 'nahin': 'not',
    'ना': 'not',
    # grammatical particles and pronouns carry no clinical signal
    'और': '', 'aur': '', 'वह': '', 'voh': '', 'wo': '', 'vah': '', 'ती': '',
    'रहे': '', 'rahe': '', 'होने': '', 'hone': '', 'पर': '', 'par': '',
    'को': '', 'ko': '', 'का': '', 'ka': '', 'की': '', 'ki': '', 'के': '', 'ke': '',
    'से': '', 'se': '', 'ने': '', 'ne': '', 'मेरा': '', 'mera': '', 'मेरे': '',
    'mere': '', 'मुझे': '', 'mujhe': '', 'उसका': '', 'uska': '', 'यह': '',
    'ला': '', 'त्याला': '', 'lagat': '', 'लागत': '',
    # standing up is clinically meaningful (POTS), not filler
    'खड़े': 'standing', 'khade': 'standing', 'khada': 'standing',
    'उठते': 'standing', 'uthte': 'standing', 'उभे': 'standing', 'ubhe': 'standing',
    # misc verbs that carry the symptom
    'आ': '', 'रही': '', 'रहा': '', 'है': '', 'हैं': '', 'में': '', 'मे': '',
    'aa': '', 'rahi': '', 'raha': '', 'hai': '', 'hain': '', 'mein': '', 'me': '',
    'येत': '', 'आहे': '', 'aahe': '', 'yet': '',
}
NORMALISE.update(MULTILINGUAL)

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
    # Keep Devanagari (U+0900–U+097F) alongside Latin: Hindi and Marathi speech
    # transcription returns Devanagari, and stripping it would erase the input.
    t = re.sub(r"[^a-z0-9'\u0900-\u097f ]+", ' ', t)
    raw = [w for w in t.split() if w]
    out: list[str] = []
    for w in raw:
        n = NORMALISE.get(w, w)
        if n:                      # '' means "grammatical filler, drop it"
            out.append(n)
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
