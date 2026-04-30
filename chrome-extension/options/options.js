// Settings Page Controller

document.addEventListener('DOMContentLoaded', loadSettings);

const form = document.getElementById('settings-form');
const jiraUrlInput = document.getElementById('jira-url');
const jiraUsernameInput = document.getElementById('jira-username');
const jiraTokenInput = document.getElementById('jira-token');
const showTokenCheckbox = document.getElementById('show-token');
const statusMessage = document.getElementById('status-message');

// Load saved settings
function loadSettings() {
  chrome.storage.sync.get(['jiraUrl', 'jiraUsername', 'jiraToken'], (result) => {
    if (result.jiraUrl) jiraUrlInput.value = result.jiraUrl;
    if (result.jiraUsername) jiraUsernameInput.value = result.jiraUsername;
    if (result.jiraToken) jiraTokenInput.value = result.jiraToken;
  });
}

// Save settings
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const jiraUrl = jiraUrlInput.value.trim();
  const jiraUsername = jiraUsernameInput.value.trim();
  const jiraToken = jiraTokenInput.value.trim();

  if (!jiraUrl || !jiraUsername || !jiraToken) {
    showStatus('Please fill in all fields', 'error');
    return;
  }

  // Validate URL
  try {
    new URL(jiraUrl);
  } catch (e) {
    showStatus('Invalid URL format', 'error');
    return;
  }

  chrome.storage.sync.set(
    {
      jiraUrl,
      jiraUsername,
      jiraToken
    },
    () => {
      showStatus('✅ Settings saved successfully!', 'success');
      setTimeout(() => clearStatus(), 3000);
    }
  );
});

// Toggle token visibility
showTokenCheckbox.addEventListener('change', () => {
  const type = showTokenCheckbox.checked ? 'text' : 'password';
  jiraTokenInput.type = type;
});

// Test connection
async function testConnection() {
  const jiraUrl = jiraUrlInput.value.trim();
  const jiraUsername = jiraUsernameInput.value.trim();
  const jiraToken = jiraTokenInput.value.trim();

  if (!jiraUrl || !jiraUsername || !jiraToken) {
    showStatus('Please fill in all fields first', 'error');
    return;
  }

  showStatus('Testing connection...', 'loading');

  try {
    const auth = btoa(`${jiraUsername}:${jiraToken}`);
    const response = await fetch(`${jiraUrl}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      showStatus(
        `✅ Connected successfully! Logged in as: ${data.displayName}`,
        'success'
      );
      setTimeout(() => clearStatus(), 4000);
    } else {
      showStatus(`❌ Connection failed: ${response.status} ${response.statusText}`, 'error');
    }
  } catch (error) {
    showStatus(
      `❌ Error: ${error.message}. Check your URL and internet connection.`,
      'error'
    );
  }
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function clearStatus() {
  statusMessage.className = 'status-message';
  statusMessage.textContent = '';
}

// Make testConnection global for onclick
window.testConnection = testConnection;

console.log('⚙️ Jira Task Finder Settings loaded');
