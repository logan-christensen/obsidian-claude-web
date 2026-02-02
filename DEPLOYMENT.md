# Deployment Guide

## Quick Deploy Options

### Option 1: Netlify (Easiest - Recommended)

1. Push code to GitHub
2. Go to https://app.netlify.com/
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select your repository
5. Build settings:
   - Build command: (leave empty)
   - Publish directory: `/`
6. Click "Deploy site"
7. Your site is live! (e.g., `https://your-site.netlify.app`)

**Custom Domain (Optional):**
- Go to Site settings → Domain management
- Add your domain and follow DNS instructions

### Option 2: Vercel

1. Push code to GitHub
2. Go to https://vercel.com/
3. Click "New Project"
4. Import your GitHub repository
5. Settings:
   - Framework: Other
   - Root directory: `/`
6. Click "Deploy"

### Option 3: GitHub Pages

1. Push code to GitHub
2. Go to repository Settings → Pages
3. Source: Deploy from a branch
4. Branch: `main` / `root`
5. Save
6. Visit `https://yourusername.github.io/repo-name/`

**Note:** GitHub Pages requires HTTPS for PWA features to work properly.

### Option 4: Cloudflare Pages

1. Push code to GitHub
2. Go to https://pages.cloudflare.com/
3. Connect GitHub account
4. Select repository
5. Build settings:
   - Build command: (empty)
   - Build output directory: `/`
6. Deploy

**Bonus:** Cloudflare gives you edge caching globally!

### Option 5: Self-Host (Advanced)

#### Using Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/obsidian-claude;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

#### Using Apache

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/obsidian-claude

    <Directory /var/www/obsidian-claude>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Rewrite for SPA
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## SSL/HTTPS (Required for PWA)

### Using Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# For Nginx
sudo certbot --nginx -d yourdomain.com

# For Apache
sudo certbot --apache -d yourdomain.com

# Auto-renewal (runs automatically)
sudo certbot renew --dry-run
```

### Using Cloudflare (Free)

1. Add your domain to Cloudflare
2. Update nameservers at your registrar
3. Enable "Always Use HTTPS" in Cloudflare dashboard
4. Done! Cloudflare provides SSL automatically

## Environment-Specific Notes

### Production Checklist

- [ ] HTTPS enabled (required for PWA)
- [ ] CORS configured on S3 bucket
- [ ] Service worker caching working
- [ ] Manifest.json accessible
- [ ] Test PWA installation on mobile
- [ ] Verify localStorage persistence
- [ ] Test on both WiFi and mobile data

### Security Best Practices

1. **Never commit real credentials** to git
2. Use separate S3 IAM user with minimal permissions
3. Consider using a CDN (Cloudflare) for added security
4. Rotate your Anthropic API key periodically
5. Use S3 bucket policies to restrict access

### Performance Optimization

1. Enable gzip compression on your server
2. Set proper cache headers for static assets
3. Use Cloudflare or similar CDN
4. Minify JS/CSS for production (optional)

```bash
# Minify CSS (optional)
npx cleancss-cli styles.css -o styles.min.css

# Minify JS (optional)
npx terser app.js -o app.min.js
```

## Testing the Deployment

1. **Desktop Test:**
   - Open in browser
   - Check browser console (F12) for errors
   - Test settings save/load
   - Try connecting to S3
   - Send a test message to Claude

2. **Mobile Test (Android):**
   - Open in Chrome
   - Install as PWA
   - Open installed app
   - Test all features
   - Check if it works offline (for cached pages)

3. **Mobile Test (iOS):**
   - Open in Safari
   - Add to home screen
   - Test functionality

## Troubleshooting Deployment

### PWA Not Installing
- Ensure site is served over HTTPS
- Check manifest.json is accessible
- Verify icons are present (192x192 and 512x512)
- Check browser console for errors

### Service Worker Not Registering
- Must be HTTPS (or localhost)
- Check sw.js is at root level
- Look for console errors

### CORS Errors
- Verify S3 bucket CORS configuration
- Check S3 bucket policy allows your IAM user
- Test with AWS CLI first

### API Not Working
- Verify Anthropic API key is valid
- Check you have API credits
- Look at network tab in dev tools for error details

## Updating the App

When you push updates:

1. **Netlify/Vercel:** Auto-deploys from git
2. **GitHub Pages:** Auto-deploys on push
3. **Self-hosted:** 
   ```bash
   git pull
   sudo systemctl reload nginx  # or apache2
   ```

Users will get updates automatically next time they visit!

## Custom Domain Setup

1. Buy a domain (Namecheap, Google Domains, etc.)
2. Add to your hosting platform
3. Update DNS records:
   - Netlify: Add CNAME → `your-site.netlify.app`
   - Vercel: Add CNAME → `cname.vercel-dns.com`
   - GitHub Pages: Add CNAME → `yourusername.github.io`
4. Wait for DNS propagation (up to 48 hours, usually minutes)
5. Enable SSL (automatic on most platforms)

## Cost Summary

| Service | Cost |
|---------|------|
| Netlify Free | $0/month + free SSL |
| Vercel Free | $0/month + free SSL |
| GitHub Pages | $0/month + free SSL |
| Cloudflare Pages | $0/month + free SSL + CDN |
| Self-hosted | Server cost + Let's Encrypt (free) |

**Recommended:** Start with Netlify or Vercel for zero hassle!
