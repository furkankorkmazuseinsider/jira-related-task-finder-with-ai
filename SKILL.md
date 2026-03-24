---
name: jira-related-task-finder
description: Verilen bir Jira task ID'si ile ilişkili (blocked by, blocks, relates to, parent, subtask, same epic) tüm taskları bulur ve tablo şeklinde listeler. Ayrıca AI destekli olarak task description, başlık ve commentlerini analiz ederek benzer/related taskları da bulur.
---

# Jira Related Task Finder (AI-Enhanced)

## Overview

Bu skill, verilen bir Jira task ID'si ile ilişkili tüm taskları bulur ve tablo şeklinde listeler. Task'ınız üzerinde çalışırken bağımlı veya ilişkili diğer tasklardan haberdar olmak için kullanılır.

**Yeni AI Özellikleri:**
- Task description içeriğine göre benzer taskları bulma
- Task summary (başlık) içeriğine göre benzer taskları bulma
- Task commentlerinde geçen diğer task referanslarını bulma

## When to Use This Skill

- Bir Jira task'ı üzerinde çalışırken ilişkili taskları görmek istendiğinde
- Blocked/Blocking ilişkilerini kontrol etmek istendiğinde
- Aynı epic/story içindeki diğer taskları görmek istendiğinde
- Parent/Sub-task ilişkilerini incelemek istendiğinde
- Description veya summary benzerliğine göre ilgili taskları bulmak istendiğinde
- Commentlerde bahsedilen diğer taskları görmek istendiğinde

## Workflow

### Step 1: Jira Kimlik Bilgilerini Alma

mcp.json dosyasından Jira URL, e-posta ve API token bilgilerini al:
- JIRA_URL: `https://[site].atlassian.net` (Jira Cloud için)
- JIRA_USERNAME: Jira hesabınla ilişkili e-posta
- JIRA_API_TOKEN: [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) adresinden oluşturulabilir

### Step 2: Task ID Doğrulama

Verilen task ID'sini al (örneğin: SD-135447, SEL-32456). Task ID formatını kontrol et.

### Step 3: Mevcut Jira İlişkilerini Bulma

Aşağıdaki endpoint'leri kullanarak task bilgilerini çek:

**Task detayları:**
```
GET /rest/api/3/issue/{taskId}
```

**Task relations (issue links):**
```
GET /rest/api/3/issue/{taskId}?fields=issuelinks
```

**Epic içindeki tüm tasklar:**
```
GET /rest/api/3/search?jql=parentEpic={epicKey}
```

**Subtasks:**
```
GET /rest/api/3/search?jql=parent={taskId}
```

### Step 4: Task İçeriğini Çekme

**Description almak:**
```
GET /rest/api/3/issue/{taskId}?fields=description
```

**Commentleri almak:**
```
GET /rest/api/3/issue/{taskId}/comment
```

### Step 5: Summary/Description Benzerlik Analizi

1. Aynı projedeki son N taskı çek:
   ```
   GET /rest/api/3/search?jql=project={projectKey} ORDER BY created DESC&maxResults=50
   ```

2. Text similarity algoritması kullanarak benzerlik skoru hesapla:
   - Task summary + description metnini birleştir
   - Keyword overlap veya TF-IDF benzerlik hesapla
   - Belirlenen threshold'un üzerindeki taskları listele

3. Benzerlik türlerini ayrıştır:
   - **AI-Summary**: Sadece summary benzerliği yüksek
   - **AI-Description**: Description benzerliği yüksek

### Step 6: Comment Analizi

Commentlerdeki Jira task ID referanslarını bul:
- Regex: `[A-Z]+-\d+` (örn: SD-12345, SEL-98765)
- Bu referansların olduğu taskları "AI-Comment" olarak listele

### Step 7: Sonuçları Birleştir ve Göster

Tüm ilişkileri tek tabloda göster. İlişki türünü belirt:

```
| Task Key | Summary | Status | Type | Relation Type | Score |
|----------|---------|--------|------|---------------|-------|
| SEL-32456 | Backend API development | In Progress | Story | Jira-Link (Blocks) | - |
| PROJ-123 | Similar feature description | Done | Task | AI-Summary | 0.85 |
| PROJ-456 | Related via comment | In Progress | Bug | AI-Comment | - |
```

## İlişki Türleri

| İlişki Türü | Kaynak | Açıklama |
|-------------|--------|----------|
| Blocks | Jira Link | Bu task engelliyor |
| Blocked By | Jira Link | Bu task engelleniyor |
| Relates to | Jira Link | İlişkili task |
| Parent | Jira Link | Üst task |
| Sub-task | Jira Link | Alt tasklar |
| Epic | Jira Link | Aynı epic içindeki tasklar |
| AI-Summary | AI Analizi | Summary benzerliği > threshold |
| AI-Description | AI Analizi | Description benzerliği > threshold |
| AI-Comment | AI Analizi | Commentlerde referans verilen task |

## Benzerlik Algoritması (Gelişmiş)

### 1. Metin Hazırlama
- Task summary + description metnini birleştir
- Stop words temizle (the, a, an, is, are, vb.)
- Küçük harfe çevir
- URL ve special karakterleri temizle

### 2. Entity Weighting (Domain-Specific Ağırlıklandırma)
Domain-specific kelimelere daha fazla ağırlık ver:

```python
# Component/Feature bazlı ağırlıklar
entity_weights = {
    # Product/Feature kelimeleri
    'coupon': 3, 'architect': 3, 'inapp': 2, 'in-app': 2,
    'template': 2, 'popup': 2, 'notification': 2, 'email': 2,
    'sms': 2, 'push': 2, 'webhook': 2, 'journey': 2,
    'segment': 2, 'user': 1, 'event': 2,

    # Customer/Partner
    'samsung': 2, 'partner': 1, 'customer': 1,

    # Issue kelimeleri
    'bug': 2, 'error': 2, 'wrong': 3, 'issue': 1,
    'fix': 2, 'problem': 1, 'crash': 3,

    # Platform
    'mobile': 2, 'android': 2, 'ios': 2, 'web': 2,
    'panel': 1, 'admin': 1
}
```

### 3. N-gram Matching
Tek kelime yerine 2-3 kelimelik grupları da kontrol et:

```
Metin: "wrong coupon distributed in In-App template"
N-grams: ["wrong coupon", "coupon distributed", "distributed in", "in in-app", "in-app template"]
```

### 4. Component/Feature Eşleştirme
Tasklardaki ortak componentleri çıkar ve eşleştir:

```python
# Component tespiti
components = {
    'architect', 'inapp', 'in-app', 'template',
    'popup', 'notification', 'email', 'sms', 'push',
    'journey', 'segment', 'campaign'
}

def extract_components(text):
    text_lower = text.lower()
    found = set()
    for comp in components:
        if comp in text_lower:
            found.add(comp)
    return found
```

### 5. Hybrid Score Hesaplama

```python
def calculate_hybrid_similarity(target_text, issue_text, target_components, issue_components):
    # A. Keyword similarity (weighted)
    keyword_score = weighted_keyword_similarity(target_text, issue_text, entity_weights)

    # B. N-gram similarity
    ngram_score = ngram_similarity(target_text, issue_text, n=2)

    # C. Component match
    component_match = len(target_components.intersection(issue_components)) / max(len(target_components), 1)

    # D. Bonus: Aynı customer/partner
    customer_bonus = 0.1 if has_common_customer(target_text, issue_text) else 0

    # Final score
    final_score = (
        0.4 * keyword_score +
        0.3 * ngram_score +
        0.2 * component_match +
        0.1 * component_match +  # component önemli
        customer_bonus
    )

    return min(final_score, 1.0)
```

### 6. Threshold
- **Önerilen**: 0.12 (düşük, daha fazla sonuç)
- Entity weighting + component matching ile yanlış pozitifler azaltılır

### Örnek: SD-134980 vs SD-132150

| Metrik | Önceki (Sadece Keyword) | Yeni (Hybrid) |
|--------|--------------------------|---------------|
| Keyword Score | 0.08 | 0.12 |
| N-gram Score | - | 0.00 |
| Component Match | - | 0.33 (inapp, template) |
| Issue Bonus | - | 0.00 |
| **Final Score** | **0.08** | **0.19** |
| Threshold | 0.15 | 0.12 |
| Bulunur mu? | ❌ | ✅ |

## API Kullanımı

REST API çağrıları için temel format:

```bash
# Basic Auth ile API çağrısı
curl -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://$JIRA_URL/rest/api/3/issue/SD-135447"
```

Detaylı API dokümantasyonu için bkz: [references/api_reference.md](references/api_reference.md)

Benzerlik skorunun nasıl hesaplandığı için bkz: [references/similarity_algorithm.md](references/similarity_algorithm.md)

Slack API entegrasyonu için bkz: [references/slack_api_reference.md](references/slack_api_reference.md)

## Step 8: Engineering Knowledge Base Plugin ile Slack Araması

✨ **Bu adım, ekb plugin enabled ise otomatik olarak çalışır. Token gerekmiyor!**

### Implementation (ekb Plugin)

```python
# Engineering Knowledge Base Plugin - No manual token needed!
# Plugin handles all authentication internally

# Step 9a: Direct Task ID Araması
slack_results_direct = ekb_plugin.search_slack(
    query=taskId,           # "OPT-225067"
    count=20,
    type="direct_mention"
)

# Step 9b: Keyword Araması (entity weighting ile)
keywords = extract_high_weight_keywords(task_summary)  # weight >= 2
slack_results_keywords = ekb_plugin.search_slack(
    query=" ".join(keywords),
    count=10,
    type="keyword_match"
)
```

### ✨ Plugin Avantajları

✅ **Token-free authentication:**
- Plugin kendi credential'larını yönetiyor
- mcp.json'da SLACK_USER_TOKEN'a gerek yok
- Token revoke/expiry sorunları yok

✅ **Built-in features:**
- Otomatik error handling
- Rate limiting (Tier 2: 20 req/min) yönetiliyor
- Duplikasyon kontrolü
- Message deduplication
- Automatic retry on rate limit

✅ **Production-ready:**
- Temiz ve maintainable kod
- Plugin tarafından düzenli güncelleniyor
- Security updates otomatik

### No Fallback Needed

✅ ekb plugin yeterli - manual Slack API çağrıları gereksiz!

## Step 9: Slack Sonuçlarını İşleme ve Filtreleme

✨ **ekb Plugin otomatik olarak aşağıdaları yapar:**

### 9a: Direct Task ID Araması (ekb)
```
Query: "{taskId}"  (örn: "SD-135447")
Result Type: "Direct Mention"
Max Results: 10 messages
Sorting: timestamp descending
```

### 9b: Keyword Araması (İki Path)

**9b-i: Global Workspace Search (ekb Plugin)**
```
Query: "{keyword1} {keyword2} {keyword3}"  (entity weight >= 2)
Result Type: "Keyword Match"
Max Results: 5 messages
Sorting: relevance score descending
API: search.messages (workspace-wide)
```

**9b-ii: High-Relevance Channel Search (Optional)**
⚠️ **search.messages API'nin sınırlaması:** Kanal filtresi desteklenmez — tüm workspace'de arar.

Çözüm: High-relevance channels için `conversations.history` endpoint kullanılır:
```
Target Channels:
- oxt-scalability-qa-support
- oxt-personalization-dev
- personalization-bugs
- personalization-features

Query: "{taskId}" | "{keywords}"
Method: Channel history iterate + client-side filter
Result Type: "Channel Direct Mention" / "Channel Keyword Match"
```

**Execution:**
```python
# High-relevance channels listesi
important_channels = [
    "oxt-scalability-qa-support",
    "oxt-personalization-dev",
    "personalization-bugs"
]

# Her kanal için history çek
for channel_name in important_channels:
    # 1. Kanal ID'sini al (cached)
    # 2. conversations.history çek (limit=100)
    # 3. Task ID veya keywords ile filter yap
    # 4. Bulunmuş sonuçları ekle (search.messages'dan dedup)
```

### 9c: Duplikasyon Kontrolü (ekb)
- Aynı mesaj her iki aramada da varsa: **Direct Mention** olarak işaretle
- Plugin otomatik olarak duplikasyon temizliyor

### 9d: Sonuç Filtreleme (ekb)
```python
results = {
    'direct_mentions': [msg1, msg2, ...],  # max 10
    'keyword_matches': [msg3, msg4, ...],  # max 5 (deduplicated)
    'total': len(direct_mentions) + len(keyword_matches)
}
```

## Step 10: Slack Sonuçlarını Tablo Olarak Göster

Slack sonuçları, Jira ilişkili tasklar tablosundan **ayrı** bir bölüm olarak gösterilir.

Tablo formatı:

```
## Slack Mentions ({taskId})

| Kanal | Mesaj Özeti | Gönderen | Tarih | Tür | Link |
|-------|-------------|----------|-------|-----|------|
| #team-engineering | "SD-135447 fix'i review'a açtım..." | furkan.korkmaz | 2026-03-20 | Direct Mention | [link] |
| #product-updates | "Smart Design Creator brand ayarları..." | ayse.yilmaz | 2026-03-18 | Keyword Match | [link] |
| #releases | "SD-135447 sprint'e alındı" | mehmet.demir | 2026-03-15 | Direct Mention | [link] |
```

### Tablo Detayları
- **Kanal:** Slack channel adı (#team-engineering)
- **Mesaj Özeti:** Mesajın ilk 50-60 karakteri (... ile sonlandırıl)
- **Gönderen:** Slack username'i (furkan.korkmaz)
- **Tarih:** ISO format tarihi (2026-03-20)
- **Tür:** "Direct Mention" veya "Keyword Match"
- **Link:** Slack message permalink (p1708123456789012 formatı)

---

## Örnek Kullanım

Kullanıcı: "SD-135447 taskı ile ilişkili tüm taskları göster"

Claude:
1. Jira API'ye bağlanır
2. SD-135447 taskının detaylarını çeker
3. Issuelinks alanını kontrol eder (Blocks, Blocked By, Relates to)
4. Epic içindeki diğer taskları bulur
5. Subtaskları kontrol eder
6. Task description ve summary bilgisini çeker
7. Aynı projedeki son 50 taskı çeker
8. Benzerlik analizi yapar (AI-Summary, AI-Description)
9. Commentlerdeki task referanslarını bulur (AI-Comment)
10. ✨ **[YENİ]** Slack token doğrulama (Step 8)
11. ✨ **[YENİ]** Slack'te task ID ve keyword araması yapılır (Step 9)
12. ✨ **[YENİ]** Slack sonuçlarını ayrı tablo olarak sunar (Step 10)
13. Tüm sonuçları birleştirip gösterir

## Çıktı Formatı

### Jira İlişkili Tasklar

```
| Task Key | Summary | Status | Type | Relation Type | Score |
|----------|---------|--------|------|---------------|-------|
| SEL-32456 | Backend API development | In Progress | Story | Jira-Link (Blocks) | - |
| SD-135448 | Database schema design | Done | Task | Jira-Link (Blocked By) | - |
| PROJ-123 | Similar feature description | Done | Task | AI-Summary | 0.75 |
| PROJ-456 | Related via description | In Progress | Task | AI-Description | 0.82 |
| PROJ-789 | Mentioned in comments | To Do | Bug | AI-Comment | - |
```

### Slack Mentions (Slack Token tanımlıysa)

✨ **YENİ BÖLÜM**

```
| Kanal | Mesaj Özeti | Gönderen | Tarih | Tür |
|-------|-------------|----------|-------|-----|
| #team-engineering | "SD-135447 fix'i review'a açtım, bakabilir misiniz?" | furkan.korkmaz | 2026-03-20 | Direct Mention |
| #product-updates | "Smart Design Creator brand ayarları tamamlandı" | ayse.yilmaz | 2026-03-18 | Keyword Match |
| #releases | "SD-135447 bu sprint'e alındı" | mehmet.demir | 2026-03-15 | Direct Mention |
```

## Verification

### Jira İşlemleri
1. Bir task ID verildiğinde tüm ilişki türlerini listele
2. Description benzerliği doğru çalışıyor mu kontrol et
3. Commentlerdeki task referansları bulunuyor mu kontrol et
4. Benzerlik skorları makul aralıkta mı (0-1 arası)

### Slack İntegrasyonu (YENİ)
5. ekb plugin active ve token-free authentication çalışıyor mu?
6. Global workspace search (search.messages) çalışıyor mu?
   - [ ] Task ID araması sonuç dönüyor mu?
   - [ ] Keyword araması sonuç dönüyor mu?
7. **[YENİ]** Channel-specific search (conversations.history) çalışıyor mu?
   - [ ] oxt-scalability-qa-support kanalında task bulunuyor mu?
   - [ ] High-relevance channels'da araması sonuç dönüyor mu?
   - [ ] Duplikasyon kontrolü yapılıyor mu?
8. Slack sonuçları ayrı bölüm olarak gösteriliyor mu?
9. Rate limiting aşılmıyor mu?
   - ✅ `ok: true` dönüyor mu?
   - ❌ Bot token (xoxb-) girildi mi? → Uyarı verildi mi?
   - ❌ Token geçersiz mi? → Hata mesajı verildi mi?
7. Direct mention araması (task ID) çalışıyor mu?
8. Keyword araması entity filtresiyle doğru çalışıyor mu?
   - Entity weights >= 2 olan kelimeleri seçiyor mu?
   - Max 5 kelime kullanıyor mu?
9. Rate limit (20 req/min) aşılmıyor mu?
10. Slack sonuçları ayrı bölüm olarak (Jira tablosundan ayrı) gösteriliyor mu?
11. Duplikasyon kontrolü yapılıyor mu? (aynı mesaj iki aramada da gelmişse Direct Mention olarak işaretleniyor mu?)
