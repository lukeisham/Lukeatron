#!/usr/bin/env python3
"""Build Grammar_lexicon.db — the Grammar Parser's embedded POS lexicon.

Provenance (FR-20 / OQ-4, recorded 2026-07-05):
  * Part-of-speech tags: Moby Part-of-Speech list (mobypos.txt), Moby Project
    by Grady Ward, Project Gutenberg #3203. Licence: PUBLIC DOMAIN.
    Retrieved 2026-07-05 from https://www.gutenberg.org/files/3203/files.zip
  * Frequency ranks: FrequencyWords en_50k.txt (2018), derived from the
    OpenSubtitles corpus by Hermit Dave. Licence: CC-BY-SA 4.0 (attribution:
    Hermit Dave, https://github.com/hermitdave/FrequencyWords).
    Retrieved 2026-07-05.
  * Irregular verb/plural tables: hand-compiled in this script.

Output schema:
  lexicon(word TEXT PRIMARY KEY, pos TEXT, alt TEXT, feat TEXT, rank INTEGER)
    pos  — primary word class (noun|verb|adjective|adverb|pronoun|preposition|
           conjunction|determiner|interjection)
    alt  — comma-separated alternate classes
    feat — comma-separated features (plural, past:BASE, pp:BASE, ing:BASE,
           3sg:BASE, comparative, superlative ...)
    rank — frequency rank (1 = most frequent; 999999 = forced inclusion)
  meta(key TEXT PRIMARY KEY, value TEXT) — provenance + counts

Usage: python3 build_lexicon.py <mobypos.txt> <en_50k.txt> <out.db>
"""
import sys, sqlite3, re, os

TARGET = 20000

MOBY_MAP = {
    'N': 'noun', 'p': 'noun', 'h': None, 'V': 'verb', 't': 'verb',
    'i': 'verb', 'A': 'adjective', 'v': 'adverb', 'C': 'conjunction',
    'P': 'preposition', '!': 'interjection', 'r': 'pronoun',
    'D': 'determiner', 'I': 'determiner', 'o': 'noun',
}

# base, past, past participle (ing/3sg derived regularly)
IRREGULAR_VERBS = [
    ("be","was","been"),("have","had","had"),("do","did","done"),
    ("say","said","said"),("go","went","gone"),("get","got","got"),
    ("make","made","made"),("know","knew","known"),("think","thought","thought"),
    ("take","took","taken"),("see","saw","seen"),("come","came","come"),
    ("find","found","found"),("give","gave","given"),("tell","told","told"),
    ("become","became","become"),("show","showed","shown"),("leave","left","left"),
    ("feel","felt","felt"),("put","put","put"),("bring","brought","brought"),
    ("begin","began","begun"),("keep","kept","kept"),("hold","held","held"),
    ("write","wrote","written"),("stand","stood","stood"),("hear","heard","heard"),
    ("let","let","let"),("mean","meant","meant"),("set","set","set"),
    ("meet","met","met"),("run","ran","run"),("pay","paid","paid"),
    ("sit","sat","sat"),("speak","spoke","spoken"),("lie","lay","lain"),
    ("lead","led","led"),("read","read","read"),("grow","grew","grown"),
    ("lose","lost","lost"),("fall","fell","fallen"),("send","sent","sent"),
    ("build","built","built"),("understand","understood","understood"),
    ("draw","drew","drawn"),("break","broke","broken"),("spend","spent","spent"),
    ("cut","cut","cut"),("rise","rose","risen"),("drive","drove","driven"),
    ("buy","bought","bought"),("wear","wore","worn"),("choose","chose","chosen"),
    ("seek","sought","sought"),("throw","threw","thrown"),("catch","caught","caught"),
    ("deal","dealt","dealt"),("win","won","won"),("forget","forgot","forgotten"),
    ("lay","laid","laid"),("sell","sold","sold"),("fight","fought","fought"),
    ("bear","bore","borne"),("teach","taught","taught"),("eat","ate","eaten"),
    ("sing","sang","sung"),("strike","struck","struck"),("hang","hung","hung"),
    ("shake","shook","shaken"),("ride","rode","ridden"),("feed","fed","fed"),
    ("shoot","shot","shot"),("fly","flew","flown"),("sleep","slept","slept"),
    ("wake","woke","woken"),("swim","swam","swum"),("sweep","swept","swept"),
    ("steal","stole","stolen"),("slide","slid","slid"),("shine","shone","shone"),
    ("swear","swore","sworn"),("tear","tore","torn"),("beat","beat","beaten"),
    ("bind","bound","bound"),("bite","bit","bitten"),("blow","blew","blown"),
    ("bend","bent","bent"),("burst","burst","burst"),("cast","cast","cast"),
    ("cling","clung","clung"),("creep","crept","crept"),("dig","dug","dug"),
    ("drink","drank","drunk"),("freeze","froze","frozen"),("hide","hid","hidden"),
    ("hit","hit","hit"),("hurt","hurt","hurt"),("kneel","knelt","knelt"),
    ("light","lit","lit"),("quit","quit","quit"),("ring","rang","rung"),
    ("seize","seized","seized"),("shut","shut","shut"),("sink","sank","sunk"),
    ("spring","sprang","sprung"),("stick","stuck","stuck"),("sting","stung","stung"),
    ("swing","swung","swung"),("weep","wept","wept"),("wind","wound","wound"),
    ("bleed","bled","bled"),("breed","bred","bred"),("flee","fled","fled"),
    ("forgive","forgave","forgiven"),("shrink","shrank","shrunk"),
    ("spin","spun","spun"),("spread","spread","spread"),("tread","trod","trodden"),
    ("arise","arose","arisen"),("awake","awoke","awoken"),("dream","dreamt","dreamt"),
    ("kneel","knelt","knelt"),("lean","leant","leant"),("learn","learnt","learnt"),
    ("smell","smelt","smelt"),("spell","spelt","spelt"),("spill","spilt","spilt"),
    ("burn","burnt","burnt"),("dwell","dwelt","dwelt"),("prove","proved","proven"),
    ("saw","sawed","sawn"),("sew","sewed","sewn"),("sow","sowed","sown"),
    ("mow","mowed","mown"),("swell","swelled","swollen"),("forsake","forsook","forsaken"),
    ("slay","slew","slain"),("smite","smote","smitten"),("stride","strode","stridden"),
    ("strive","strove","striven"),("weave","wove","woven"),("cleave","clove","cloven"),
    ("bid","bade","bidden"),("chide","chid","chidden"),("gird","girt","girt"),
    ("behold","beheld","beheld"),("beseech","besought","besought"),
    ("bestride","bestrode","bestridden"),("befall","befell","befallen"),
    ("foresee","foresaw","foreseen"),("foretell","foretold","foretold"),
    ("mistake","mistook","mistaken"),("overcome","overcame","overcome"),
    ("overtake","overtook","overtaken"),("undergo","underwent","undergone"),
    ("undertake","undertook","undertaken"),("uphold","upheld","upheld"),
    ("withdraw","withdrew","withdrawn"),("withstand","withstood","withstood"),
    ("fish","fished","fished"),
]

IRREGULAR_PLURALS = {
    "men":"man","women":"woman","children":"child","feet":"foot","teeth":"tooth",
    "mice":"mouse","geese":"goose","people":"person","oxen":"ox","lice":"louse",
    "wives":"wife","lives":"life","knives":"knife","leaves":"leaf","selves":"self",
    "wolves":"wolf","halves":"half","loaves":"loaf","thieves":"thief",
    "shelves":"shelf","calves":"calf","elves":"elf",
}

BE_FORMS = {
    "am":("verb","3sg:be,person:1sg,present"),"is":("verb","3sg:be,present"),
    "are":("verb","present,plural-agr"),"was":("verb","past:be,singular-agr"),
    "were":("verb","past:be,plural-agr"),"been":("verb","pp:be"),
    "being":("verb","ing:be"),"be":("verb","base"),
}

def load_moby(path):
    lex = {}
    with open(path, encoding='latin-1') as f:
        for line in f:
            line = line.rstrip('\r\n')
            if '\\' not in line: continue
            word, codes = line.rsplit('\\', 1)
            word = word.strip().lower()
            if not word or ' ' in word or not re.fullmatch(r"[a-z][a-z'\-]*", word):
                continue
            classes, feats = [], set()
            for c in codes:
                m = MOBY_MAP.get(c)
                if m and m not in classes: classes.append(m)
                if c == 'p': feats.add('plural')
            if classes:
                prev = lex.get(word)
                if prev:
                    for cl in classes:
                        if cl not in prev[0]: prev[0].append(cl)
                    prev[1] |= feats
                else:
                    lex[word] = [classes, feats]
    return lex

def load_freq(path):
    ranks = {}
    with open(path, encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            w = line.split(' ')[0].strip().lower()
            if w and w not in ranks and re.fullmatch(r"[a-z][a-z'\-]*", w):
                ranks[w] = i
    return ranks

def main():
    moby_path, freq_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    moby = load_moby(moby_path)
    ranks = load_freq(freq_path)

    rows = {}
    def put(word, pos, alt, feat, rank):
        if word in rows:
            old = rows[word]
            feats = ','.join(sorted(set(filter(None, old[3].split(',') + feat.split(',')))))
            alts = ','.join(sorted(set(filter(None, old[2].split(',') + alt.split(',')))))
            rows[word] = (word, old[1], alts, feats, min(old[4], rank))
        else:
            rows[word] = (word, pos, alt, feat, rank)

    for w, (pos, feat) in BE_FORMS.items():
        put(w, pos, '', feat, ranks.get(w, 999999))
    for base, past, pp in IRREGULAR_VERBS:
        r = ranks.get(base, 999999)
        moby_alt = [c for c in (moby.get(base, [[], set()])[0]) if c != 'verb']
        put(base, 'verb', ','.join(moby_alt), 'base', r)
        put(past, 'verb', '', f'past:{base}', ranks.get(past, r))
        put(pp, 'verb', '', f'pp:{base}', ranks.get(pp, r))
    for plur, sing in IRREGULAR_PLURALS.items():
        put(plur, 'noun', '', f'plural,sing:{sing}', ranks.get(plur, 999999))

    by_rank = sorted(ranks.items(), key=lambda kv: kv[1])
    for w, r in by_rank:
        if len(rows) >= TARGET: break
        if w in rows: continue
        entry = moby.get(w)
        if not entry: continue
        classes, feats = entry
        put(w, classes[0], ','.join(classes[1:]), ','.join(sorted(feats)), r)

    if len(rows) < TARGET:
        for w, entry in sorted(moby.items()):
            if len(rows) >= TARGET: break
            if w in rows: continue
            classes, feats = entry
            put(w, classes[0], ','.join(classes[1:]), ','.join(sorted(feats)), 999999)

    if os.path.exists(out_path): os.remove(out_path)
    db = sqlite3.connect(out_path)
    db.execute("CREATE TABLE lexicon(word TEXT PRIMARY KEY, pos TEXT, alt TEXT, feat TEXT, rank INTEGER)")
    db.execute("CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT)")
    db.executemany("INSERT INTO lexicon VALUES(?,?,?,?,?)", rows.values())
    meta = {
        'entries': str(len(rows)),
        'pos_source': 'Moby Part-of-Speech (Grady Ward), Project Gutenberg #3203, PUBLIC DOMAIN, retrieved 2026-07-05',
        'freq_source': 'FrequencyWords en_50k 2018 (Hermit Dave, OpenSubtitles), CC-BY-SA 4.0, retrieved 2026-07-05',
        'built': '2026-07-05', 'target': str(TARGET), 'schema': 'word,pos,alt,feat,rank',
    }
    db.executemany("INSERT INTO meta VALUES(?,?)", meta.items())
    db.commit()
    db.execute("VACUUM")
    db.close()
    print(f"wrote {out_path}: {len(rows)} entries")

if __name__ == '__main__':
    main()
