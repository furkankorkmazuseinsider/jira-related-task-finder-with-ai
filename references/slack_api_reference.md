# Slack API Reference

## Authentication

Slack API'ye erişim için **User Token** (xoxp-) kullanılır. Bot Token (xoxb-) `search.messages` endpoint'i ile çalışmaz.

```bash
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     -H "Content-Type: application/json" \
     "https://slack.com/api/search.messages?query=SD-135447"
```

Environment variable'lar ile:
```bash
export SLACK_USER_TOKEN="xoxp-..."

curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     "https://slack.com/api/search.messages?query=SD-135447"
```

## User Token Oluşturma

1. https://api.slack.com/apps adresine git
2. "Create New App" → "From scratch" → Uygulama ismi ve workspace seç
3. Sol menu → "OAuth & Permissions"
4. "User Token Scopes" bölümüne git
5. `search:read` scope'u ekle
6. Sayfanın üstündeki "Install to Workspace" butonuna tıkla
7. "User OAuth Token" (xoxp-... ile başlayan) kopyala
8. mcp.json'daki `SLACK_USER_TOKEN`'a yapıştır

⚠️ **ÖNEMLİ**: Bot Token (xoxb-) girilirse `not_allowed_token_type` hatası alınır!

## Token Doğrulama (auth.test)

```http
GET https://slack.com/api/auth.test
```

```bash
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     "https://slack.com/api/auth.test"
```

Response (başarılı):
```json
{
  "ok": true,
  "url": "https://useinsider.slack.com/",
  "team": "useinsider",
  "user": "furkan.korkmaz",
  "user_id": "U0123456",
  "team_id": "T0123456"
}
```

Response (hata - bot token):
```json
{
  "ok": false,
  "error": "not_allowed_token_type"
}
```

Response (hata - geçersiz token):
```json
{
  "ok": false,
  "error": "invalid_auth"
}
```

## Message Search Endpoint

### Endpoint: search.messages (Workspace-wide)

```http
GET https://slack.com/api/search.messages
```

**⚠️ Sınırlama:** Belirli kanal'a filtrelenemez — tüm accessible channels'da arar.

### Query Parameters

| Parameter | Type | Required | Açıklama |
|-----------|------|----------|----------|
| `query` | string | ✅ | Aranacak metin (örn: "SD-135447" veya "Smart Design Creator") |
| `count` | integer | ❌ | Sayfa başı sonuç sayısı (default 20, max 100) |
| `page` | integer | ❌ | Sayfa numarası (default 1) |
| `sort` | string | ❌ | Sıralama: "score" (relevance) veya "timestamp" (default: "score") |
| `sort_dir` | string | ❌ | Sıralama yönü: "asc" veya "desc" (default: "desc") |

---

## Channel History Endpoint (Reference)

### Endpoint: conversations.history

```http
GET https://slack.com/api/conversations.history
```

**Note:** ekb plugin bu endpoint'i otomatik olarak kullanıyor (private channels için). Manual implementation gereken durumlar için referans olarak tutulmuştur.

### Query Parameters

| Parameter | Type | Required | Açıklama |
|-----------|------|----------|----------|
| `channel` | string | ✅ | Kanal ID'si (örn: "C0123456" veya kanal adı) |
| `limit` | integer | ❌ | Max sonuç sayısı (default 100, max 1000) |
| `oldest` | string | ❌ | Unix timestamp - belirtilen tarihten sonra |
| `latest` | string | ❌ | Unix timestamp - belirtilen tarihten önce |

### Örnek: Channel'da Task ID Araması

```bash
# 1. Kanal ID'sini al
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     "https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100"

# 2. Kanal history'sini fetch et ve client-side filter yap
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     "https://slack.com/api/conversations.history?channel=C0123456&limit=100"

# Client-side'da task ID kontrol et
# for msg in response.messages:
#     if "OPT-225067" in msg.text:
#         results.append(msg)
```

### Response Schema

```json
{
  "ok": true,
  "messages": [
    {
      "type": "message",
      "user": "U0123456",
      "text": "OPT-225067 bu kanalda konuşuldu",
      "ts": "1708123456.789012"
    },
    {
      "type": "message",
      "user": "U0234567",
      "text": "builder integration sorunu",
      "ts": "1707987654.654321"
    }
  ],
  "has_more": false
}
```

### Response Alanları

| Alan | Açıklama |
|------|----------|
| `messages[].text` | Mesaj metni |
| `messages[].user` | Gönderen user ID |
| `messages[].ts` | Slack timestamp |
| `has_more` | Daha fazla mesaj var mı (pagination) |

### Örnek: Task ID Araması

```bash
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     "https://slack.com/api/search.messages?query=SD-135447&count=20&sort=timestamp&sort_dir=desc"
```

### Örnek: Keyword Araması

```bash
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     "https://slack.com/api/search.messages?query=Smart+Design+Creator+Brand&count=10&sort=score&sort_dir=desc"
```

### Response Schema

```json
{
  "ok": true,
  "messages": {
    "total": 42,
    "pagination": {
      "page": 1,
      "page_count": 3,
      "page_size": 20
    },
    "matches": [
      {
        "type": "message",
        "text": "SD-135447 taskı ile ilgili bir sorun var. Kundaki frontend'de",
        "username": "furkan.korkmaz",
        "user_id": "U0123456",
        "ts": "1708123456.789012",
        "isodate": "2024-02-16T11:50:56Z",
        "permalink": "https://useinsider.slack.com/archives/C0123456/p1708123456789012",
        "channel": {
          "id": "C0123456",
          "name": "team-engineering"
        },
        "team": "T0123456"
      },
      {
        "type": "message",
        "text": "Smart Design Creator brand ayarları için PR'ı review ettim",
        "username": "ayse.yilmaz",
        "user_id": "U0234567",
        "ts": "1707987654.654321",
        "isodate": "2024-02-14T16:20:54Z",
        "permalink": "https://useinsider.slack.com/archives/C0234567/p1707987654654321",
        "channel": {
          "id": "C0234567",
          "name": "product-updates"
        },
        "team": "T0123456"
      }
    ]
  }
}
```

### Response Alanları

| Alan | Açıklama |
|------|----------|
| `ok` | İstek başarılı mı (true/false) |
| `messages.total` | Toplam eşleşen mesaj sayısı |
| `matches[].text` | Mesaj metni |
| `matches[].username` | Mesajı gönderen kişi |
| `matches[].ts` | Slack timestamp (Unix epoch + 6 digit) |
| `matches[].isodate` | ISO format tarih |
| `matches[].permalink` | Mesaja doğrudan link |
| `matches[].channel.name` | Kanal adı |
| `matches[].channel.id` | Kanal ID'si |

## Rate Limiting

Slack API'nin rate limit'leri:

| Tier | Requests | Süre |
|------|----------|------|
| Tier 1 (Premium) | 180 | 1 dakika |
| Tier 2 (Standard) | 20 | 1 dakika |
| Tier 3 (Free) | 1-2 | 1 saniye |

Jira Related Task Finder için Tier 2 (Standard) varsayılmıştır: **20 requests/minute**

### Rate Limit Handling

Rate limit aşılırsa `429 Too Many Requests` hatası ve `Retry-After` header'ı döner:

```json
{
  "ok": false,
  "error": "rate_limited",
  "retry_after": 30
}
```

**Çözüm:** İki arama (direct + keyword) arasında 1 saniye bekle. Toplam 2 çağrı = hiç sorun yok.

## Error Codes

| Error | HTTP | Açıklama | Çözüm |
|-------|------|----------|-------|
| `not_allowed_token_type` | 400 | Bot token (xoxb-) kullanılmış | User token (xoxp-) kullan |
| `invalid_auth` | 401 | Token geçersiz veya süresi dolmuş | Token'ı yenile |
| `missing_scope` | 403 | Token'da `search:read` scope yok | https://api.slack.com/apps → Token'a scope ekle |
| `no_permission` | 403 | Workspace'te yetkin yok | Workspace admin'den onay al |
| `request_timeout` | 500 | Slack API timeout | İsteği tekrar et |
| `rate_limited` | 429 | Rate limit aşıldı | Retry-After süre bekle |
| `team_access_not_granted` | 403 | App workspace'te install edilmemiş | https://api.slack.com/apps → "Install to Workspace" |

## Python Örneği

### Token Doğrulama

```python
import requests

def verify_slack_token(token):
    """Slack user token'ını doğrula"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get("https://slack.com/api/auth.test", headers=headers)
    data = response.json()

    if not data.get("ok"):
        error = data.get("error")
        if error == "not_allowed_token_type":
            return False, "Bot token (xoxb-) yerine User token (xoxp-) kullan!"
        elif error == "invalid_auth":
            return False, "Token geçersiz veya süresi dolmuş"
        elif error == "missing_scope":
            return False, "Token'da search:read scope yok"
        else:
            return False, f"Hata: {error}"

    return True, f"Token geçerli - User: {data['user']} - Team: {data['team']}"

# Kullanım
SLACK_USER_TOKEN = "xoxp-..."
success, msg = verify_slack_token(SLACK_USER_TOKEN)
print(msg)
```

### Mesaj Araması

```python
def search_slack_messages(token, query, count=20, sort="score"):
    """Slack'te mesaj ara"""
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "query": query,
        "count": count,
        "sort": sort,
        "sort_dir": "desc"
    }

    response = requests.get(
        "https://slack.com/api/search.messages",
        headers=headers,
        params=params
    )

    data = response.json()

    if not data.get("ok"):
        error = data.get("error")
        if error == "rate_limited":
            retry_after = response.headers.get("Retry-After", 30)
            return None, f"Rate limited - {retry_after} saniye bekle"
        else:
            return None, f"Hata: {error}"

    messages = []
    for match in data.get("messages", {}).get("matches", []):
        messages.append({
            "text": match["text"],
            "user": match["username"],
            "channel": match["channel"]["name"],
            "ts": match["ts"],
            "link": match["permalink"]
        })

    return messages, None

# Kullanım
SLACK_USER_TOKEN = "xoxp-..."

# Task ID araması
messages, error = search_slack_messages(SLACK_USER_TOKEN, "SD-135447", count=20)
if error:
    print(f"Hata: {error}")
else:
    for msg in messages:
        print(f"[#{msg['channel']}] {msg['user']}: {msg['text'][:50]}...")
```

### İki Arama Yapma (Direct + Keyword)

```python
def search_slack_related_to_task(token, task_id, summary):
    """Task'a ilişkin Slack mesajlarını bul"""
    results = []

    # 1. Direct Task ID araması
    messages, error = search_slack_messages(token, task_id, count=20)
    if messages:
        for msg in messages:
            results.append({
                "text": msg["text"],
                "channel": msg["channel"],
                "user": msg["user"],
                "ts": msg["ts"],
                "link": msg["link"],
                "type": "Direct Mention"
            })

    # 2. Keyword araması (summary'den yüksek ağırlıklı kelimeleri çıkar)
    import time
    time.sleep(1)  # Rate limit için bekleme

    entity_weights = {
        'coupon': 3, 'architect': 3, 'wrong': 3, 'crash': 3,
        'template': 2, 'inapp': 2, 'journey': 2, 'event': 2,
        'mobile': 2, 'web': 2, 'android': 2, 'bug': 2,
    }

    keywords = []
    for word in summary.lower().split():
        if word in entity_weights and entity_weights[word] >= 2:
            keywords.append(word)

    if keywords and len(keywords) >= 3:  # En az 3 yüksek ağırlıklı kelime
        query = " ".join(keywords[:5])  # Max 5 kelime
        messages, error = search_slack_messages(token, query, count=10)

        if messages:
            for msg in messages:
                # Duplicate kontrol
                if msg["text"][:50] not in [r["text"][:50] for r in results]:
                    results.append({
                        "text": msg["text"],
                        "channel": msg["channel"],
                        "user": msg["user"],
                        "ts": msg["ts"],
                        "link": msg["link"],
                        "type": "Keyword Match"
                    })

    return results

# Kullanım
task_id = "SD-135447"
summary = "Smart Design Creator Brand Settings BE Prompt Changes"

results = search_slack_related_to_task(SLACK_USER_TOKEN, task_id, summary)
print(f"Toplam {len(results)} mesaj bulundu:")
for result in results:
    print(f"  [{result['channel']}] {result['user']}: {result['type']}")
```

## Best Practices

### ✅ DO
- User Token (xoxp-) kullan
- Token'ın `search:read` scope'u var mı kontrol et
- İki arama arasında 1 saniye bekle (rate limit önlemek için)
- Slack mesajları güvenli bir şekilde sakla
- Permalink'leri oluşturmak için `channel.id` ve `ts` kullan

### ❌ DON'T
- Bot Token (xoxb-) kullanma
- Token'ı git'e commit etme
- Rate limit'i önemseme
- Çok genel arama sorguları (örn: "the", "a", "is")
- Yüzlerce mesajı işleme (max 20-30 yeterli)

## Test

```bash
# Token doğrulama
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     "https://slack.com/api/auth.test"

# Task ID araması
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     "https://slack.com/api/search.messages?query=SD-135447&count=10"

# Keyword araması
curl -H "Authorization: Bearer $SLACK_USER_TOKEN" \
     "https://slack.com/api/search.messages?query=Smart+Design&count=10"
```

## Referanslar

- **Slack API Documentation**: https://api.slack.com/methods/search.messages
- **OAuth Token Types**: https://api.slack.com/authentication/token-types
- **Rate Limiting**: https://api.slack.com/methods/search.messages#errors
