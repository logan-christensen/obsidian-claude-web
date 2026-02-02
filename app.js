// App State
const state = {
    config: {
        claudeApiKey: '',
        claudeModel: 'claude-sonnet-4-5-20250929',
        s3Region: '',
        s3Bucket: '',
        s3AccessKey: '',
        s3SecretKey: '',
        s3Prefix: '',
        obsidianVault: ''
    },
    s3: null,
    files: [],
    selectedFiles: new Map(), // key -> {name, content}
    messages: []
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    
    if (isConfigured()) {
        initializeS3();
        loadFiles();
    } else {
        showSettings();
        showToast('Please configure your settings first', 'error');
    }
});

// Settings Management
function loadSettings() {
    const saved = localStorage.getItem('obsidian-claude-config');
    if (saved) {
        state.config = { ...state.config, ...JSON.parse(saved) };
        populateSettingsForm();
    }
}

function saveSettings() {
    // Get values from form, stripping any hidden whitespace characters
    const clean = (id) => document.getElementById(id).value.replace(/[\s\u00A0]+/g, ' ').trim();
    state.config.claudeApiKey = clean('claude-api-key');
    state.config.claudeModel = document.getElementById('claude-model').value;
    state.config.s3Region = clean('s3-region');
    state.config.s3Bucket = clean('s3-bucket');
    state.config.s3AccessKey = clean('s3-access-key');
    state.config.s3SecretKey = clean('s3-secret-key');
    state.config.s3Prefix = document.getElementById('s3-prefix').value.trim();
    state.config.obsidianVault = document.getElementById('obsidian-vault').value.trim();

    // Save to localStorage
    localStorage.setItem('obsidian-claude-config', JSON.stringify(state.config));
    
    // Reinitialize S3
    initializeS3();
    
    showToast('Settings saved successfully!', 'success');
    hideSettings();
    
    // Reload files
    loadFiles();
}

function populateSettingsForm() {
    document.getElementById('claude-api-key').value = state.config.claudeApiKey;
    document.getElementById('claude-model').value = state.config.claudeModel;
    document.getElementById('s3-region').value = state.config.s3Region;
    document.getElementById('s3-bucket').value = state.config.s3Bucket;
    document.getElementById('s3-access-key').value = state.config.s3AccessKey;
    document.getElementById('s3-secret-key').value = state.config.s3SecretKey;
    document.getElementById('s3-prefix').value = state.config.s3Prefix;
    document.getElementById('obsidian-vault').value = state.config.obsidianVault;
}

function isConfigured() {
    return state.config.claudeApiKey && 
           state.config.s3Region && 
           state.config.s3Bucket && 
           state.config.s3AccessKey && 
           state.config.s3SecretKey;
}

// S3 Integration
function initializeS3() {
    if (!state.config.s3Region || !state.config.s3AccessKey || !state.config.s3SecretKey) {
        return;
    }

    AWS.config.update({
        region: state.config.s3Region,
        credentials: new AWS.Credentials(
            state.config.s3AccessKey,
            state.config.s3SecretKey
        )
    });

    state.s3 = new AWS.S3();
}

async function loadFiles() {
    const fileTree = document.getElementById('file-tree');
    fileTree.innerHTML = '<div class="loading">Loading files...</div>';

    try {
        const params = {
            Bucket: state.config.s3Bucket,
            Prefix: state.config.s3Prefix
        };

        const data = await state.s3.listObjectsV2(params).promise();
        
        state.files = data.Contents
            .filter(item => !item.Key.endsWith('/')) // Skip folders
            .filter(item => item.Key.endsWith('.md')) // Only markdown files
            .map(item => ({
                key: item.Key,
                name: item.Key.replace(state.config.s3Prefix, ''),
                size: item.Size,
                modified: item.LastModified
            }));

        renderFileTree();
    } catch (error) {
        console.error('Error loading files:', error);
        fileTree.innerHTML = `<div class="loading">Error loading files: ${error.message}</div>`;
        showToast('Failed to load files from S3', 'error');
    }
}

function renderFileTree() {
    const fileTree = document.getElementById('file-tree');
    
    if (state.files.length === 0) {
        fileTree.innerHTML = '<div class="loading">No markdown files found</div>';
        return;
    }

    // Organize files into folders
    const tree = {};
    state.files.forEach(file => {
        const parts = file.name.split('/');
        let current = tree;
        
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                // It's a file
                if (!current._files) current._files = [];
                current._files.push(file);
            } else {
                // It's a folder
                if (!current[part]) current[part] = {};
                current = current[part];
            }
        });
    });

    fileTree.innerHTML = '';
    renderTreeNode(tree, fileTree);
}

function renderTreeNode(node, container, level = 0) {
    // Render folders
    Object.keys(node).forEach(key => {
        if (key === '_files') return;
        
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-item';
        folderDiv.style.paddingLeft = `${level * 1}rem`;
        folderDiv.innerHTML = `📁 ${key}`;
        
        const contentsDiv = document.createElement('div');
        contentsDiv.className = 'folder-contents';
        
        folderDiv.addEventListener('click', () => {
            contentsDiv.style.display = contentsDiv.style.display === 'none' ? 'block' : 'none';
        });
        
        container.appendChild(folderDiv);
        container.appendChild(contentsDiv);
        
        renderTreeNode(node[key], contentsDiv, level + 1);
    });

    // Render files
    if (node._files) {
        node._files.forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item';
            fileDiv.style.paddingLeft = `${level * 1}rem`;
            fileDiv.dataset.key = file.key;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.textContent = `📄 ${file.name.split('/').pop()}`;
            fileDiv.appendChild(nameSpan);

            if (state.config.obsidianVault) {
                const openBtn = document.createElement('button');
                openBtn.className = 'open-in-obsidian-btn';
                openBtn.title = 'Open in Obsidian';
                openBtn.textContent = '↗';
                openBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openInObsidian(file);
                });
                fileDiv.appendChild(openBtn);
            }

            if (state.selectedFiles.has(file.key)) {
                fileDiv.classList.add('selected');
            }

            fileDiv.addEventListener('click', () => toggleFileSelection(file, fileDiv));
            container.appendChild(fileDiv);
        });
    }
}

async function toggleFileSelection(file, element) {
    if (state.selectedFiles.has(file.key)) {
        // Deselect
        state.selectedFiles.delete(file.key);
        element.classList.remove('selected');
    } else {
        // Select and load content
        try {
            const content = await loadFileContent(file.key);
            state.selectedFiles.set(file.key, {
                name: file.name,
                content: content
            });
            element.classList.add('selected');
        } catch (error) {
            showToast(`Failed to load ${file.name}`, 'error');
            return;
        }
    }
    
    renderContextFiles();
    updateSendButton();
}

async function loadFileContent(key) {
    const params = {
        Bucket: state.config.s3Bucket,
        Key: key
    };

    const data = await state.s3.getObject(params).promise();
    return data.Body.toString('utf-8');
}

function renderContextFiles() {
    const container = document.getElementById('context-files');
    container.innerHTML = '';
    
    state.selectedFiles.forEach((file, key) => {
        const chip = document.createElement('div');
        chip.className = 'context-file-chip';
        chip.innerHTML = `
            📄 ${file.name}
            <button onclick="removeContextFile('${key}')">×</button>
        `;
        container.appendChild(chip);
    });
}

function openInObsidian(file) {
    const filePath = file.name.replace(/\.md$/, '');
    const url = `obsidian://open?vault=${encodeURIComponent(state.config.obsidianVault)}&file=${encodeURIComponent(filePath)}`;
    window.open(url);
}

function removeContextFile(key) {
    state.selectedFiles.delete(key);
    renderContextFiles();
    renderFileTree(); // Update selection in tree
    updateSendButton();
}

// Claude API Integration
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage('user', message);
    input.value = '';
    updateSendButton();
    
    // Prepare context from selected files
    let context = '';
    if (state.selectedFiles.size > 0) {
        context = Array.from(state.selectedFiles.values())
            .map(file => `### ${file.name}\n\n${file.content}`)
            .join('\n\n---\n\n');
    }
    
    // Build prompt
    const fullPrompt = context 
        ? `Here are the files from my Obsidian vault that are relevant:\n\n${context}\n\n---\n\nUser question: ${message}`
        : message;
    
    // Show loading
    const loadingMsg = addMessage('assistant', 'Thinking...');
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': state.config.claudeApiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: state.config.claudeModel,
                max_tokens: 4096,
                messages: [
                    {
                        role: 'user',
                        content: fullPrompt
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const detail = data.error?.message || data.details || data.error || response.statusText;
            throw new Error(`API Error ${response.status}: ${detail}`);
        }

        const assistantMessage = data.content[0].text;
        
        // Update loading message with actual response
        updateMessage(loadingMsg, assistantMessage);
        
    } catch (error) {
        console.error('Error sending message:', error);
        updateMessage(loadingMsg, `❌ Error: ${error.message}`);
        showToast('Failed to get response from Claude', 'error');
    }
}

function addMessage(role, content) {
    const messagesContainer = document.getElementById('chat-messages');
    
    // Remove welcome message if it exists
    const welcome = messagesContainer.querySelector('.welcome-message');
    if (welcome) welcome.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    headerDiv.textContent = role === 'user' ? '👤 You' : '🤖 Claude';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = formatMarkdown(content);
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

function updateMessage(messageElement, newContent) {
    const contentDiv = messageElement.querySelector('.message-content');
    contentDiv.innerHTML = formatMarkdown(newContent);
}

function formatMarkdown(text) {
    // Simple markdown formatting
    return text
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// UI Event Listeners
function setupEventListeners() {
    // Settings
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    document.getElementById('test-connection-btn').addEventListener('click', testConnection);
    
    // Modal close
    document.querySelector('.close-btn').addEventListener('click', hideSettings);
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') hideSettings();
    });
    
    // File refresh
    document.getElementById('refresh-files-btn').addEventListener('click', loadFiles);
    
    // Chat input
    const input = document.getElementById('user-input');
    input.addEventListener('input', () => {
        updateSendButton();
        autoResize(input);
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!document.getElementById('send-btn').disabled) {
                sendMessage();
            }
        }
    });
    
    // Send button
    document.getElementById('send-btn').addEventListener('click', sendMessage);
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function updateSendButton() {
    const input = document.getElementById('user-input');
    const btn = document.getElementById('send-btn');
    btn.disabled = !input.value.trim();
}

function showSettings() {
    document.getElementById('settings-modal').classList.add('active');
}

function hideSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

async function testConnection() {
    const btn = document.getElementById('test-connection-btn');
    btn.disabled = true;
    btn.textContent = 'Testing...';
    
    try {
        // Test S3
        const s3Test = new AWS.S3({
            region: document.getElementById('s3-region').value,
            credentials: new AWS.Credentials(
                document.getElementById('s3-access-key').value,
                document.getElementById('s3-secret-key').value
            )
        });
        
        await s3Test.headBucket({
            Bucket: document.getElementById('s3-bucket').value
        }).promise();
        
        // Test Claude API
        const claudeResponse = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': document.getElementById('claude-api-key').value,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: document.getElementById('claude-model').value,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hi' }]
            })
        });
        
        if (!claudeResponse.ok) {
            throw new Error('Claude API test failed');
        }
        
        showToast('✅ Connection test successful!', 'success');
    } catch (error) {
        showToast(`❌ Connection test failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Test Connection';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registered', reg))
        .catch(err => console.log('Service Worker registration failed', err));
}
