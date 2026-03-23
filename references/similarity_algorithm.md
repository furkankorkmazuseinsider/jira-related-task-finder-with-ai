# Benzerlik Skoru Nasıl Hesaplanır?

## Genel Bakış

Jira Related Task Finder, bir target task ile diğer tasklar arasındaki benzerliği hesaplamak için **Hybrid Similarity Algorithm** kullanır. Bu algoritma 4 farklı bileşeni birleştirir:

```
Final Score = 0.30 × Keyword + 0.25 × N-gram + 0.25 × Component + 0.20 × Component_Bonus + Bonus
```

---

## Bileşenler

### 1. Keyword Score (%30)

Metindeki kelimelerin eşleşme oranını hesaplar.

**Örnek:**
- Target: `Smart Design Creator Brand Settings BE Prompt Changes`
- Karşılaştırılan: `Smart Design Creator Button CSS`

```python
# Keyword extraction (stop words hariç)
target_keywords = {"smart", "design", "creator", "brand", "settings", "prompt", "changes"}
other_keywords  = {"smart", "design", "creator", "button", "css"}

# Entity weighting - önemli kelimelere daha fazla ağırlık
entity_weights = {
    'smart': 2, 'design': 2, 'creator': 2,  # Product/Feature
    'brand': 2, 'settings': 2,
    'coupon': 3, 'architect': 3, 'bug': 2, 'wrong': 3,  # Issue words
    'mobile': 2, 'web': 2, 'android': 2  # Platform
}

# Weighted intersection
intersection = {"smart", "design", "creator"}  # ortak kelimeler
intersection_weight = 2 + 2 + 2 = 6

# Jaccard with weights
keyword_score = 2 × 6 / (target_weight + other_weight)
```

### 2. N-gram Score (%25)

2 kelimelik grupların (bigrams) eşleşme oranı.

**Örnek:**
```
Target:  "smart design creator brand settings"
Bigrams: {"smart design", "design creator", "creator brand", "brand settings"}

Other:   "smart design creator button css"
Bigrams: {"smart design", "design creator", "creator button", "button css"}

Intersection: {"smart design", "design creator"}
N-gram score: 2 / 6 = 0.33
```

### 3. Component Score (%25)

Tasklardaki önemli component/feature'ların eşleşmesi.

```python
COMPONENTS = {
    'architect', 'inapp', 'in-app', 'template', 'popup',
    'notification', 'email', 'sms', 'push', 'webhook',
    'journey', 'segment', 'campaign', 'automation',
    'sdc', 'smart design', 'brand', 'settings'
}

# SD-135447: "Smart Design Creator Brand Settings"
target_components = {"smart design", "creator", "brand", "settings"}

# SD-136407: "Smart Design Creator Button CSS"
other_components = {"smart design", "creator"}

# Component match
component_score = len(intersection) / max(len(target), len(other))
                = 2 / 4 = 0.50
```

### 4. Issue Bonus

Her iki task da bir bug/issue içeriyorsa bonus eklenir.

```python
issue_words = {'bug', 'error', 'wrong', 'broken', 'crash', 'problem'}

# Her ikisinde de issue kelimesi varsa +0.08 bonus
if has_issue(target_text) and has_issue(other_text):
    score += 0.08
```

---

## Örnek Hesaplama

### SD-135447 vs SD-136407

| Değer | Hesaplama | Sonuç |
|-------|-----------|-------|
| **Keyword** | 0.30 × 0.43 | 0.129 |
| **N-gram** | 0.25 × 0.29 | 0.073 |
| **Component** | 0.25 × 0.50 | 0.125 |
| **Component Bonus** | 0.20 × 0.50 | 0.100 |
| **Issue Bonus** | +0.00 | 0.000 |
| **TOPLAM** | | **0.43** |

### SD-135447 vs SD-134621 (Clone)

| Değer | Hesaplama | Sonuç |
|-------|-----------|-------|
| **Keyword** | 0.30 × 0.65 | 0.195 |
| **N-gram** | 0.25 × 0.55 | 0.138 |
| **Component** | 0.25 × 0.75 | 0.188 |
| **Component Bonus** | 0.20 × 0.75 | 0.150 |
| **Issue Bonus** | +0.00 | 0.000 |
| **TOPLAM** | | **0.67** |

---

## Entity Weights Tablosu

Domain-specific kelimelere atanan ağırlıklar:

| Kategori | Kelimeler | Ağırlık |
|----------|-----------|---------|
| **Critical Issue** | coupon, architect, wrong, crash | 3 |
| **Product/Feature** | template, inapp, journey, event, campaign | 2 |
| **Platform** | mobile, web, android, ios | 2 |
| **Issue Type** | bug, error, fix, broken | 2 |
| **Standard** | Diğer tüm kelimeler | 1 |

---

## Component List

Otomatik tespit edilen component/feature'lar:

```
architect, inapp, in-app, template, popup, notification,
email, sms, push, webhook, journey, segment, campaign,
automation, channel, api, integration,
sdc, smart design, brand, settings
```

---

## Threshold

- **Default threshold: 0.12**
- Score ≥ 0.12 → "Benzer" olarak kabul edilir
- Score ≥ 0.40 → "Çok Benzer"

---

## JavaScript Implementasyonu

```javascript
const ENTITY_WEIGHTS = {
    'coupon': 3, 'architect': 3, 'wrong': 3, 'crash': 3,
    'template': 2, 'inapp': 2, 'journey': 2, 'event': 2,
    'mobile': 2, 'web': 2, 'android': 2, 'bug': 2,
    // ...diğerleri
};

const COMPONENTS = new Set([
    'architect', 'inapp', 'template', 'popup', 'notification',
    'sdc', 'smart design', 'brand', 'settings'
]);

function cleanText(text) {
    return text.toLowerCase()
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractKeywords(text) {
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
        // ...diğer stop words
    ]);
    const words = cleanText(text).split(' ');
    return words.filter(w => w.length > 2 && !stopWords.has(w));
}

function weightedKeywordSimilarity(text1, text2) {
    const kw1 = extractWeightedKeywords(text1);
    const kw2 = extractWeightedKeywords(text2);

    let intersectionWeight = 0;
    for (const kw of Object.keys(kw1)) {
        if (kw2[kw]) {
            intersectionWeight += Math.min(kw1[kw], kw2[kw]);
        }
    }
    const totalWeight = Object.values(kw1).reduce((a,b) => a+b, 0) +
                        Object.values(kw2).reduce((a,b) => a+b, 0);
    return totalWeight > 0 ? (2 * intersectionWeight) / totalWeight : 0;
}

function calculateSimilarity(text1, text2) {
    const kwScore = weightedKeywordSimilarity(text1, text2);
    const ngramScore = ngramSimilarity(text1, text2, 2);
    const compScore = componentMatchScore(text1, text2);

    const hasIssue1 = hasIssueWord(text1);
    const hasIssue2 = hasIssueWord(text2);
    const issueBonus = (hasIssue1 && hasIssue2) ? 0.08 : 0;

    return Math.min(1.0,
        0.30 * kwScore +
        0.25 * ngramScore +
        0.25 * compScore +
        0.20 * compScore +
        issueBonus
    );
}
```

---

## Sonuç

Bu algoritma sayesinde:

1. **Sadece ortak kelimeye** bakılmıyor
2. **Component/Feature** bazlı eşleşme yapılıyor
3. **Domain-specific kelimeler** daha önemli sayılıyor
4. **N-gram** ile phrase matching yapılıyor

Bu sayede commentlerde referans edilmese bile, benzer konulardaki tasklar bulunabiliyor.
