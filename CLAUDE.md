# CLAUDE.md

Jira task iliskilerini bulan Claude Code skill'i. Kullanim: `/jira-related-task-finder <TASK-ID>`

## Kurallar

- Raporu her analiz sonrasi otomatik `reports/<TASK-ID>-analysis.md` dosyasina kaydet. Kullaniciya sorma.
- Hicbir kelime, component veya proje listesi hard-code etme. Agirliklar IDF ile dinamik hesaplanir.
- Jira credentials `mcp.json`'dan okunur. mcp.json asla commit edilmez.
- Jira search icin `POST /rest/api/3/search/jql` kullan (eski GET endpoint deprecated).
- Slack, Sentry, GitHub, Confluence erisimi ekb plugin uzerinden token-free calisir.
- ekb cagrisi sonuc donmezse o adimi atla, hata verme.
- Bagimsiz ekb cagrilarini paralel yap (ornek: Slack + Confluence + Sentry ayni anda).
- Sadece veri iceren tablolari goster. Bos tablo gosterme.
- Skill detaylari: `.claude/skills/jira-related-task-finder/SKILL.md`
- Benzerlik algoritmasi: `.claude/skills/jira-related-task-finder/references/similarity_algorithm.md`
