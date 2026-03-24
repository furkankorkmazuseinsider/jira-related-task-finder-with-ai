# CLAUDE.md - Jira Related Task Finder with AI

## Proje Özeti

**Amaç:** Verilen bir Jira task ID'si ile ilişkili tüm taskları bulur ve tablo şeklinde listeler.

**Ana Özellikler:**
- ✅ Jira Link ilişkilerini otomatik bulur (Blocks, Blocked By, Relates to, Parent, Sub-task, Same Epic)
- ✅ AI destekli benzerlik analizi (Summary, Description, Comment tabanlı)
- ✅ Hybrid Similarity Algorithm kullanır
- ✅ Task roadmap'ı görselleştirmeye yardımcı
- ✨ **[YENİ]** Slack'te task ID ve keyword araması (organizasyon workspace'i)
- ✨ **[YENİ]** Engineering Knowledge Base plugin entegrasyonu (Slack araması optimize)

**Status:** Production-ready skill, active development

---

## 🚀 Hızlı Başlangıç

### 1. Ortamı Hazırla
```bash
cd /Users/furkan.korkmaz/jira-related-task-finder-with-ai
```

Jira credentials'ı **mcp.json**'da bulunur (zaten konfigüre edilmiş):
- `JIRA_URL`: Jira Cloud URL
- `JIRA_USERNAME`: API kullanıcısı
- `JIRA_API_TOKEN`: API token

### 2. Skill'i Kullan
```
/jira-related-task-finder SD-135447
```

Claude otomatik olarak:
1. Jira API'ye bağlanır
2. Task ilişkilerini çeker (Links, Epic, Subtasks)
3. Description/Summary benzerliğini analiz eder
4. Comment referanslarını bulur
5. ✨ **[YENİ]** Slack'te task ID ve keyword araması yapar (token varsa)
6. Sonuçları tablo olarak sunar

---

## 📁 Proje Yapısı

```
.
├── CLAUDE.md                          # Bu dosya (Claude Code rehberi)
├── SKILL.md                          # Skill tanımı ve workflow
├── mcp.json                          # MCP server config (Jira + Slack credentials)
├── README.md                         # Başlık (genişletilebilir)
└── references/
    ├── api_reference.md              # Jira API endpoint referansı
    ├── similarity_algorithm.md       # Benzerlik algoritması detayları
    └── slack_api_reference.md        # ✨ [YENİ] Slack API endpoint referansı
```

---

## 🔧 İş Akışı (Workflow)

### Adım 1: Task Kimliği Al
Kullanıcı bir Jira task ID'si sağlar (örn: `SD-135447`)

### Adım 2: Jira API ile Bağlantı
- mcp.json'dan credentials okunur
- Basic Auth ile API çağrıları yapılır

### Adım 3: Doğrudan İlişkileri Bul
```
GET /rest/api/3/issue/{taskId}?fields=issuelinks
```
- **Blocks**: Bu task hangi taskları engelliyor?
- **Blocked By**: Bu task hangi tasklar tarafından engelleniyor?
- **Relates to**: İlişkili tasklar nelerdir?
- **Parent**: Üst task nedir?
- **Sub-tasks**: Alt tasklar nelerdir?
- **Same Epic**: Aynı epic'deki tasklar

### Adım 4: Benzerlik Analizi
1. **Description Benzerliği** (Hybrid Algorithm)
   - Target task'ın description'ını çek
   - Aynı projedeki son 50 task'ı çek
   - Her task için similarity score hesapla
   - Threshold > 0.12 olanları listele

2. **Summary Benzerliği**
   - Task başlığı (summary) için de benzerlik hesapla

3. **N-gram & Component Matching**
   - 2 kelimelik grupları eşleştir
   - Domain-specific components tespit et (template, coupon, architect, vb.)

### Adım 5: Comment Analizi
```regex
[A-Z]+-\d+
```
- Commentlerde referans edilen diğer task ID'lerini bul
- Bu taskları "AI-Comment" ilişkisi olarak listele

### Adım 6: Sonuçları Sunuş
```
| Task Key | Summary | Status | Type | Relation Type | Score |
|----------|---------|--------|------|---------------|-------|
| SEL-32456 | Backend API dev | In Progress | Story | Jira-Link (Blocks) | - |
| SD-135448 | DB schema design | Done | Task | Jira-Link (Blocked By) | - |
| PROJ-123 | Similar feature | Done | Task | AI-Summary | 0.75 |
| PROJ-456 | Related description | In Progress | Task | AI-Description | 0.82 |
| PROJ-789 | Mentioned in comments | To Do | Bug | AI-Comment | - |
```

---

## 🤖 Benzerlik Algoritması (Hybrid)

**Final Score Formula:**
```
Score = 0.30 × Keyword + 0.25 × N-gram + 0.25 × Component + 0.20 × Component_Bonus + Bonus
```

### Bileşenler:

| Bileşen | Ağırlık | Açıklama |
|---------|---------|----------|
| **Keyword Score** | 30% | Kelimelerin eşleşme oranı (domain-specific ağırlık) |
| **N-gram Score** | 25% | 2 kelimelik grupların (bigrams) eşleşmesi |
| **Component Match** | 25% | Template, coupon, architect, vb. önemli kelimelerin eşleşmesi |
| **Component Bonus** | 20% | Component eşleşmesinin extra ağırlığı |
| **Issue Bonus** | +0.08 | Her ikisinde de bug/error varsa bonus |

### Entity Weights (Domain-Specific):
```
Critical Issues:  coupon (3), architect (3), wrong (3), crash (3)
Product/Feature:  template (2), inapp (2), journey (2), event (2)
Platform:         mobile (2), web (2), android (2), ios (2)
Issue Types:      bug (2), error (2), fix (2), broken (2)
Standard:         Diğer kelimeler (1)
```

### Threshold:
- **Default:** 0.12
- Score ≥ 0.12 → "Benzer" kabul
- Score ≥ 0.40 → "Çok Benzer"

Detaylı algoritma açıklaması: [references/similarity_algorithm.md](references/similarity_algorithm.md)

---

## 🔐 Güvenlik & Credentials

### ⚠️ ÖNEMLI
`mcp.json` dosyası **API tokens** içerir:
- `JIRA_API_TOKEN`: Jira API token
- `CONFLUENCE_API_TOKEN`: Confluence API token
- `SLACK_USER_TOKEN`: ✨ **[YENİ]** Slack User OAuth Token (xoxp-...)

**GIT'E COMMIT ETME!**
```bash
# Zaten .gitignore'da varsa, kontrol et:
cat .gitignore | grep mcp.json
```

### Slack Token Uyarısı
- **User Token (xoxp-) KULLAN** — Bot Token (xoxb-) çalışmaz
- Token, organizasyonun workspace'inde `search:read` scope'u ile oluşturulmalı
- Token yoksa Slack araması otomatik atlanır (skill normal çalışır)

### Token Yönetimi

**Jira & Confluence:**
1. https://id.atlassian.com/manage-profile/security/api-tokens adresinden token oluştur
2. mcp.json'a `JIRA_API_TOKEN` ve `CONFLUENCE_API_TOKEN` olarak ekle

**Slack:** ✨ **[YENİ]**
1. https://api.slack.com/apps adresine git → "Create New App" → "From scratch"
2. App'a isim ver ve workspace seç
3. "OAuth & Permissions" → "User Token Scopes" → `search:read` ekle
4. "Install to Workspace" → **User OAuth Token** (xoxp-...) kopyala
5. mcp.json'a `SLACK_USER_TOKEN` olarak ekle

**Genel:**
- Loglara token'ı yazmamak için dikkat et
- Token'ı değiştirmek istersen yeni bir tane oluştur
- Slack token, organizasyon workspace'indeki `search:read` scope'u ile oluşturulmalı

---

## 📝 Dosya Rehberi

### SKILL.md
- Skill tanımı ve meta bilgiler
- Workflow adımları (Step 1-10)
  - Step 1-7: Jira işlemleri
  - ✨ Step 8-10: Slack araması (YENİ)
- API endpoint referansları
- İlişki türleri tablosu
- Benzerlik algoritması detayları
- Örnek kullanım ve çıktı formatı
- Verification checklist (Jira + Slack)

### references/api_reference.md
- Jira REST API v3 endpoint'leri
- Query parameter'ları
- Response format'ları
- Authentication
- Rate limiting

### references/slack_api_reference.md ✨ **[YENİ]**
- Slack User Token kurulumu
- `search.messages` endpoint (parametreler, response şeması)
- `auth.test` endpoint (token doğrulama)
- Rate Limiting (Tier 2: 20 req/min)
- Error Codes (not_allowed_token_type, missing_scope, vb.)
- Python örnekleri (token doğrulama, arama, duplikasyon kontrolü)

### references/similarity_algorithm.md
- Benzerlik skorunun nasıl hesaplandığı
- 4 bileşenin detaylı açıklaması
- Entity weights tablosu
- JavaScript implementasyon örneği
- Örnek hesaplamalar (SD-135447 vs SD-136407)

### mcp.json
- MCP server konfigürasyonu
- Jira/Confluence credentials
- Environment variables

---

## 🔌 Plugin Integration (Engineering Knowledge Base)

✨ **Slack araması** engineering-knowledge-base plugin ile yapılıyor!
✨ **Token-free!** Manual authentication gerekmiyor!

### ekb Plugin (Step 8-10)

**Plugin avantajları:**
- 🔐 **Token-free authentication** - Plugin kendi credential'larını yönetiyor
- ⚡ **Built-in caching** - Tekrarlayan sorgularda hızlı yanıt
- 🛡️ **Error handling** - Rate limits, network errors otomatik yönetiliyor
- 🔄 **Deduplication** - Duplikasyon otomatik kontrol edilir
- 📊 **Rate limiting management** - Slack Tier 2 (20 req/min) otomatik
- 🔍 **Smart search** - Direct ID + keyword araması

**Implementation:**

```python
# Step 8-10: ekb plugin ile Slack araması
# NO MANUAL TOKEN NEEDED!

ekb_result_direct = ekb_plugin.search_slack(
    query=taskId,           # "OPT-225067"
    count=20,
    type="direct_mention"
)

ekb_result_keywords = ekb_plugin.search_slack(
    query=high_weight_keywords,  # entity_weights >= 2
    count=10,
    type="keyword_match"
)

# Plugin handles everything:
# ✅ Authentication (no token needed)
# ✅ Error handling
# ✅ Deduplication
# ✅ Rate limiting
# ✅ Caching
```

**Status:**
- ✅ **ekb plugin:** Active & token-free
- ✅ **mcp.json:** SLACK_USER_TOKEN silinebilir (not needed)
- ✅ **Documentation:** Updated
- ✅ **Production:** Ready!

**Known Limitation & Solution:**
- ⚠️ `search.messages` API workspace-wide arama yapar — belirli kanal'a filtrelenemez
- ✅ **Çözüm:** High-relevance channels için `conversations.history` endpoint kullanılıyor
  - Target channels: `oxt-scalability-qa-support`, `oxt-personalization-dev`, `personalization-bugs`
  - Client-side filtering ile task ID/keywords eşleşme kontrol ediliyor
  - Dedupe: Global search ile combined results duplikasyon kontrolü yapılıyor

Detay: [SKILL.md](SKILL.md) - Step 9b-ii bakınız.
[slack_api_reference.md](references/slack_api_reference.md) - `conversations.history` endpoint

---

## 🔄 Geliştirilecek Özellikler

### Phase 2: Performance
- [ ] Caching (Redis/In-memory) - Sık sorgulan task'lar
- [ ] Batch processing - Büyük projeler için
- [ ] Rate limiting optimization

### Phase 3: Advanced Features
- [ ] Sprint bazlı task filtreleme
- [ ] Custom weight profiles (proje/team bazlı)
- [ ] Task dependency graph visualizasyonu
- [ ] Slack/Teams integration

### Phase 4: ML Improvements
- [ ] Fine-tuned similarity model
- [ ] User feedback loop (benzerlik skorlarını iyileştirme)
- [ ] Anomaly detection (unusual relationships)

---

## 📊 Örnek Senaryolar

### Senaryo 1: Bug Fix Tracking
```
User: "SD-135447 ile ilişkili tüm taskları göster"

Result:
- Blocks: SEL-32456 (API development) - Bu bug fix'i block ediyor
- Blocked By: SD-135448 (DB schema) - Veritabanı hazırlanmasını bekliyor
- AI-Summary: PROJ-123 (Similar bug) - İlgili bug
- AI-Comment: PROJ-789 - Commentlerde referans edilmiş
```

### Senaryo 2: Feature Implementation
```
User: "Smart Design Creator feature'ının tüm task'larını göster"

Result:
- Same Epic: SD-134621, SD-136407, SD-136555
- Blocked By: SD-135447 (Brand Settings)
- AI-Description: PROJ-555 (Similar feature) - Score: 0.73
```

### Senaryo 3: Task Dependencies
```
User: "INAPP-444 task'ının roadmap'ını çıkar"

Result:
- Blocks: INAPP-445, INAPP-446 (dependencies)
- Blocked By: INAPP-442, INAPP-443 (prerequisites)
- Related: INAPP-555, INAPP-666 (coordination)
```

---

## 🎯 Best Practices

### ✅ DO
- Task ID'lerini doğru format'ta sağla (PROJECT-12345)
- Regular olarak similarity threshold'u kontrol et
- API token'ı güvenli tut
- Slack User Token (xoxp-) kullan
- Slack token'ının `search:read` scope'u var mı kontrol et
- Large project'ler için batch processing kullan
- Result'ları task tracking'de kullan

### ❌ DON'T
- Sensitive information'ı comments'e yazmayın
- Token'ları share etmeyin
- mcp.json'ı git'e commit etmeyin
- Threshold'u çok düşük set etme (false positive'ler artar)
- API'yi saniye başına 10+ çağrı yap
- ⚠️ Bot Token (xoxb-) Slack'e girilmesin — `search.messages` çalışmaz
- ⚠️ Slack'te çok genel arama yapma ("the", "a", "is")

---

## 🧪 Testing & Verification

### Manuel Test

**Jira:**
```bash
# Jira connection test
curl -u "JIRA_USERNAME:JIRA_API_TOKEN" \
  "https://JIRA_URL/rest/api/3/myself"

# Specific task test
curl -u "JIRA_USERNAME:JIRA_API_TOKEN" \
  "https://JIRA_URL/rest/api/3/issue/SD-135447"
```

**Slack:** ✨ **[YENİ]**
```bash
# Slack token validation
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
  "https://slack.com/api/auth.test"

# Search for task ID
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
  "https://slack.com/api/search.messages?query=SD-135447&count=10"

# Search for keywords
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
  "https://slack.com/api/search.messages?query=Smart+Design+Creator&count=10"
```

### Verification Checklist

**Jira:**
- [ ] Jira connection works
- [ ] Task links correctly identified
- [ ] Description similarity works
- [ ] N-gram matching finds related tasks
- [ ] Comment references are detected
- [ ] Scores are in 0-1 range
- [ ] Threshold filtering works correctly

**Slack:** ✨ **[YENİ]**
- [ ] Slack token mcp.json'da tanımlı mı?
- [ ] Token doğrulama (`auth.test`) başarılı mı?
- [ ] Token xoxp- (User Token) mı? (xoxb- uyarısı mı?)
- [ ] Token invalid_auth dönmüyor mu?
- [ ] Token missing_scope dönmüyor mu?
- [ ] Direct mention araması (task ID) çalışıyor mu?
- [ ] Keyword araması entity filtresiyle çalışıyor mu?
- [ ] Rate limit aşılmıyor mu?
- [ ] Slack sonuçları ayrı bölüm olarak gösteriliyor mu?
- [ ] Duplikasyon kontrolü yapılıyor mu?

---

## 🤝 Contribution Guidelines

### Branch Strategy
```
main                    (production skill)
├── feature/algo-*     (algorithm improvements)
├── feature/api-*      (new API endpoints)
└── bugfix/*           (fixes)
```

### Commit Message Format
```
feat: add entity weighting to similarity algorithm
fix: correct n-gram calculation
docs: update threshold recommendations
```

### Code Review Checklist
- [ ] Algorithm changes have test data
- [ ] API changes documented
- [ ] Performance impact analyzed
- [ ] Security implications reviewed
- [ ] Comments updated

---

## 📚 Referanslar

- **Jira API:** https://developer.atlassian.com/cloud/jira/rest/v3/
- **Slack API:** https://api.slack.com/methods/search.messages ✨ **[YENİ]**
- **MCP Spec:** https://modelcontextprotocol.io/
- **Similarity Algorithms:** TF-IDF, Jaccard, N-gram
- **Entity Weighting:** Domain-specific NLP

---

## 📞 Support

### Troubleshooting

**Problem:** "Invalid Jira credentials"
- **Solution:** mcp.json'daki JIRA_URL ve tokens'ı kontrol et

**Problem:** "Task not found"
- **Solution:** Task ID'sinin doğru format'ta olduğunu kontrol et (PROJECT-12345)

**Problem:** "Similarity scores too low"
- **Solution:** Threshold'u düşür (0.10'a) veya entity weights'ı ayarla

**Problem:** "API Rate Limit"
- **Solution:** İstekleri batch et veya caching ekle

### Slack Troubleshooting ✨ **[YENİ]**

**Problem:** "not_allowed_token_type" hatası
- **Solution:** Bot token (xoxb-) yerine User token (xoxp-) kullanıldığından emin ol. https://api.slack.com/apps adresine git, token'ı sil ve yeni User token oluştur.

**Problem:** "missing_scope" hatası
- **Solution:** Slack app'ine `search:read` scope'u ekle ve workspace'e yeniden install et. https://api.slack.com/apps → OAuth & Permissions → User Token Scopes

**Problem:** "invalid_auth" hatası
- **Solution:** Token geçersiz veya süresi dolmuş. Yeni bir User token oluştur ve mcp.json'da güncelle.

**Problem:** "no_permission" hatası
- **Solution:** Workspace admin'i, oluşturduğun Slack app'ını workspace'te install etmesini iste.

**Problem:** Slack sonuçları görünmüyor
- **Solution:**
  1. SLACK_USER_TOKEN mcp.json'da tanımlı mı kontrol et
  2. Token'ın xoxp- ile başladığını kontrol et
  3. Token geçerliliğini test et: `curl -H "Authorization: Bearer $SLACK_USER_TOKEN" "https://slack.com/api/auth.test"`
  4. Network connectivity kontrol et

**Problem:** Slack araması çok az sonuç dönüyor
- **Solution:**
  1. Task summary'de yüksek ağırlıklı kelime yok mu? Entity weights'ı kontrol et
  2. Keyword araması kıs mı? (min 3 kelime gereklidir)
  3. Search.messages için max count 100 — daha fazla sonuç isteniyorsa pagination yapılmaz

---

## 📝 Notlar

- **Last Updated:** 2026-03-23 (✨ Slack entegrasyonu eklendi)
- **Maintainer:** Furkan Korkmaz
- **Status:** Production-ready (Jira + Slack)
- **License:** Internal Use Only

### Son Güncellemeler (2026-03-23)
- ✨ Slack `search.messages` entegrasyonu eklendi
- ✨ Step 8-10 workflow güncellendi
- ✨ `references/slack_api_reference.md` oluşturuldu
- ✨ mcp.json'a `SLACK_USER_TOKEN` field'ı eklendi
- ✨ Slack token kurulum rehberi eklendi
- ✨ Rate limit ve error handling dokumentasyonu eklendi
