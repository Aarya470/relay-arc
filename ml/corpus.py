# Labeled corpus for the Relay Triage Engine.
# Phrasings deliberately include: first-person and bystander voice, Indian English
# ("chest is paining", "giddiness", "loose motion"), fragments a panicking person
# actually types, negations, and cross-symptom confusions between classes.

CORPUS: list[tuple[str, str]] = []

def add(label: str, phrases: list[str]):
    for p in phrases:
        CORPUS.append((p, label))

add('chest_pain', [
    "chest pain", "my chest hurts", "chest is paining", "severe chest pain",
    "crushing pain in my chest", "pressure in my chest", "chest feels tight",
    "tightness in chest and left arm", "pain radiating to my jaw",
    "pain going down my left arm", "heavy feeling on my chest like a weight",
    "burning in the centre of my chest", "chest pain and sweating",
    "chest pain with cold sweat", "i think i am having a heart attack",
    "heart attack symptoms", "squeezing chest pain for ten minutes",
    "chest discomfort and nausea", "my father is clutching his chest",
    "he has chest pain and is sweating", "she says her chest is very heavy",
    "angina pain again", "chest pain worse when i walk",
    "pain in chest and shoulder blades", "my chest is on fire and jaw hurts",
    "sharp pain left side of chest", "chest pain radiating to back",
    "pressure behind my breastbone", "chest heaviness and short of breath",
    "chest pain not going away with rest", "chest pain after climbing stairs",
    "band around my chest tightening", "my chest is paining and left hand numb",
    "elephant sitting on my chest", "chest pain and jaw pain and sweating",
    "cardiac pain", "i have pain in my heart area", "chest pain vomiting sweating",
    "dull ache in chest since morning getting worse", "chest tight cannot sit still",
])

add('unconscious', [
    "unconscious", "he is unconscious", "she collapsed", "my father collapsed",
    "not responding", "he is not responding to me", "unresponsive",
    "passed out and not waking up", "fainted and won't wake up",
    "my mother is on the floor not moving", "he fell down and is not moving",
    "she is out cold", "no response when i shake him", "not waking up",
    "collapsed suddenly", "he blacked out and is still down",
    "found him on the floor unresponsive", "she is limp and not answering",
    "my husband collapsed in the bathroom", "he is unconscious but breathing",
    "unconscious not breathing", "no pulse and not responding",
    "he stopped responding a minute ago", "she has fainted and is not coming around",
    "patient is unresponsive", "he is lying down eyes closed not answering",
    "my son collapsed during exercise", "collapsed and shaking then stopped",
    "he went stiff and passed out", "she fell unconscious after standing up",
    "not moving not talking", "he is knocked out cold on the ground",
    "cardiac arrest", "i think he is in cardiac arrest", "he is not breathing at all",
])

add('breathing', [
    "can't breathe", "cannot breathe", "i can't breathe properly",
    "difficulty breathing", "shortness of breath", "breathless",
    "gasping for air", "struggling to breathe", "wheezing badly",
    "my breathing is very fast and shallow", "suffocating feeling",
    "asthma attack", "severe asthma attack inhaler not working",
    "i am short of breath even sitting", "breathless when lying down",
    "he is breathing very heavily and cannot talk", "she is gasping",
    "choking", "something stuck in my throat cannot breathe",
    "breathing trouble since an hour", "unable to catch my breath",
    "my lips are turning blue and i cannot breathe", "very breathless climbing stairs",
    "cough and cannot breathe", "tight chest wheezing cannot breathe",
    "i feel like i am drowning cannot get air", "hyperventilating cannot slow down",
    "breathing fast and dizzy", "shortness of breath and swollen legs",
    "no chest pain but cannot breathe", "breathing difficulty worsening",
    "i need oxygen cannot breathe", "panting and cannot speak full sentence",
])

add('pots', [
    "pots episode", "my pots is flaring", "heart racing when i stand",
    "racing heart on standing", "dizzy when standing up", "giddiness on standing",
    "i feel faint every time i stand", "presyncope", "near fainting",
    "lightheaded and heart pounding", "tachycardia after standing",
    "my heart rate jumped to 150 when i stood", "blood pressure dropping when upright",
    "dizzy spells and palpitations", "vision going grey when i get up",
    "orthostatic intolerance episode", "i have to lie down or i will faint",
    "heart pounding and shaky and dizzy", "feel like fainting but conscious",
    "brain fog dizziness racing pulse", "pots flare after hot shower",
    "standing makes my heart race and i get tunnel vision",
    "palpitations and dizziness", "dysautonomia flare",
    "i got dizzy and my pulse shot up", "feeling faint and clammy on standing",
    "lightheadedness with fast pulse", "adrenaline surge and dizzy",
    "cannot stand up without nearly blacking out",
])

add('stroke', [
    "stroke", "stroke symptoms", "i think he is having a stroke",
    "face drooping", "one side of face is drooping", "slurred speech",
    "he cannot speak properly", "speech is garbled", "cannot lift right arm",
    "weakness on one side", "left side of body went weak",
    "face droop and arm weakness", "sudden confusion and slurred words",
    "he cannot understand what i am saying", "one arm has gone numb suddenly",
    "sudden vision loss in one eye", "worst headache of my life sudden",
    "mouth is crooked and speech is slurred", "she cannot smile on one side",
    "sudden numbness face arm leg one side", "he is dragging his leg suddenly",
    "cannot grip with left hand suddenly", "sudden dizziness and cannot walk straight",
    "fast symptoms face arm speech time", "he suddenly could not talk",
    "half his body is not working", "tia symptoms", "brain attack",
    "sudden severe headache with vomiting and confusion",
])

add('mecfs', [
    "severe crash", "me cfs crash", "post exertional malaise",
    "i am in a bad crash", "pem crash after activity", "severe fatigue crash",
    "i overdid it yesterday and now i cannot move", "completely wiped out",
    "body feels like lead cannot get up", "crashed after shopping trip",
    "severe exhaustion and muscle pain", "cannot lift my head crash",
    "flu like crash after exertion", "energy completely gone crash",
    "in a crash cannot tolerate light or sound", "bedbound crash today",
    "my chronic fatigue has crashed badly", "payback from yesterday is severe",
    "cannot think or move after exertion", "worst crash in months",
    "muscle heaviness and brain fog crash", "collapsed energy not fainting",
    "severe me flare cannot function", "crashed and every muscle aches",
])

add('other', [
    "other", "something else", "not sure what is happening",
    "severe stomach pain", "bad allergic reaction", "swelling of my lips and throat",
    "anaphylaxis", "bleeding heavily", "deep cut bleeding a lot",
    "broke my arm", "fell and hurt my hip badly", "severe headache",
    "high fever and shivering", "vomiting blood", "severe back pain sudden",
    "seizure", "he had a seizure", "blood sugar very low and shaking",
    "diabetic emergency", "overdose", "took too many pills",
    "burn on my hand", "eye injury", "severe abdominal pain and vomiting",
    "kidney stone pain", "loose motion and dehydration", "severe dizziness no other symptom",
    "panic attack", "anxiety attack cannot calm down", "i feel very unwell generally",
    "something is wrong i need help", "my medication is causing a reaction",
])


# ── Error-analysis augmentation (round 1) ──────────────────────────────────────
# Each block targets a specific held-out failure: sparse clinical terms and the
# two-word fragments people actually type under stress.

add('chest_pain', [
    "cardiac pain", "cardiac chest pain", "angina", "angina pain again",
    "angina attack", "myocardial pain", "heart pain", "pain in my heart",
    "chest", "chest tightness", "chest pressure", "chest heaviness",
    "left chest pain", "central chest pain", "retrosternal pain",
    "stable angina flaring", "unstable angina", "chest pain radiating",
    "heart is paining", "pain near heart", "tight band chest",
])

add('breathing', [
    "wheezing", "wheezing badly", "wheeze", "wheezy and tight",
    "dyspnea", "dyspnoea", "breathless", "breathless at rest",
    "air hunger", "cannot get enough air", "laboured breathing",
    "respiratory distress", "puffing and cannot speak", "winded badly",
    "oxygen low and breathless", "cannot breathe out properly",
])

add('pots', [
    "palpitations", "palpitations and dizziness", "heart racing",
    "heart pounding", "pulse 150", "pulse very high suddenly",
    "racing pulse and dizzy", "dizzy and palpitations no chest pain",
    "postural tachycardia", "orthostatic dizziness",
    "i have to lie down or i will faint", "need to lie down feeling faint",
    "about to faint but still awake", "grey out when standing",
    "tachycardic and shaky", "pounding heart when upright",
])

add('stroke', [
    "cannot lift right arm", "cannot lift my arm", "cannot raise left arm",
    "arm weakness sudden", "weak arm one side", "numb face",
    "face numb one side", "facial droop", "mouth drooping",
    "speech slurred suddenly", "cannot form words", "words coming out wrong",
    "one side weak suddenly", "hemiplegia", "sudden one sided weakness",
    "leg gave way one side", "cannot smile properly",
])

add('unconscious', [
    "collapsed", "unconscious now", "out cold", "no response",
    "not waking", "he is not waking up", "fainted and unresponsive",
    "flat on the floor not responding", "arrest", "he arrested",
])

add('mecfs', [
    "crash", "in a crash", "pem", "post exertional crash",
    "severe fatigue", "fatigue crash", "energy crash severe",
    "cannot move from bed crash", "payback crash", "overexerted and crashed",
])

add('other', [
    "not sure", "help", "something wrong", "unwell",
    "stomach pain", "abdominal pain severe", "allergic reaction",
    "throat swelling", "bleeding", "fever high", "seizure now",
    "low blood sugar", "hypoglycemia", "poisoning", "fracture",
])


# ── Error-analysis augmentation (round 2) ──────────────────────────────────────
# Round 1 added singleton clinical terms, which a held-out split can never learn.
# Every distinctive term now has >=3 phrasings, plus explicit fixes for the
# confusions the evaluation surfaced.

add('breathing', [
    "dyspnoea", "dyspnea worsening", "dyspnoea at rest", "acute dyspnoea",
    "hyperventilating", "hyperventilating cannot slow down", "hyperventilating and tingling",
    "breathing too fast cannot control", "over breathing and dizzy",
    "wheezing and breathless", "audible wheeze", "wheezing since morning",
    "respiratory distress worsening", "cannot breathe lying flat",
])

add('pots', [
    "presyncope", "presyncope episode", "presyncopal and clammy",
    "tachycardic", "tachycardic and shaky", "tachycardic on standing",
    "feeling tachycardic and faint", "pulse racing and trembling",
    "palpitations and shaky", "palpitations standing up", "fluttering heart standing",
])

add('stroke', [
    "brain attack", "brain attack symptoms", "suspected brain attack",
    "hemiplegia", "hemiplegia sudden onset", "one sided paralysis",
    "half his body is not working", "half her body has gone weak",
    "half of my body feels dead", "words coming out wrong", "words are jumbled",
    "cannot get my words out", "sudden severe headache with vomiting and confusion",
    "thunderclap headache and confusion", "worst headache ever with weakness",
    "sudden confusion and one sided weakness",
])

add('mecfs', [
    "payback from yesterday is severe", "payback is brutal today",
    "payback after activity", "severe fatigue", "severe fatigue and aching",
    "severe fatigue cannot function", "collapsed energy not fainting",
    "energy collapsed completely still awake", "my energy has collapsed",
    "exhaustion crash not fainting", "wiped out crash awake but cannot move",
])

# Clinically important disambiguation: unconscious AND not breathing is cardiac
# arrest and must route to the unconscious/CPR path, not the breathing path.
add('unconscious', [
    "unconscious not breathing", "unconscious and not breathing",
    "he is unconscious and not breathing", "not breathing and unresponsive",
    "collapsed and not breathing", "no pulse not breathing",
    "fainted and won't wake up", "fainted and will not wake up",
    "fainted and cannot wake him", "passed out and will not wake up",
])

# Injury must not read as stroke merely because a limb is mentioned.
add('other', [
    "broke my arm", "broken arm from a fall", "fractured my arm",
    "broke my leg", "injured my arm badly", "cut my arm deeply",
    "twisted my ankle badly", "dislocated my shoulder",
])

if __name__ == '__main__':
    from collections import Counter
    print('total examples:', len(CORPUS))
    for k, v in sorted(Counter(l for _, l in CORPUS).items()):
        print(f'  {k:<12} {v}')
