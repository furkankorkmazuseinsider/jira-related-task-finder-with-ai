// Popup UI Controller

class PopupController {
  constructor() {
    this.taskInput = document.getElementById('task-input');
    this.searchBtn = document.getElementById('search-btn');
    this.resultsDiv = document.getElementById('results');
    this.loadingDiv = document.getElementById('loading');
    this.errorDiv = document.getElementById('error');
    this.settingsBtn = document.getElementById('settings-btn');
    this.currentTaskDiv = document.getElementById('current-task');

    this.setupEventListeners();
    this.detectCurrentTask();
  }

  setupEventListeners() {
    this.searchBtn.addEventListener('click', () => this.handleSearch());
    this.taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });
    this.settingsBtn.addEventListener('click', () => this.openSettings());
  }

  async detectCurrentTask() {
    // Get current task from active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url) return;

    // Extract task ID from URL (Jira format: /browse/SD-136249)
    const match = tab.url.match(/browse\/([A-Z]+-\d+)/);
    if (match) {
      const taskId = match[1];
      this.taskInput.value = taskId;
      this.currentTaskDiv.textContent = `📌 Current: ${taskId}`;
      this.currentTaskDiv.classList.add('show');

      // Auto-search if detected
      this.handleSearch();
    }
  }

  async handleSearch() {
    const taskId = this.taskInput.value.trim().toUpperCase();

    if (!taskId) {
      this.showError('Please enter a task ID (e.g., SD-136249)');
      return;
    }

    if (!/^[A-Z]+-\d+$/.test(taskId)) {
      this.showError('Invalid task ID format. Use format: PROJECT-123');
      return;
    }

    this.showLoading();
    this.clearError();

    try {
      const results = await chrome.runtime.sendMessage({
        action: 'searchTask',
        taskId: taskId
      });

      this.displayResults(results);
    } catch (error) {
      this.showError(`Error: ${error.message}`);
    }
  }

  displayResults(results) {
    this.loadingDiv.style.display = 'none';

    if (!results || Object.keys(results).length === 0) {
      this.resultsDiv.innerHTML = '<div class="empty-state">No related tasks found</div>';
      return;
    }

    let html = '';

    // Parent tasks
    if (results.parent && results.parent.length > 0) {
      html += this.createTaskGroup('📌 Parent', results.parent);
    }

    // Jira Links
    if (results.jiraLinks && results.jiraLinks.length > 0) {
      html += this.createTaskGroup('🔗 Jira Links', results.jiraLinks);
    }

    // Sub-tasks
    if (results.subtasks && results.subtasks.length > 0) {
      html += this.createTaskGroup('📋 Sub-tasks', results.subtasks);
    }

    // Similar tasks
    if (results.similar && results.similar.length > 0) {
      html += this.createTaskGroup('🤖 Similar Tasks', results.similar);
    }

    // Comment references
    if (results.commentRefs && results.commentRefs.length > 0) {
      html += this.createTaskGroup('💬 From Comments', results.commentRefs);
    }

    this.resultsDiv.innerHTML = html;
  }

  createTaskGroup(title, tasks) {
    let html = `
      <div class="task-group">
        <div class="task-group-title">${title}</div>
    `;

    tasks.forEach(task => {
      const statusClass = task.status?.toLowerCase().replace(/\s+/g, '');
      html += `
        <div class="task-item" onclick="window.open('${task.link}', '_blank')">
          <div class="task-key">${task.key}</div>
          <div class="task-summary">${task.summary}</div>
          <div class="task-meta">
            <span class="task-status ${statusClass}">${task.status}</span>
            <span>${task.type}</span>
            ${task.relation ? `<span class="task-relation">${task.relation}</span>` : ''}
            ${task.score ? `<span class="task-score">Score: ${task.score}</span>` : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  showLoading() {
    this.loadingDiv.style.display = 'flex';
    this.resultsDiv.innerHTML = '';
    this.clearError();
  }

  showError(message) {
    this.loadingDiv.style.display = 'none';
    this.errorDiv.innerHTML = `<strong>⚠️ Error</strong>${message}`;
    this.errorDiv.style.display = 'block';
  }

  clearError() {
    this.errorDiv.style.display = 'none';
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
