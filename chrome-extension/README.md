# 🔗 Jira Task Finder - Chrome Extension

Find related Jira tasks instantly while working on Jira and Slack!

## ✨ Features

- 🔍 **Quick Search:** Pop-up search for any Jira task
- 🎯 **Auto-Detection:** Automatically detects current task on Jira pages
- 🤖 **AI-Powered:** Finds similar tasks by description/summary
- 🔗 **Relationship Mapping:** Shows all task relationships (parent, sub-tasks, blocks, etc)
- 💬 **Slack Integration:** Highlights task IDs in Slack and shows related tasks
- ⚡ **Fast Caching:** 1-hour cache for improved performance
- 🔒 **Secure:** Credentials stored locally with Chrome encryption

## 📦 Installation

### For Development

1. Clone this repository
2. Open `chrome://extensions/` in your browser
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder
6. Configure credentials in extension options (⚙️)

### For Users (Coming Soon)

- Available on Chrome Web Store
- One-click installation and auto-updates

## ⚙️ Setup

### 1. Configure Credentials

1. Click extension icon → Settings (⚙️)
2. Enter your Jira details:
   - **Jira URL:** `https://yourcompany.atlassian.net`
   - **Email:** Your Jira login email
   - **API Token:** [Create here](https://id.atlassian.com/manage-profile/security/api-tokens)
3. Click "Test Connection" to verify
4. Save

### 2. (Optional) Slack Integration

For Slack task ID highlighting:
- Just start using the extension on Slack
- Task IDs (e.g., `SD-136249`) will be highlighted automatically
- Hover/click to see related tasks

## 🎯 Usage

### On Jira Pages

1. **Auto-Detection:** When you open a task, a button appears bottom-right
2. **Click the button:** Shows all related tasks in a pop-up
3. **Search manually:** Use the pop-up search box for any task ID

### On Slack

1. **Hover over task ID:** Yellow highlight appears
2. **Hover for tooltip:** "Click to view related tasks"
3. **Click to search:** Shows related tasks in new window/tab

### Keyboard Shortcuts (Coming in v1.1)

- `Alt + Shift + J` - Open Task Finder pop-up
- `Alt + Shift + S` - Search current task

## 📊 What It Finds

| Category | Description |
|----------|-------------|
| 🔗 **Jira Links** | Blocks, Blocked By, Relates to, Duplicates |
| 📌 **Parent** | Parent task/epic |
| 📋 **Sub-tasks** | All sub-tasks |
| 🤖 **Similar** | AI-detected similar tasks (by description/summary) |
| 💬 **Comments** | Tasks mentioned in comments |

## 🏗️ Architecture

```
chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # API handler & message router
├── content-jira.js        # Jira page enhancement
├── content-slack.js       # Slack message highlighting
├── popup/
│   ├── popup.html        # Search UI
│   ├── popup.js          # Search logic
│   └── popup.css         # Styling
├── options/
│   ├── options.html      # Settings page
│   ├── options.js        # Settings logic
│   └── options.css       # Settings styling
└── icons/                 # Extension icons (16, 48, 128px)
```

## 🔐 Security & Privacy

- ✅ **Local Storage:** Credentials stored in Chrome's encrypted sync storage
- ✅ **No Cloud:** Data never sent to external servers
- ✅ **Direct API:** Direct connection to your Jira instance
- ✅ **Token Only:** Only API token stored, not your password
- ✅ **Revokable:** Token can be revoked anytime from Atlassian

## 🐛 Troubleshooting

### Settings Not Saving?
- Check if sync is enabled: `chrome://settings/syncSetup`
- Try re-entering credentials

### "Invalid credentials" Error?
- Verify Jira URL format: `https://company.atlassian.net`
- Check email is correct
- Regenerate API token: [Atlassian Security](https://id.atlassian.com/manage-profile/security/api-tokens)

### No Results Found?
- Make sure task ID is correct (e.g., `SD-136249`)
- Try "Test Connection" first
- Check task exists in your Jira instance

### Slack Highlighting Not Working?
- Reload Slack page: `Ctrl+R` or `Cmd+R`
- Check extension is enabled
- Try new Slack message/thread

## 📈 Roadmap

### v0.2.0 (This Branch)
- ✅ Core functionality
- ✅ Popup search
- ✅ Jira page integration
- ✅ Slack highlighting
- 🚧 Basic content scripts

### v1.0 (Next)
- [ ] Keyboard shortcuts
- [ ] Task detail modal preview
- [ ] Copy to clipboard
- [ ] Smart filters (status, type)
- [ ] Chrome Web Store release

### v2.0 (Future)
- [ ] Dark theme
- [ ] Custom analytics dashboard
- [ ] GitHub PR integration
- [ ] Notification system
- [ ] Export/Share options

## 🧪 Development

### Build Process (Planned)
```bash
npm install
npm run build    # Minify & package
npm run test     # Run tests
```

### Testing Checklist
- [ ] Jira page detection
- [ ] Task ID search
- [ ] Related tasks display
- [ ] Slack highlighting
- [ ] Settings save/load
- [ ] Connection test
- [ ] Cache expiry

## 📝 License

Internal Use Only - Insider Inc.

## 🤝 Support

For issues or feature requests:
- GitHub: [jira-task-finder](https://github.com/useinsider/jira-task-finder)
- Email: engineering@useinsider.com

---

**Made with ❤️ for Insider Engineering Team**
