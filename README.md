# 🔍 Jira Related Task Finder with AI + Slack Integration

Verilen bir Jira task ID'si ile ilişkili **tüm taskları** otomatik olarak bul:
- ✅ **Jira Links** (Blocks, Blocked By, Relates to, Parent, Subtasks, Epic)
- 🤖 **AI-based similarity** (Description, Summary, Comments)
- 💬 **Slack mentions** (Direct task ID, Keywords - Optional)

---

## 📋 Quick Start (30 secs)

### For Jira Only (No Slack)

```bash
/jira-related-task-finder SD-134980
```

**Outputs:**
- Jira ilişkili tasklar tablosu
- AI benzerlik skorları
- Comment referansları

Credentials: mcp.json'da zaten var (JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN)

### For Jira + Slack (Optional)

1. [CLAUDE.md - Slack Token Yönetimi](CLAUDE.md#token-yönetimi) adımları takip et
2. mcp.json'a `SLACK_USER_TOKEN` ekle
3. Aynı command çalıştır → Slack results da görünür

---

## 📁 Files Guide

| File | Purpose |
|------|---------|
| **CLAUDE.md** | Claude Code configuration & credentials setup |
| **SKILL.md** | Skill workflow (Step 1-10), algorithms, output format |
| **slack_search.py** | 🆕 Slack search implementation (Python) |
| **references/api_reference.md** | Jira REST API endpoints |
| **references/similarity_algorithm.md** | Hybrid similarity algorithm details |

---

## 🚀 Features

### 1. Jira Direct Links
```
Blocks / Blocked By / Relates to / Parent / Subtasks / Same Epic
```

### 2. AI Similarity Analysis
```
Hybrid Algorithm:
- Keyword matching (weighted)
- N-gram patterns
- Component matching (domain-specific)
- Score: 0.0 → 1.0 (threshold: 0.12)
```

### 3. Comment Analysis
```
Regex: [A-Z]+-\d+
Finds: Other task IDs mentioned in comments
```

### 4. Slack Integration (Optional)
```
✅ Token-based (optional - no breaking if missing)
✅ Direct task ID mentions (e.g., "SD-134980")
✅ Keyword search (high-weight terms from entity_weights)
✅ Deduplication & formatting
```

---

## 🔧 Setup

**Jira Only:** Credentials already in mcp.json → Just use the skill!

**Jira + Slack (Optional):**
1. See [CLAUDE.md - Slack Token Yönetimi](CLAUDE.md#token-yönetimi)
2. Add `SLACK_USER_TOKEN` to mcp.json
3. Done! Slack results show automatically

---

## 📊 Output Example

```
## Related Tasks for SD-134980

| Task Key | Summary | Status | Type | Relation | Score |
|----------|---------|--------|------|----------|-------|
| SD-130279 | [KEY CUSTOMER] SamsungHK \| Wrong coupon ... | Released | Bug | AI-Comment | - |
| SD-132150 | forced logout from panel upon redirection | Released | Bug | AI-Comment | - |
| SD-134505 | Inapp Element and Templates - Permissions | Design UAT | Improvement | AI-Comment | - |

## 💬 Slack Mentions (SD-134980)

| Channel | Message | Author | Date | Type |
|---------|---------|--------|------|------|
| oxt-scalability-qa-support | "SD-134980 hakkında... coupon backend..." | furkan.korkmaz | 2026-02-04 | Direct |
| product-engineering | "architect coupon binding... permission..." | ayse.yilmaz | 2026-02-03 | Keyword |
```

---

## 🛠️ Configuration

### mcp.json Structure

```json
{
  "mcpServers": {
    "jira-related-task-finder": {
      "env": {
        "JIRA_URL": "https://winsider.atlassian.net",
        "JIRA_USERNAME": "your-email@example.com",
        "JIRA_API_TOKEN": "ATATT3x...",
        "SLACK_USER_TOKEN": "xoxp-..." // Optional
      }
    }
  }
}
```

### Required Credentials

- **JIRA_URL**: Jira Cloud instance URL
- **JIRA_USERNAME**: Jira account email
- **JIRA_API_TOKEN**: [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

### Optional Credentials

- **SLACK_USER_TOKEN**: User OAuth Token with `search:read` scope (see [CLAUDE.md - Slack Token Yönetimi](CLAUDE.md#token-yönetimi))

---

## 🔒 Security

### Credentials Handling
- ⚠️ **mcp.json contains tokens** - Add to `.gitignore`!
- Never commit credentials to git
- Tokens are read-only (search:read scope only for Slack)

### Token Management
- Use **User tokens** (xoxp-) not Bot tokens (xoxb-)
- Tokens can be rotated anytime
- Slack failure doesn't break Jira flow (graceful fallback)

---

## 🧪 Testing

### Test Jira Connection
```bash
curl -u "JIRA_USERNAME:JIRA_API_TOKEN" \
  "https://JIRA_URL/rest/api/3/myself"
```

### Test Slack Connection (if enabled)
```bash
python3 slack_search.py SD-135447 "Your task summary"
```

Expected output: JSON with `"status": "success"` and results

---

## 📚 Advanced

### Customizing Similarity Weights

Edit entity_weights in:
- `SKILL.md` (documentation)
- `slack_search.py` (implementation)
- Or reference: `references/similarity_algorithm.md`

### Using in CI/CD

```bash
# Get task results as JSON
python3 slack_search.py SD-135447 "Summary" | jq '.total_found'
```

---

## 🆘 Troubleshooting

### Jira Connection Failed
→ Check JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN in mcp.json

### Slack Not Showing (even if enabled)
→ Check CLAUDE.md - Slack Token Uyarısı bölümü

### Wrong Results
→ Adjust similarity threshold in SKILL.md (currently 0.12)

---

## 📖 Learn More

- [SKILL.md](SKILL.md) - Full workflow documentation
- [CLAUDE.md](CLAUDE.md) - Claude Code configuration & Slack setup
- [references/similarity_algorithm.md](references/similarity_algorithm.md) - Algorithm details

---

## 🤝 Contributing

Want to improve the skill? Check:
1. [CLAUDE.md#contribution-guidelines](CLAUDE.md)
2. Update relevant files (SKILL.md, CLAUDE.md, code)
3. Test Jira + Slack flows
4. Document changes

---

## 📝 Version History

### v2.0 (Current) - Slack Integration
- ✨ Added Slack search capability
- ✨ Created slack_search.py implementation
- ✨ Optional token (graceful fallback if missing)
- ✨ Minimal documentation (CLAUDE.md + README.md)

### v1.0 - Initial Release
- Jira link detection
- AI similarity analysis (hybrid algorithm)
- Comment analysis

---

## 📧 Questions?

Refer to:
- **Setup Q's** → CLAUDE.md / README.md
- **Algorithm Q's** → SKILL.md / references/
- **Configuration Q's** → CLAUDE.md
- **Code Q's** → slack_search.py comments

---

**Made with ❤️ for collaborative task discovery**

Last updated: 2026-03-31
