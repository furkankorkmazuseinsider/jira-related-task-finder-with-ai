# Benzerlik Skoru Nasil Hesaplanir?

## Kisa Ozet

Iki Jira task'inin birbirine ne kadar benzedigini **iki farkli yontemle** olcuyoruz ve sonuclari birlestiriyoruz:

1. **Semantic Search** — ekb plugin'in vektorel aramasi. Task'larin anlamina bakar, ayni kelimeleri kullanmasa bile ayni konudan bahsedenleri bulur. Ornegin "kupon hatasi" ile "wrong coupon" eslestirilebilir.

2. **IDF Tabanli Hybrid Skor** — Kelimeleri, kaliplari ve bolumleri karsilastiran matematiksel bir skor (0-1 arasi).

Her iki yontemin sonuclari birlestirilir. Bir task her iki yontemle de bulunuyorsa, bu en guclu eslesmedir.

---

## Yontem 1: Semantic Search (Anlam Bazli)

**Ne yapar:** Task'in basligini ve aciklamasini alir, ekb plugin'e verir. Plugin tum Jira task'lari icinde anlam bazli en benzer olanlari doner.

**Neden onemli:** Kelime bazli arama "coupon error" ile "kupon hatasi"ni eslestirmez. Semantic search anlami anladigi icin farkli dillerde veya farkli kelimelerle yazilmis ayni konuyu bulabilir.

**Nasil calisir:** Kullanicinin bilmesi gereken tek sey: bu arama "akilli" bir aramadir. Arka planda task metni sayisal vektorlere cevriliyor ve en yakin vektorler bulunuyor.

---

## Yontem 2: IDF Tabanli Hybrid Skor (Token Bazli)

Bu skor, 5 farkli bakis acisinin birlesiminden olusur:

```
Toplam = Kelime Benzerligi (%30)
       + Kalip Benzerligi (%25)
       + Bolum Benzerligi (%25)
       + Bolum Bonusu (%20)
       + Ekstra Bonuslar
```

### 1. Kelime Benzerligi (%30 katki)

**Ne yapar:** Iki task'in baslik ve aciklamasindaki ortak kelimelere bakar.

**Nasil calisir:** Her kelimeye bir "onem puani" atanir. Bu puan sabit bir liste degildir — projedeki son 50 task'a bakarak otomatik ogrenilir:

- Nadir kelimeler (sadece 2-3 task'ta gecen) → **yuksek puan** (ayirt edici)
- Yaygin kelimeler (neredeyse her task'ta gecen `update`, `fix`) → **dusuk puan** (ayirt edici degil)

**Ornek:** "coupon" kelimesi projede sadece 3 task'ta geciyorsa yuksek puan alir. "update" 40 task'ta geciyorsa dusuk puan alir.

### 2. Kalip Benzerligi (%25 katki)

**Ne yapar:** Yanyana gelen kelime ciftlerine bakar.

**Neden onemli:** "dynamic content" iki kelimelik bir kavramdir — tek basina "dynamic" veya "content" kadar anlamli degildir.

**Ornek:**
- Task A: "Smart Design Creator brand settings"
- Task B: "Smart Design Creator button CSS"
- Ortak kaliplar: "smart design", "design creator" → benzerlik var

### 3. Bolum Benzerligi (%25 katki)

**Ne yapar:** Task'larin ayni urun bolumuyle (component) ilgili olup olmadigini kontrol eder.

**Nereden bilir:** Uc kaynaktan:
1. Jira'daki `Components` alani (ekibin tanimladigi resmi liste)
2. Task basligindaki buyuk harfle baslayan kelimeler (orn. "Smart Design Creator")
3. Onemli kelime ciftleri (orn. "action builder")

### 4. Bolum Bonusu (%20 katki)

Ayni bolumle ilgili tasklar gercekten iliskili olma olasiligi cok yuksek. Bu yuzden component eslesmesi toplam skorda iki kez sayilir (%25 + %20 = %45).

### 5. Ekstra Bonuslar

| Durum | Ek Puan | Aciklama |
|-------|---------|----------|
| Her iki task da Bug | +0.08 | Ayni turde iki bug muhtemelen iliskilidir |
| Ortak label | +0.05/label (max +0.15) | Ayni etiketli tasklar iliskili olma egilimindedir |
| Ayni release | +0.05 | Ayni surum icin planlanan tasklar genelde birbirine baglidir |

---

## Iki Yontem Nasil Birlesir?

| Durum | Sonuc |
|-------|-------|
| Sadece semantic search buldu | `AI-Semantic` olarak listelenir |
| Sadece IDF skoru esigi gecti | `AI-Summary` veya `AI-Description` olarak listelenir |
| Her ikisi de buldu | En guclu eslesme — her iki etiketi de alir |

---

## Gercek Hayat Ornegi

**Task A:** "Smart Design Creator Brand Settings BE Prompt Changes"
**Task B:** "Smart Design Creator Button CSS Fix"

**Semantic search:** ekb plugin bu iki task'i "Smart Design Creator" baglami nedeniyle benzer buluyor → eslesti

**IDF hybrid skor:**

| Bakis Acisi | Ne Bulundu | Skor |
|-------------|------------|------|
| Kelime | "smart", "design", "creator" ortak (nadir) | 0.13 |
| Kalip | "smart design", "design creator" ortak | 0.08 |
| Bolum | "Smart Design Creator" ortak component | 0.13 |
| Bolum Bonusu | ayni component tekrar odullendirildi | 0.10 |
| Bug Bonusu | ikisi de bug degil | 0.00 |
| **Toplam** | | **0.44** |

Sonuc: Hem semantic search hem IDF (0.44 > 0.12) eslesti → **cok guclu eslesme**.

---

## Skor Esikleri (IDF Hybrid)

| Skor | Anlami | Ne Yapilir |
|------|--------|------------|
| < 0.12 | Benzer degil | Listelenmez |
| 0.12 - 0.39 | Benzer | `AI-Summary` veya `AI-Description` olarak listelenir |
| 0.40+ | Cok benzer | Listelenir, muhtemelen ayni konu veya duplicate |

---

## Neden Sabit Kelime Listesi Kullanmiyoruz?

Onceki versiyonda "coupon=3, template=2, kampanya=2" gibi sabit bir liste vardi. Bu sadece belirli bir ekip icin gecerliydi.

Simdi iki katmanli yaklasim:
- **Semantic search** → ekb'nin kendi modeli, hicbir ayar gerektirmez
- **IDF** → projedeki son 50 task'a bakarak hangi kelimelerin onemli oldugu otomatik ogrenilir

Hicbir sey hard-code degil — her projeye kendisi uyum sagliyor.

---

## Teknik Detay (Opsiyonel)

Bu bolum gelistiriciler icindir.

### IDF Hesabi

```
idf(kelime) = log(N / df)

N  = projedeki toplam task sayisi (orn. 50)
df = bu kelimenin gectigi task sayisi
```

### Score Formulu

```python
def calculate_similarity(target, other, project_corpus):
    idf = build_idf(project_corpus)

    target_tokens = tokenize(target.summary + " " + target.description)
    other_tokens  = tokenize(other.summary + " " + other.description)

    kw_score    = weighted_jaccard(target_tokens, other_tokens, idf)
    ngram_score = bigram_jaccard(target_tokens, other_tokens)

    target_components = (
        set(target.components) |
        capitalized_tokens(target.summary) |
        top_idf_bigrams(target_tokens, idf, k=5)
    )
    comp_score = component_match(target_components, other_tokens)

    issue_bonus      = 0.08 if (target.issuetype == "Bug" and other.issuetype == "Bug") else 0
    label_bonus      = min(0.15, 0.05 * len(common_labels(target, other)))
    fixversion_bonus = 0.05 if same_fixversion(target, other) else 0

    return min(1.0,
        0.30 * kw_score +
        0.25 * ngram_score +
        0.25 * comp_score +
        0.20 * comp_score +
        issue_bonus + label_bonus + fixversion_bonus
    )
```

### IDF Cache

- `scripts/cache/idf_<PROJECT>.json` — 7 gun gecerli
- Cache yoksa: ilk calistirmada son 50 task ile hizli hesaplanir
- Arka planda 1 yillik corpus ile zenginlestirilir
- Manuel rebuild: `python scripts/build_idf.py <PROJECT> --days 365`

### Semantic Search

```
ekb semantic_search query="{task summary + description}" sources="jira" limit=20
```

ekb plugin'in vektorel aramasi. Ek ayar gerektirmez, plugin kendi embedding modelini kullanir.
