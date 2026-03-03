# Jira REST API Reference

## Authentication

Jira Cloud API'ye erişim için Basic Auth kullanılır:

```bash
curl -u "email@example.com:API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://company.atlassian.net/rest/api/3/issue/SD-135447"
```

Environment variable'lar ile:
```bash
export JIRA_USERNAME="email@example.com"
export JIRA_API_TOKEN="your-api-token"
export JIRA_URL="https://company.atlassian.net"

curl -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  -H "Content-Type: application/json" \
  "$JIRA_URL/rest/api/3/issue/SD-135447"
```

## API Token Oluşturma

1. [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) adresine git
2. "Create API token" butonuna tıkla
3. Token'a bir isim ver
4. Token'ı kopyala ve güvenli bir yerde sakla

## Endpoints

### Get Issue Details

```http
GET /rest/api/3/issue/{issueIdOrKey}
```

Örnek:
```bash
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/issue/SD-135447" | jq .
```

Response'da şu alanlar önemli:
- `key`: Task ID (örn: SD-135447)
- `fields.summary`: Task başlığı
- `fields.status.name`: Durum
- `fields.issuetype.name`: Task tipi (Story, Task, Bug, Epic)
- `fields.parent`: Parent task (varsa)
- `fields.subtasks`: Subtasklar
- `fields.issuelinks`: İlişkili tasklar
- `fields.customfield_10014`: Epic key (Jira Cloud'da)

### Get Issue with Specific Fields

```http
GET /rest/api/3/issue/{issueIdOrKey}?fields=summary,status,issuetype,issuelinks,parent,subtasks,customfield_10014
```

### Search Issues (JQL)

```http
GET /rest/api/3/search?jql={jql}
```

Örnekler:

**Epic'teki tüm taskları bul:**
```bash
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/search?jql=parentEpic=SD-135447"
```

**Bir taskın subtasklarını bul:**
```bash
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/search?jql=parent=SD-135447"
```

**Bir taskı engelleyen taskları bul:**
```bash
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/search?jql=issueLinkType=Blocks AND outwardIssue=SD-135447"
```

## Issue Links (İlişki Türleri)

Issue links response'da `issuelinks` dizisi içinde gelir:

```json
{
  "id": "12345",
  "type": {
    "name": "Blocks",
    "inward": "is blocked by",
    "outward": "blocks"
  },
  "inwardIssue": {
    "key": "SD-135448",
    "fields": {
      "summary": "Task that is blocked",
      "status": { "name": "To Do" },
      "issuetype": { "name": "Task" }
    }
  },
  "outwardIssue": {
    "key": "SD-135449",
    "fields": {
      "summary": "Task that is blocking",
      "status": { "name": "In Progress" },
      "issuetype": { "name": "Task" }
    }
  }
}
```

### Common Link Types

| Link Type | Inward Description | Outward Description |
|-----------|---------------------|---------------------|
| Blocks | is blocked by | blocks |
| Relates to | relates to | relates to |
| Duplicate | is duplicated by | duplicates |
| Cloners | is cloned by | clones |

## Common JQL Queries

**Aynı epic'teki tasklar:**
```jql
parentEpic = "SD-135447"
```

**Subtasklar:**
```jql
parent = "SD-135447"
```

**Bir taskı engelleyenler:**
```jql
issueLinkType = "Blocks" AND outwardIssue = "SD-135447"
```

**Bir taskı engelleyen tasklar:**
```jql
issueLinkType = "Blocks" AND inwardIssue = "SD-135447"
```

**Aynı projedeki tasklar:**
```jql
project = "SD"
```

**Belirli bir assigne'ye atanmış tasklar:**
```jql
assignee = "john.doe@company.com"
```

## Rate Limiting

Jira Cloud API:
- Anonymous: 10 requests/second
- Authenticated: 10 requests/second
- Rate limit aşılırsa `429 Too Many Requests` hatası alınır

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Geçersiz parametre |
| 401 | Unauthorized - Geçersiz kimlik bilgisi |
| 403 | Forbidden - Yetersiz yetki |
| 404 | Not Found - Task bulunamadı |
| 429 | Too Many Requests - Rate limit aşıldı |
| 500 | Internal Server Error - Jira hatası |

## Python Örnekği

```python
import requests
from requests.auth import HTTPBasicAuth

JIRA_USERNAME = "email@example.com"
JIRA_API_TOKEN = "your-token"
JIRA_URL = "https://company.atlassian.net"

def get_issue(key):
    url = f"{JIRA_URL}/rest/api/3/issue/{key}"
    auth = HTTPBasicAuth(JIRA_USERNAME, JIRA_API_TOKEN)

    response = requests.get(
        url,
        auth=auth,
        headers={"Content-Type": "application/json"}
    )

    return response.json()

def search_issues(jql):
    url = f"{JIRA_URL}/rest/api/3/search"
    auth = HTTPBasicAuth(JIRA_USERNAME, JIRA_API_TOKEN)

    response = requests.get(
        url,
        auth=auth,
        params={"jql": jql},
        headers={"Content-Type": "application/json"}
    )

    return response.json()

# Örnek kullanım
issue = get_issue("SD-135447")
print(issue["fields"]["summary"])

# Epic'teki taskları bul
epic_tasks = search_issues('parentEpic = "SD-135447"')
for task in epic_tasks["issues"]:
    print(f"{task['key']}: {task['fields']['summary']}")
```

## Get Issue Description

Issue'un description alanını almak için:

```http
GET /rest/api/3/issue/{issueIdOrKey}?fields=description
```

Örnek:
```bash
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/issue/SD-135447?fields=description" | jq .
```

Response ( Atlassian Document Format - ADF):
```json
{
  "fields": {
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "Task description metni buraya"
            }
          ]
        }
      ]
    }
  }
}
```

**Description'ı düz metin olarak almak için:**
```python
def get_issue_description(key):
    url = f"{JIRA_URL}/rest/api/3/issue/{key}"
    auth = HTTPBasicAuth(JIRA_USERNAME, JIRA_API_TOKEN)

    response = requests.get(
        url,
        auth=auth,
        params={"fields": "description"},
        headers={"Content-Type": "application/json"}
    )

    data = response.json()
    description = data.get("fields", {}).get("description", {})

    # ADF'den düz metin çıkarma
    text = extract_text_from_adf(description)
    return text

def extract_text_from_adf(adf):
    """Atlassian Document Format'tan düz metin çıkarır"""
    if not adf or not adf.get("content"):
        return ""

    text_parts = []

    def traverse(node):
        if isinstance(node, dict):
            if node.get("type") == "text":
                text_parts.append(node.get("text", ""))
            for value in node.values():
                traverse(value)
        elif isinstance(node, list):
            for item in node:
                traverse(item)

    traverse(adf)
    return " ".join(text_parts)
```

## Get Issue Comments

Issue'un tüm commentlerini almak için:

```http
GET /rest/api/3/issue/{issueIdOrKey}/comment
```

Örnek:
```bash
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/issue/SD-135447/comment" | jq .
```

Response:
```json
{
  "comments": [
    {
      "id": "12345",
      "body": {
        "type": "doc",
        "version": 1,
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "This is a comment mentioning SEL-12345"
              }
            ]
          }
        ]
      },
      "author": {
        "displayName": "John Doe"
      },
      "created": "2024-01-15T10:30:00.000Z",
      "updated": "2024-01-15T10:30:00.000Z"
    }
  ],
  "startAt": 0,
  "maxResults": 50,
  "total": 1
}
```

**Python ile commentleri alma ve task ID'leri bulma:**
```python
import re

def get_issue_comments(key):
    url = f"{JIRA_URL}/rest/api/3/issue/{key}/comment"
    auth = HTTPBasicAuth(JIRA_USERNAME, JIRA_API_TOKEN)

    response = requests.get(
        url,
        auth=auth,
        headers={"Content-Type": "application/json"}
    )

    data = response.json()
    comments = data.get("comments", [])

    # Her comment'ten metin çıkar
    result = []
    for comment in comments:
        body = comment.get("body", {})
        text = extract_text_from_adf(body)
        result.append({
            "id": comment["id"],
            "author": comment["author"]["displayName"],
            "text": text,
            "created": comment["created"]
        })

    return result

def find_task_references_in_comments(comments):
    """Commentlerdeki Jira task ID referanslarını bulur"""
    # Regex: PROJ-12345 formatı
    task_pattern = re.compile(r'\b([A-Z]+-\d+)\b')

    referenced_tasks = set()
    for comment in comments:
        matches = task_pattern.findall(comment["text"])
        referenced_tasks.update(matches)

    return list(referenced_tasks)
```

## Search Issues for Similarity Analysis

Benzerlik analizi için aynı projedeki son N taskı çekmek için:

```http
GET /rest/api/3/search?jql=project={projectKey} ORDER BY created DESC&maxResults=50&fields=summary,description
```

Örnek:
```bash
curl -s -u "$JIRA_USERNAME:$JIRA_API_TOKEN" \
  "$JIRA_URL/rest/api/3/search?jql=project=SD ORDER BY created DESC&maxResults=50&fields=summary,description" | jq .
```

**Python ile benzerlik analizi:**
```python
def get_project_tasks_for_similarity(project_key, limit=50):
    """Projeden son N taskı alır"""
    url = f"{JIRA_URL}/rest/api/3/search"
    auth = HTTPBasicAuth(JIRA_USERNAME, JIRA_API_TOKEN)

    jql = f"project = {project_key} ORDER BY created DESC"

    response = requests.get(
        url,
        auth=auth,
        params={
            "jql": jql,
            "maxResults": limit,
            "fields": "summary,description,status,issuetype"
        },
        headers={"Content-Type": "application/json"}
    )

    data = response.json()
    return data.get("issues", [])

# ===== GELİŞMİŞ BENZERLİK ALGORİTMASI =====

import re
from collections import Counter

# Stop words
STOP_WORDS = {
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this',
    'that', 'these', 'those', 'it', 'its', 'we', 'you', 'they',
    'he', 'she', 'my', 'your', 'our', 'their', 'its', 'which',
    'what', 'who', 'whom', 'where', 'when', 'why', 'how'
}

# Domain-specific entity weights
ENTITY_WEIGHTS = {
    # Product/Feature kelimeleri (yüksek ağırlık)
    'coupon': 3, 'architect': 3, 'inapp': 3, 'in-app': 3,
    'template': 2, 'popup': 2, 'notification': 2, 'email': 2,
    'sms': 2, 'push': 2, 'webhook': 2, 'journey': 2,
    'segment': 2, 'event': 2, 'campaign': 2, 'automation': 2,

    # Issue kelimeleri
    'bug': 2, 'error': 2, 'wrong': 3, 'issue': 1,
    'fix': 2, 'problem': 1, 'crash': 3, 'broken': 2,
    'not working': 3, 'doesnt work': 3, "doesn't work": 3,

    # Platform
    'mobile': 2, 'android': 2, 'ios': 2, 'web': 2,
    'panel': 1, 'admin': 1, 'app': 1,

    # Customer
    'partner': 1, 'customer': 1,
}

# Component tespiti için keyword setleri
COMPONENTS = {
    'architect', 'inapp', 'in-app', 'template', 'popup', 'notification',
    'email', 'sms', 'push', 'webhook', 'journey', 'segment',
    'campaign', 'automation', 'channel', 'api', 'integration'
}

def clean_text(text):
    """Metni temizle: URL, special chars, extra spaces"""
    if not text:
        return ""
    # URL'leri kaldır
    text = re.sub(r'https?://\S+', '', text)
    # Special karakterleri kaldır (harf, rakam, space kalacak)
    text = re.sub(r'[^\w\s-]', ' ', text)
    # Multi space'leri tek space yap
    text = re.sub(r'\s+', ' ', text)
    return text.lower().strip()

def extract_keywords(text):
    """Stop words hariç keywordleri çıkar"""
    cleaned = clean_text(text)
    words = cleaned.split()
    return set(w for w in words if w not in STOP_WORDS and len(w) > 2)

def extract_weighted_keywords(text):
    """Ağırlıklı keywordleri çıkar"""
    keywords = extract_keywords(text)
    weighted = {}
    for kw in keywords:
        # En yüksek eşleşen ağırlığı al
        weight = 1
        for entity, w in ENTITY_WEIGHTS.items():
            if entity in kw or kw in entity:
                weight = max(weight, w)
        weighted[kw] = weight
    return weighted

def extract_ngrams(text, n=2):
    """N-gram çıkar"""
    cleaned = clean_text(text)
    words = cleaned.split()
    ngrams = set()
    for i in range(len(words) - n + 1):
        ngram = ' '.join(words[i:i+n])
        ngrams.add(ngram)
    return ngrams

def extract_components(text):
    """Metindeki componentleri tespit et"""
    cleaned = clean_text(text)
    found = set()
    for comp in COMPONENTS:
        if comp in cleaned:
            found.add(comp)
    return found

def weighted_keyword_similarity(text1, text2):
    """Ağırlıklı keyword benzerliği"""
    kw1 = extract_weighted_keywords(text1)
    kw2 = extract_weighted_keywords(text2)

    if not kw1 or not kw2:
        return 0.0

    # Ağırlıklı intersection
    intersection_weight = 0
    for kw, w1 in kw1.items():
        if kw in kw2:
            intersection_weight += min(w1, kw2[kw])

    total_weight = sum(kw1.values()) + sum(kw2.values())
    if total_weight == 0:
        return 0.0

    return (2 * intersection_weight) / total_weight

def ngram_similarity(text1, text2, n=2):
    """N-gram benzerliği"""
    ngrams1 = extract_ngrams(text1, n)
    ngrams2 = extract_ngrams(text2, n)

    if not ngrams1 or not ngrams2:
        return 0.0

    intersection = ngrams1.intersection(ngrams2)
    union = ngrams1.union(ngrams2)

    return len(intersection) / len(union)

def component_match_score(text1, text2):
    """Component eşleşme skoru"""
    comp1 = extract_components(text1)
    comp2 = extract_components(text2)

    if not comp1 or not comp2:
        return 0.0

    intersection = comp1.intersection(comp2)
    return len(intersection) / max(len(comp1), len(comp2))

def calculate_hybrid_similarity(text1, text2):
    """
    Hybrid benzerlik skoru hesaplar.
    Returns: (final_score, detail_dict)
    """
    # 1. Weighted keyword similarity
    kw_score = weighted_keyword_similarity(text1, text2)

    # 2. N-gram similarity (bigrams)
    ngram_score = ngram_similarity(text1, text2, n=2)

    # 3. Component match
    comp_score = component_match_score(text1, text2)

    # 4. Bonus: Issue type benzerliği (bug/wrong vs feature)
    issue_bonus = 0.0
    cleaned1 = clean_text(text1)
    cleaned2 = clean_text(text2)
    issue_words = {'bug', 'error', 'wrong', 'broken', 'crash', 'issue', 'problem'}
    has_issue1 = bool(issue_words.intersection(set(cleaned1.split())))
    has_issue2 = bool(issue_words.intersection(set(cleaned2.split())))
    if has_issue1 and has_issue2:
        issue_bonus = 0.05

    # Hybrid score: component'e daha fazla ağırlık ver
    final_score = (
        0.30 * kw_score +      # Keyword matching
        0.25 * ngram_score +  # N-gram matching
        0.25 * comp_score +   # Component match (yüksek öncelik)
        0.20 * comp_score +    # Component bonus
        issue_bonus            # Issue type bonus
    )

    return min(final_score, 1.0), {
        'keyword': round(kw_score, 3),
        'ngram': round(ngram_score, 3),
        'component': round(comp_score, 3),
        'bonus': issue_bonus
    }

# Eski uyumluluk fonksiyonu
def calculate_similarity(text1, text2):
    """Eski basit keyword overlap (geriye dönük uyumluluk)"""
    words1 = extract_keywords(text1)
    words2 = extract_keywords(text2)
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)

def find_similar_tasks(target_task, other_tasks, threshold=0.15):
    """Gelişmiş benzerlik algoritması ile benzer taskları bulur"""
    target_text = f"{target_task.get('summary', '')} {target_task.get('description', '')}"
    target_components = extract_components(target_text)

    similar_tasks = []
    for task in other_tasks:
        task_text = f"{task.get('summary', '')} {task.get('description', '')}"

        # Hybrid similarity
        score, details = calculate_hybrid_similarity(target_text, task_text)

        if score >= threshold:
            similar_tasks.append({
                'key': task['key'],
                'summary': task.get('summary', ''),
                'status': task.get('status', {}).get('name', '') if isinstance(task.get('status'), dict) else '',
                'type': task.get('issuetype', {}).get('name', '') if isinstance(task.get('issuetype'), dict) else '',
                'relation_type': 'AI-Hybrid',
                'score': round(score, 2),
                '_details': details
            })

    # Score'a göre sırala
    similar_tasks.sort(key=lambda x: x['score'], reverse=True)
    return similar_tasks

            # En yüksek skoru belirle
            if desc_score > summary_score:
                relation_type = "AI-Description"
                final_score = desc_score
            else:
                relation_type = "AI-Summary"
                final_score = summary_score

            similar_tasks.append({
                "key": task["key"],
                "summary": task.get("summary", ""),
                "status": task.get("status", {}).get("name", ""),
                "type": task.get("issuetype", {}).get("name", ""),
                "relation_type": relation_type,
                "score": round(final_score, 2)
            })

    # Score'a göre sırala
    similar_tasks.sort(key=lambda x: x["score"], reverse=True)
    return similar_tasks
```

## Combined Example: Full AI-Powered Task Finding

Tüm adımları birleştiren örnek:

```python
def find_all_related_tasks(task_id):
    """Bir task ile ilgili tüm taskları bulur (Jira links + AI analysis)"""

    # 1. Task detaylarını al
    task = get_issue(task_id)
    project_key = task["fields"]["project"]["key"]

    results = []

    # 2. Jira links (mevcut ilişkiler)
    issuelinks = task.get("fields", {}).get("issuelinks", [])
    for link in issuelinks:
        link_type = link.get("type", {}).get("name", "Relates to")

        if "outwardIssue" in link:
            issue = link["outwardIssue"]
            relation = f"Blocks" if link_type == "Blocks" else "Relates to"
            results.append({
                "key": issue["key"],
                "summary": issue["fields"]["summary"],
                "status": issue["fields"]["status"]["name"],
                "type": issue["fields"]["issuetype"]["name"],
                "relation_type": f"Jira-Link ({relation})",
                "score": "-"
            })

        if "inwardIssue" in link:
            issue = link["inwardIssue"]
            relation = "Blocked By" if link_type == "Blocks" else "Relates to"
            results.append({
                "key": issue["key"],
                "summary": issue["fields"]["summary"],
                "status": issue["fields"]["status"]["name"],
                "type": issue["fields"]["issuetype"]["name"],
                "relation_type": f"Jira-Link ({relation})",
                "score": "-"
            })

    # 3. AI: Description ve summary benzerliği
    target_summary = task["fields"].get("summary", "")
    target_description = extract_text_from_adf(
        task["fields"].get("description", {})
    )

    # Projeden son 50 taskı al
    project_tasks = get_project_tasks_for_similarity(project_key, limit=50)

    # Kendisi hariç diğer tasklarla karşılaştır
    other_tasks = [
        {
            "key": t["key"],
            "summary": t["fields"].get("summary", ""),
            "description": extract_text_from_adf(
                t["fields"].get("description", {})
            ),
            "status": t["fields"].get("status", {}).get("name", ""),
            "issuetype": t["fields"].get("issuetype", {}).get("name", "")
        }
        for t in project_tasks
        if t["key"] != task_id
    ]

    similar = find_similar_tasks(
        {"summary": target_summary, "description": target_description},
        other_tasks,
        threshold=0.3
    )
    results.extend(similar)

    # 4. AI: Commentlerdeki task referansları
    comments = get_issue_comments(task_id)
    referenced_task_keys = find_task_references_in_comments(comments)

    for ref_key in referenced_task_keys:
        if ref_key != task_id:  # Kendini referans verme
            try:
                ref_task = get_issue(ref_key)
                results.append({
                    "key": ref_task["key"],
                    "summary": ref_task["fields"]["summary"],
                    "status": ref_task["fields"]["status"]["name"],
                    "type": ref_task["fields"]["issuetype"]["name"],
                    "relation_type": "AI-Comment",
                    "score": "-"
                })
            except:
                pass  # Task bulunamadıysa atla

    # Tekrarları kaldır (aynı task birden fazla kez bulunabilir)
    seen = set()
    unique_results = []
    for r in results:
        if r["key"] not in seen:
            seen.add(r["key"])
            unique_results.append(r)

    return unique_results
```
