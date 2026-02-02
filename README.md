# Obsidian Claude Web App

A Progressive Web App (PWA) that connects your Obsidian vault (synced via S3) with Claude AI for intelligent assistance with your notes.

## Features

- 📝 **Full Vault Access**: Browse and select files from your Obsidian vault
- 🤖 **Claude Integration**: Chat with Claude about your notes
- 💬 **Context-Aware**: Add multiple files to conversation context
- 📱 **Mobile-Friendly**: Works on Android, iOS, and desktop
- 🔒 **Secure**: All credentials stored locally in your browser
- 📦 **PWA**: Install as an app on your phone

## Prerequisites

1. **Obsidian** with [Remotely Save](https://github.com/remotely-save/remotely-save) plugin installed
2. **AWS S3 Bucket** (or S3-compatible service like Cloudflare R2, Backblaze B2)
3. **Anthropic API Key** from https://console.anthropic.com/

## Setup Instructions

### Step 1: Set up S3 Bucket

1. Create an S3 bucket (e.g., `my-obsidian-vault`)
2. Create an IAM user with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-obsidian-vault",
        "arn:aws:s3:::my-obsidian-vault/*"
      ]
    }
  ]
}
```

3. Generate access keys for the IAM user
4. Configure CORS on your bucket (required for web access):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Step 2: Configure Remotely Save in Obsidian

1. Install the Remotely Save plugin from Community Plugins
2. Go to Settings → Remotely Save
3. Select "S3 or S3-compatible" as your service
4. Enter your S3 credentials:
   - Region: `us-east-1` (or your region)
   - Bucket: `my-obsidian-vault`
   - Access Key ID: (from IAM user)
   - Secret Access Key: (from IAM user)
5. Test connection and run initial sync

### Step 3: Deploy the Web App

#### Option A: Deploy to Netlify/Vercel (Recommended)

1. Fork this repository
2. Connect to Netlify or Vercel
3. Deploy (no build step needed!)
4. Access your deployed URL

#### Option B: Run Locally

```bash
# Simple HTTP server
python -m http.server 8000

# Or using Node.js
npx serve
```

Then visit `http://localhost:8000`

### Step 4: Configure the App

1. Open the web app
2. Click the ⚙️ Settings icon
3. Enter your credentials:
   - **Claude API Key**: From https://console.anthropic.com/
   - **Model**: Choose your preferred Claude model
   - **S3 Region**: Same as your bucket
   - **S3 Bucket**: Your bucket name
   - **S3 Access Key**: IAM user access key
   - **S3 Secret Key**: IAM user secret key
   - **S3 Prefix**: (optional) If you set a prefix in Remotely Save
4. Click "Test Connection" to verify
5. Click "Save Settings"

### Step 5: Install as PWA (Mobile)

**Android:**
1. Open the web app in Chrome
2. Tap the menu (⋮) → "Install app" or "Add to Home screen"
3. Confirm installation

**iOS:**
1. Open the web app in Safari
2. Tap Share button
3. Select "Add to Home Screen"

## Usage

### Basic Chat
1. Type a question in the input box
2. Press Enter or click Send
3. Claude will respond based on its general knowledge

### Context-Aware Chat
1. Click files in the sidebar to select them
2. Selected files appear as chips above the input
3. Ask questions - Claude will use the selected files as context
4. Remove files by clicking the × on the chip

### Example Conversations

**Without context:**
> "What are some good fantasy character archetypes?"

**With context (Scene files selected):**
> "In Scene 004, how can I make Arlette's hiding more tense?"

**Multiple files:**
> "Based on the scenes I've selected, what are the main themes emerging in my story?"

## Security Notes

- All credentials are stored in your browser's localStorage
- No data is sent to any server except:
  - Your S3 bucket (to read files)
  - Anthropic's API (to get Claude responses)
- The app works entirely client-side

## Cost Estimates

**S3 Storage:**
- Storage: ~$0.023/GB/month
- Typical Obsidian vault (500MB): ~$0.01/month
- API requests: Negligible for personal use

**Claude API:**
- Pay per token, varies by model
- Typical conversation: $0.01-0.10
- No monthly fees, only pay for what you use

**Total: Usually < $5/month for active personal use**

## Troubleshooting

### "Error loading files from S3"
- Check your S3 credentials
- Verify CORS is configured correctly
- Ensure the IAM user has ListBucket permission

### "Failed to get response from Claude"
- Verify your Anthropic API key
- Check you have API credits
- Look for error details in browser console (F12)

### Files not appearing
- Make sure files are `.md` (markdown)
- Check the S3 prefix matches Remotely Save settings
- Try refreshing the file list (🔄 button)

### PWA won't install
- Must be served over HTTPS (or localhost)
- Try adding to home screen manually
- Check browser console for manifest errors

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-claude-web.git
cd obsidian-claude-web

# Open in browser
open index.html
```

No build process required - pure HTML/CSS/JavaScript!

## Alternatives Considered

This app exists because:
- ❌ Obsidian Sync has no API
- ❌ Most Claude plugins don't work on mobile
- ❌ MCP servers require desktop Node.js
- ✅ This works everywhere with just a web browser!

## License

MIT License - use freely!

## Contributing

Pull requests welcome! Some ideas:
- [ ] Support for more cloud providers (Dropbox, OneDrive)
- [ ] File editing capabilities
- [ ] Conversation history/persistence
- [ ] Dark/light theme toggle
- [ ] Better markdown rendering
- [ ] Image support in chat

## Credits

Built with:
- [AWS SDK](https://aws.amazon.com/sdk-for-javascript/)
- [Anthropic Claude API](https://www.anthropic.com/)
- Pure vanilla JavaScript (no frameworks!)
