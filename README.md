# Jira Related Task Finder

Bir Jira task ID'si verildiğinde, o task ile ilişkili tüm taskları bulan Claude Code skill'i.

Jira link ilişkileri, AI benzerlik analizi, semantic search, PR/kod analizi, Sentry bug korelasyonu, Slack mention'ları ve Confluence dokümanlarını birleştirerek kapsamlı bir ilişki haritası çıkarır.

## Gereksinimler

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI kurulu olmalı
- ekb (engineering-knowledge-base) MCP plugin'i aktif olmalı
- Jira Cloud hesabı ve API token'ı

## Kurulum

### 1. Repo'yu klonla

```bash
git clone <repo-url>
cd jira-related-task-finder-with-ai
```

### 2. Jira credentials'ı ayarla

Proje kök dizininde `mcp.json` dosyası oluştur:

```json
{
  "mcpServers": {
    "jira": {
      "env": {
        "JIRA_URL": "sirket.atlassian.net",
        "JIRA_USERNAME": "email@sirket.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**API token almak için:** [Atlassian API Token](https://id.atlassian.com/manage-profile/security/api-tokens) sayfasından oluşturabilirsin.

> **Not:** `mcp.json` dosyası `.gitignore`'da tanımlıdır, commit edilmez.

### 3. ekb plugin'i kontrol et

Claude Code içinde ekb plugin'in aktif olduğunu doğrula. Skill, 9 farklı ekb tool'u kullanır:

| Tool | Amaç |
|------|------|
| `jira` | Task detay, JQL arama |
| `semantic_search` | Vektörel benzerlik (Jira + Slack) |
| `github` | PR detay, değişen dosyalar |
| `git` | Dosya geçmişi |
| `regex_search` | Exact match (task ID, PR URL) |
| `sentry` | Bug korelasyonu |
| `lookup` | Confluence sayfa içeriği |
| `hybrid_search` | Keyword + vektör fusion |
| `chunk` | Slack mesaj context genişletme |

## Kullanım

Claude Code içinde:

```
/jira-related-task-finder SD-135447
```

Skill şunları yapar:
1. Task detaylarını çeker
2. Jira link ilişkilerini çıkarır (Blocks, Relates to, Same Epic, vb.)
3. AI benzerlik analizi yapar (semantic search + IDF hybrid skor)
4. Cross-project arama yapar
5. Initiative/cluster tespiti yapar
6. Comment'lerdeki task referanslarını bulur
7. PR ve kod analizi yapar
8. Sentry bug korelasyonu yapar (sadece Bug tipi)
9. Confluence dokümanlarını arar
10. 7 katmanlı Slack araması yapar
11. Link önerileri üretir
12. Raporu `reports/<TASK-ID>-analysis.md` dosyasına kaydeder
13. Sonuçları tablolar halinde sunar

## Proje Yapısı

```
CLAUDE.md                                    # Claude Code proje kuralları
README.md                                    # Bu dosya
mcp.json                                     # Jira credentials (gitignore)
.claude/skills/jira-related-task-finder/
  SKILL.md                                   # Skill workflow (13 adım)
  references/similarity_algorithm.md         # Benzerlik algoritması açıklaması
  scripts/build_idf.py                       # IDF cache oluşturucu
reports/                                     # Analiz raporları (otomatik oluşur)
```

## IDF Cache (Opsiyonel)

Benzerlik analizi için proje bazlı IDF cache oluşturabilirsin. Cache olmadan da çalışır ancak cache ile daha doğru sonuç verir.

```bash
# Hızlı bootstrap (son 50 task)
python .claude/skills/jira-related-task-finder/scripts/build_idf.py SD --quick

# Tam corpus (son 1 yıl)
python .claude/skills/jira-related-task-finder/scripts/build_idf.py SD --days 365
```

Cache dosyaları `.claude/skills/jira-related-task-finder/scripts/cache/` altına kaydedilir.
