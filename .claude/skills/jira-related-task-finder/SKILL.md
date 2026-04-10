---
name: jira-related-task-finder
description: Bir Jira task ID'si verildiginde, o task ile iliskili tum tasklari bulur ve tablolar halinde sunar. Jira link iliskileri, AI benzerlik analizi, semantic search, PR/kod analizi, Sentry bug korelasyonu, Slack mention'lari, Confluence dokumanlarini birlestirerek kapsamli bir iliski haritasi cikarir.
---

# Jira Related Task Finder

Verilen bir Jira task ID'si icin tum iliskileri bulur ve tablolar halinde sunar.

## Workflow

### Adim 1 — Task Detaylarini Cek

Task ID formatini dogrula (`[A-Z]+-\d+`). Gecersizse hata ver ve dur.

```
ekb jira query=@{taskId}
```

Elde edilecekler: summary, description, status, issuetype, issuelinks, parent, labels, components, reporter, created, linked_prs, comments.

### Adim 2 — Jira Link Iliskilerini Cikar

`issuelinks` alanindan dogrudan iliskileri listele (Blocks, Blocked By, Relates to, Parent, Sub-task, Duplicates).

Parent epic varsa, kardes tasklari cek:

```
ekb jira query="parent = {epicKey} ORDER BY created DESC" limit=50
```

### Adim 3 — Benzerlik Analizi (paralel calistir: a + b ayni anda)

**a) Semantic search:**
```
ekb semantic_search query="{summary} {description ozeti}" sources="jira" limit=20
```

**b) JQL + IDF hybrid skor:**

Ayni projedeki son 50 task'i cek, her biri icin skor hesapla:
```
Score = 0.30 x Keyword(IDF) + 0.25 x N-gram + 0.25 x Component + 0.20 x Component_Bonus
      + Issue_Bonus + Label_Bonus + FixVersion_Bonus
```
Threshold: **0.12**. Detay: `references/similarity_algorithm.md`

**Birlestir:** Her iki sonucu merge et, duplicate ele. Her ikisinde de bulunan task = en guclu eslesme.

### Adim 4 — Cross-Project Arama

```
ekb semantic_search query="{summary}" sources="jira" limit=15
```

Farkli projeden gelenler `AI-Cross-Project` olarak listelenir.

### Adim 5 — Initiative / Cluster Tespiti

Linklenmmemis ama iliskili tasklari bul. Uc sinyal:
1. **Prefix** — ortak baslik kaliplari ("Dynamic Content: ...")
2. **Temporal** — ±7 gun icinde, ayni label'li tasklar
3. **Reporter** — ayni kisi, ayni gun acilmis

### Adim 6 — Comment Analizi

Adim 1'deki comment'leri `[A-Z]+-\d+` regex ile tara. Bulunan ID'ler `AI-Comment` olarak listelenir.

### Adim 7 — PR ve Kod Analizi (linked_prs yoksa atla)

Her linked PR icin:

```
ekb github repo="{owner/repo}" number={prNumber}
```

Degisen dosyalarin git gecmisinde baska task ID'leri ara:
```
ekb git action=log file="{changedFile}" limit=10
```

Kodda task referansi ara:
```
ekb regex_search query="{taskId}" sources="code" limit=10
```

### Adim 8 — Sentry (sadece Bug tipindeki tasklar icin, degilse atla)

```
ekb sentry query="is:unresolved {keywords}" limit=5
```

### Adim 9 — Confluence

Description'da Confluence link/ID varsa:
```
ekb lookup action=confluence query=@{pageId}
```

Konuyla ilgili dokuman ara:
```
ekb hybrid_search query="{summary}" sources="docs" filters="!slack" limit=5
```

### Adim 10 — Slack Aramasi (7 Katman)

Herhangi bir katmanda sonuc donmezse o katmani atla. Bagimsiz katmanlari paralel calistir.

**Katman 1 — Task ID'ler (hedef + linked task'lar):**
```
ekb regex_search query="{taskId}|{linkedTask1}|{linkedTask2}" sources="docs" filters="slack" limit=20
```

**Katman 2 — Anlam bazli:**
```
ekb semantic_search query="{1-2 cumlelik ozet}" sources="docs" filters="slack" limit=10
```

**Katman 3 — PR URL'leri (linked PR yoksa atla):**
```
ekb regex_search query="{repo}/pull/{num}" sources="docs" filters="slack" limit=10
```

**Katman 4 — Reporter/Assignee + konu:**
```
ekb hybrid_search query="{reporter_name} {keywords}" sources="docs" filters="slack" limit=10
```

**Katman 5 — Epic/Initiative (epic yoksa atla):**
```
ekb hybrid_search query="{epic_summary} {keywords}" sources="docs" filters="slack" limit=10
```

**Katman 6 — Hata mesaji (sadece Bug tipindeki tasklar icin):**
```
ekb semantic_search query="{error_message}" sources="docs" filters="slack" limit=5
```

**Katman 7 — Context genisletme (onemli mesajlar icin):**
```
ekb chunk source="{slack_message_source}" query="idx:{chunk_idx} before:2 after:2"
```

Tum katmanlardan gelen sonuclar deduplicate edilir.

### Adim 11 — Link Onerisi

Su 4 kriterden **en az 2'sini** karsilayan tasklar icin link oner:
- Similarity score >= 0.15
- Ayni reporter, ayni gun
- Ayni initiative/cluster
- Ayni dosyayi degistiren PR'lar (Code-Overlap)

### Adim 12 — Rapor Kaydet

Sonuclari `reports/{TASK-ID}-analysis.md` dosyasina kaydet.

### Adim 13 — Sonuclari Sun

**Sadece veri iceren tablolari goster.** Bos tablo gosterme.

**Tablo 1 — Iliskili Tasklar**

| Task Key | Summary | Status | Type | Iliski Turu | Score |
|----------|---------|--------|------|-------------|-------|

**Tablo 2 — Initiative / Cluster** (cluster bulunamazsa gosterme)

| # | Task Key | Summary | Status | Reporter | Tespit Yontemi |
|---|----------|---------|--------|----------|----------------|

**Tablo 3 — PR ve Kod Analizi** (linked PR yoksa gosterme)

| PR | Repo | Degisen Dosya Sayisi | CI | Ortak Dosya Olan Tasklar |
|----|------|----------------------|----|--------------------------|

**Tablo 4 — Sentry Hatalari** (sadece Bug icin, sonuc yoksa gosterme)

| Sentry Issue | Baslik | Durum | Son Gorunme | Etkilenen Servis |
|-------------|--------|-------|-------------|------------------|

**Tablo 5 — Confluence Dokumanlari** (sonuc yoksa gosterme)

| Sayfa | Baslik | Space | Son Guncelleme |
|-------|--------|-------|----------------|

**Tablo 6 — Slack Mentions** (sonuc yoksa gosterme)

| Kanal | Mesaj (ilk 150 karakter) | Yazar | Tarih | Tur | Context |
|-------|--------------------------|-------|-------|-----|---------|

**Tablo 7 — Link Onerileri** (oneri yoksa gosterme)

| Hedef | Onerilen Link | Neden |
|-------|---------------|-------|

## ekb Tool Referansi

| Tool | Adimlar | Amac |
|------|---------|------|
| `jira` | 1, 2, 3b, 4 | Task detay, JQL arama |
| `semantic_search` | 3a, 4, 10.2, 10.6 | Vektorel benzerlik (jira + slack) |
| `github` | 7 | PR detay, degisen dosyalar, CI |
| `git` | 7 | Dosya gecmisi, ortak calisan tasklar |
| `regex_search` | 7, 10.1, 10.3 | Kod/Slack'te exact match (task ID, PR URL) |
| `sentry` | 8 | Bug korelasyonu |
| `lookup` | 9 | Confluence sayfa icerigi |
| `hybrid_search` | 9, 10.4, 10.5 | Keyword + vektor fusion (docs + slack) |
| `chunk` | 10.7 | Slack mesaj context genisletme |

## Iliski Turleri

| Tur | Kaynak | Anlami |
|-----|--------|--------|
| Blocks / Blocked By | Jira | Bagimlilik zinciri |
| Relates to | Jira | Yanal iliski |
| Parent / Sub-task | Jira | Hiyerarsi |
| Same Epic | Jira | Ayni epic altindaki kardes tasklar |
| AI-Semantic | ekb | Vektorel benzerlik |
| AI-Summary / AI-Description | AI | IDF-based token benzerligi |
| AI-Comment | AI | Commentlerde referans edilen task |
| AI-Cross-Project | AI + ekb | Baska projede bulunan benzer task |
| AI-Initiative | AI | Cluster uyesi (prefix/temporal/reporter) |
| Code-Overlap | ekb | Ayni dosyalari degistiren task |
