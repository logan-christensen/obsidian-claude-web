# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR DEVICES                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Android    │  │    Linux     │  │   Windows    │     │
│  │              │  │              │  │              │     │
│  │  Obsidian +  │  │  Obsidian +  │  │  Obsidian +  │     │
│  │  Remotely    │  │  Remotely    │  │  Remotely    │     │
│  │  Save        │  │  Save        │  │  Save        │     │
│  └───────┬──────┘  └───────┬──────┘  └───────┬──────┘     │
│          │                 │                  │             │
│          └─────────────────┼──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ Sync markdown files
                             ↓
                   ┌──────────────────┐
                   │                  │
                   │    AWS S3        │
                   │    Bucket        │
                   │                  │
                   │  • Notes/*.md    │
                   │  • Scenes/*.md   │
                   │  • etc.          │
                   │                  │
                   └──────────────────┘
                             ↑
                             │ Read files via API
                             │
┌────────────────────────────┼────────────────────────────────┐
│                   WEB APP (YOUR DEVICE)                      │
│                            │                                 │
│  ┌──────────────────────────────────────────────────┐       │
│  │                                                   │       │
│  │  Browser (Chrome/Safari/Firefox)                 │       │
│  │                                                   │       │
│  │  ┌────────────────────────────────────────┐     │       │
│  │  │  Obsidian Claude Web App               │     │       │
│  │  │                                         │     │       │
│  │  │  • File Browser (from S3)              │     │       │
│  │  │  • Chat Interface                      │     │       │
│  │  │  • Context Management                  │     │       │
│  │  │  • Settings                            │     │       │
│  │  │                                         │     │       │
│  │  └────────────────────────────────────────┘     │       │
│  │                                                   │       │
│  └──────────────────┬────────────────────────────────       │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      │ Send messages + file context
                      ↓
            ┌──────────────────┐
            │                  │
            │  Claude API      │
            │  (Anthropic)     │
            │                  │
            └──────────────────┘
```

## Data Flow

### 1. File Sync Flow
```
Obsidian Edit → Remotely Save → S3 → Web App Refresh
```

### 2. Chat Flow
```
User Types Message
    ↓
Select Context Files (optional)
    ↓
Load File Contents from S3
    ↓
Build Prompt (message + file contents)
    ↓
Send to Claude API
    ↓
Receive Response
    ↓
Display in Chat
```

## Components Breakdown

### Frontend (Client-Side)
```javascript
// All code runs in browser - no backend server needed!

app.js
├── State Management
│   ├── Config (API keys, S3 creds)
│   ├── Files (from S3)
│   ├── Selected Files (context)
│   └── Messages (chat history)
│
├── S3 Integration
│   ├── List Files
│   ├── Load File Content
│   └── Authentication
│
├── Claude API
│   ├── Send Messages
│   ├── Build Context
│   └── Handle Responses
│
└── UI Logic
    ├── File Browser
    ├── Chat Interface
    ├── Settings Modal
    └── Toast Notifications
```

### Storage

**Browser localStorage:**
```javascript
{
  "obsidian-claude-config": {
    "claudeApiKey": "sk-ant-...",
    "claudeModel": "claude-sonnet-4-5...",
    "s3Region": "us-east-1",
    "s3Bucket": "my-vault",
    "s3AccessKey": "AKIA...",
    "s3SecretKey": "...",
    "s3Prefix": "vault-name/"
  }
}
```

**S3 Structure:**
```
my-obsidian-vault/
├── Notes/
│   ├── Daily/
│   │   └── 2026-02-02.md
│   └── Projects/
│       └── Novel.md
├── Scenes/
│   ├── Scene-001.md
│   ├── Scene-002.md
│   └── Scene-004.md
└── Characters/
    ├── Arlette.md
    └── Gregory.md
```

## Security Model

### What's Stored Where

| Data | Location | Encrypted? |
|------|----------|-----------|
| Settings | Browser localStorage | No |
| API Keys | Browser localStorage | No (local only) |
| Files | S3 Bucket | Optional (S3 encryption) |
| Messages | RAM only | N/A (temporary) |

### Access Control

1. **S3 Bucket**
   - IAM user with limited permissions
   - CORS enabled for browser access
   - Can enable encryption at rest

2. **Claude API**
   - API key stored client-side
   - Never sent to any server except Anthropic
   - Rate limits apply per key

3. **Web App**
   - Pure client-side (no backend)
   - HTTPS required for PWA
   - Service worker for offline caching

## API Calls

### S3 ListObjects
```javascript
GET https://my-bucket.s3.us-east-1.amazonaws.com/?list-type=2&prefix=vault/
Authorization: AWS4-HMAC-SHA256 ...
```

### S3 GetObject
```javascript
GET https://my-bucket.s3.us-east-1.amazonaws.com/vault/Scene-004.md
Authorization: AWS4-HMAC-SHA256 ...
```

### Claude Messages
```javascript
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: sk-ant-...
  anthropic-version: 2023-06-01
Body:
{
  "model": "claude-sonnet-4-5-20250929",
  "messages": [
    {
      "role": "user",
      "content": "File: Scene-004.md\n\n[content]\n\nHow can I improve tension?"
    }
  ]
}
```

## PWA Features

### Service Worker
```
Caches:
- index.html
- styles.css
- app.js
- manifest.json
- AWS SDK

Strategy: Cache-first, fallback to network
```

### Manifest
```json
{
  "name": "Obsidian Claude Assistant",
  "display": "standalone",
  "icons": [...],
  "start_url": "/"
}
```

### Offline Capability

- ✅ App shell (HTML/CSS/JS)
- ✅ Settings (localStorage)
- ❌ File loading (requires S3 connection)
- ❌ Claude API (requires internet)

## Performance Considerations

### Optimization Points

1. **File Loading**
   - Only loads file content when selected
   - Caches file list in memory
   - Lazy loads folders

2. **API Calls**
   - Debounced file selections
   - Single chat request at a time
   - Streaming responses (future enhancement)

3. **UI Updates**
   - Virtual scrolling for large file lists
   - Efficient DOM updates
   - CSS transitions for smooth UX

### Bottlenecks

- S3 API rate limits: ~3,500 GET/sec
- Claude API rate limits: Varies by tier
- Browser localStorage: ~10MB max
- Network latency for S3/Claude

## Scaling Considerations

### Small Vault (<1000 files)
- ✅ Works perfectly as-is
- No modifications needed

### Medium Vault (1000-5000 files)
- Consider pagination for file list
- Add search/filter functionality
- Cache file tree structure

### Large Vault (>5000 files)
- Implement lazy loading
- Add indexed search
- Consider backend caching layer

## Extension Points

Want to add features? Here's where:

### Add Cloud Provider
```javascript
// In app.js - add new service class
class DropboxService {
  async listFiles() { ... }
  async getFile(path) { ... }
}
```

### Add File Editing
```javascript
// In app.js - add edit function
async function saveFile(key, content) {
  await state.s3.putObject({
    Bucket: state.config.s3Bucket,
    Key: key,
    Body: content
  }).promise();
}
```

### Add Image Support
```javascript
// Modify loadFiles() to include images
.filter(item => 
  item.Key.endsWith('.md') || 
  item.Key.endsWith('.png')
)
```

## Deployment Architecture

### Static Hosting
```
Netlify/Vercel/GitHub Pages
    ↓
  CDN (Cloudflare)
    ↓
  User's Browser
```

### Benefits
- Zero server management
- Automatic HTTPS
- Global CDN
- Git-based deployments
- Free tier available

---

This architecture provides:
- ✅ Cross-platform compatibility
- ✅ No server maintenance
- ✅ Scalable to large vaults
- ✅ Secure credential handling
- ✅ Fast, responsive UI
