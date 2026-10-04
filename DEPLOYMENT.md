# Admin Panel Deployment Guide

## CI/CD (GitHub Actions) — recommended

Workflow: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)

| Event | What runs |
|---|---|
| Pull request (any branch → any branch) | `npm ci` → `node scripts/check-i18n.mjs` → `npm run build` (strict `tsc -b` + Vite build) |
| Push to `main` (repo `zakogit/zako-admin` only) | the same checks, then **deploy**: `dist/` is uploaded over SSH with `rsync` to the server and the run verifies that `https://admin.zakoapp.uz` serves the new bundle |
| Manual run (_Actions → CI/CD → Run workflow_) on `main` | same as a push; the optional `ref` input builds and deploys an older commit/tag — this is the **rollback** |

The build uses the committed `.env.production` (API at `https://api.zakoapp.uz`), so the build itself needs no secrets.
The deploy uploads new hashed assets first, then `index.html`, and prunes assets older than 14 days, so open browser tabs keep
working during a release.

### One-time setup (repo `zakogit/zako-admin` → Settings → Secrets and variables → Actions)

Create an environment named **production** (Settings → Environments; add _required reviewers_ there if every release should be
approved by hand) and add these secrets to it (or to the repository):

| Secret | Example / notes |
|---|---|
| `SERVER_HOST` | the VPS host or IP (same server as the backend, `vps-39075eea`) |
| `SERVER_USER` | `ubuntu` — must be able to **write** to `ADMIN_WEB_ROOT` |
| `SERVER_SSH_KEY` | the **private** deploy key (see below) — recommended. Needed unless `SERVER_PASSWORD` is set |
| `SERVER_PASSWORD` | alternative to the key: the SSH password of `SERVER_USER` (fed through `sshpass`; the key is used instead when both are set). The server's sshd must allow password login (`PasswordAuthentication yes`); a key is safer, switch when convenient |
| `SERVER_PORT` | optional, defaults to `22` |
| `SERVER_KNOWN_HOSTS` | optional but recommended: output of `ssh-keyscan -H <host>`; without it the host key is trusted on first use in every run |
| `ADMIN_WEB_ROOT` | the directory nginx serves for `admin.zakoapp.uz` (its `root`), e.g. `/home/ubuntu/apps/zako-admin/dist`. It is `rsync --delete`d, so it must be exactly that directory and not shallower than `/a/b/c`. |

> Two different roots appear in the repo docs: `/home/ubuntu/apps/zako-admin/dist` (this file) and `/var/www/zakoapp.uz/admin`
> (`zako_backend/zakoapp.uz`). On the server run `sudo nginx -T | grep -A12 'server_name admin.zakoapp.uz'` and use the `root` shown there.

Use a dedicated key for this repo:

```bash
ssh-keygen -t ed25519 -f zako-admin-deploy -N "" -C "github-actions zako-admin"
ssh-copy-id -i zako-admin-deploy.pub ubuntu@<host>      # or append the .pub line to ~/.ssh/authorized_keys on the VPS
# paste the content of the PRIVATE file `zako-admin-deploy` into the SERVER_SSH_KEY secret, then delete both local files
ssh-keyscan -H <host>                                   # → SERVER_KNOWN_HOSTS
```

The deploy user needs `rsync` on the server (`sudo apt install rsync`) and write access to the web root
(`sudo chown -R ubuntu:ubuntu <ADMIN_WEB_ROOT>` if it was created by root).

### Notes

- The deploy job is skipped on forks / the personal mirror (`github.repository == 'zakogit/zako-admin'`), so pushing to both remotes is safe.
- Lint is not part of CI yet: `npm run lint` still reports the old `no-explicit-any` findings. Add it once those are cleaned up.
- If the final "verify" step fails but the files were uploaded, nginx is serving a different directory than `ADMIN_WEB_ROOT`
  (or a CDN is caching `index.html`).

## Manual deployment (fallback)

## Prerequisites

- Ubuntu VPS (vps-39075eea)
- Node.js installed
- Build completed locally

## Deployment Steps

### 1. Local Build (Completed ✅)

```bash
npm run build
```

Build output:

- dist/assets/PaymentsPage-Dku7bbh1.js (17.65 kB)
- dist/assets/index.esm-1Kn9rdGL.js (25.06 kB)
- dist/assets/services-uBNphW8O.js (45.76 kB)
- dist/assets/LoginPage-CWI9fRVj.js (68.01 kB)
- dist/assets/index-CwkQQv9p.js (324.04 kB)
- dist/assets/DashboardPage-BkZ5HT6G.js (339.72 kB)

### 2. Upload Build Files to VPS

```bash
# Copy dist folder to VPS
scp -r dist/ ubuntu@vps-39075eea:~/apps/zako-admin/

# Or use rsync for better performance
rsync -avz --delete dist/ ubuntu@vps-39075eea:~/apps/zako-admin/dist/
```

### 3. VPS Server Setup

#### Option A: Nginx Static Files (Recommended)

```bash
# SSH to VPS
ssh ubuntu@vps-39075eea

# Install Nginx if not installed
sudo apt update
sudo apt install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/zako-admin
```

Nginx config content:

```nginx
server {
    listen 80;
    server_name admin.zakoapp.uz;

    root /home/ubuntu/apps/zako-admin/dist;
    index index.html;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/zako-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Option B: PM2 with serve

```bash
# Install serve globally
npm install -g serve

# Create PM2 ecosystem
nano ecosystem.admin.config.js
```

PM2 config:

```javascript
module.exports = {
  apps: [
    {
      name: "zako-admin",
      script: "serve",
      args: "dist -s -p 3001",
      cwd: "/home/ubuntu/apps/zako-admin",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

Start with PM2:

```bash
pm2 start ecosystem.admin.config.js --env production
pm2 save
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d admin.zakoapp.uz

# Auto-renewal (optional)
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet
```

### 5. Backend API Integration

Ensure admin panel can connect to backend:

- Backend running on: `http://localhost:3000` or `https://api.zakoapp.uz`
- Update API base URL in admin if needed
- CORS configuration in backend for admin domain

### 6. Final Verification

Check services:

```bash
# Check nginx
sudo systemctl status nginx

# Check backend (if using PM2)
pm2 list

# Check logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

Test admin panel:

- Open: `https://admin.zakoapp.uz`
- Login with admin credentials
- Test payments section functionality
- Verify API connectivity

### 7. Environment Configuration

Ensure backend `.env` has proper CORS settings:

```env
# Backend .env
CORS_ORIGIN=https://admin.zakoapp.uz,http://localhost:5173
```

### 8. Post-Deployment

1. Test payment integration with Payme
2. Verify webhook logs functionality
3. Check admin panel responsiveness
4. Monitor server resources
5. Set up backup strategy for admin panel

## Troubleshooting

### Common Issues:

1. **404 on refresh**: Ensure nginx `try_files` is configured correctly
2. **API connection**: Check CORS settings and network connectivity
3. **Build assets 404**: Verify file permissions and paths
4. **SSL issues**: Check certificate status with `sudo certbot certificates`

### Useful Commands:

```bash
# Check nginx syntax
sudo nginx -t

# Restart services
sudo systemctl restart nginx
pm2 restart zako-admin

# View logs
tail -f /var/log/nginx/error.log
pm2 logs zako-admin
``
```
