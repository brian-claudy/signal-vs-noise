# Signal vs Noise - Vercel Deployment Guide

## 🚀 Quick Start (5 minutes)

This guide will get your fact-checker live on Vercel with rate limiting and API security.

---

## Step 1: Prepare the Frontend Component

1. Open `app/page.js` in your project
2. Replace the placeholder with your fact-checker component from the artifact
3. Make these changes to the component:

### Update API calls to use your backend

Find all instances of:
```javascript
fetch("https://api.anthropic.com/v1/messages", {
```

Replace with:
```javascript
fetch("/api/fact-check", {
  headers: {
    "Content-Type": "application/json",
    "x-fingerprint-id": visitorId, // From FingerprintJS
  },
```

### Add FingerprintJS for rate limiting

Add this to the top of your component (inside the component function):
```javascript
const [visitorId, setVisitorId] = useState(null);

useEffect(() => {
  // Load FingerprintJS
  const fpPromise = import('https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js')
    .then(FingerprintJS => FingerprintJS.load());
  
  fpPromise
    .then(fp => fp.get())
    .then(result => setVisitorId(result.visitorId));
}, []);
```

### Remove the direct API key (it's now in your backend)

Delete any lines with:
```javascript
'x-api-key': process.env.ANTHROPIC_API_KEY
```

---

## Step 2: Push to GitHub

```bash
cd signal-vs-noise
git init
git add .
git commit -m "Initial commit - Signal vs Noise fact checker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/signal-vs-noise.git
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click "Deploy"

### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow prompts to link to your project.

---

## Step 4: Set Up Vercel KV (Rate Limiting Storage)

1. In your Vercel project dashboard, go to "Storage" tab
2. Click "Create Database"
3. Choose "KV (Redis)"
4. Name it "signal-vs-noise-kv"
5. Click "Create"

**Vercel will automatically inject these environment variables:**
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

No manual configuration needed!

---

## Step 5: Add Environment Variables

1. In Vercel dashboard, go to "Settings" → "Environment Variables"
2. Add:

```
ANTHROPIC_API_KEY = sk-ant-... (get from https://console.anthropic.com)
```

3. Click "Save"
4. Redeploy: Settings → Deployments → click "..." → "Redeploy"

---

## Step 6: Set Anthropic API Spending Limit

**CRITICAL FOR COST PROTECTION:**

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click your profile → "Settings" → "Billing"
3. Under "Spending Limits":
   - Set Monthly Limit: **$100**
   - Set Email Alert at: **$50**
4. Save

This ensures even if rate limiting fails, you're capped at $100/month.

---

## ✅ Verification Checklist

After deployment, test these:

- [ ] App loads at your-project.vercel.app
- [ ] First fact-check works
- [ ] Second fact-check works
- [ ] Third fact-check shows "Free tier limit reached"
- [ ] Export report downloads as `signal-noise-check-YYYY-MM-DD.html`
- [ ] Share Results copies to clipboard on desktop
- [ ] Tweet This opens Twitter with pre-filled text
- [ ] Quick Check mode works (toggle button)

---

## 🔒 Security Features Enabled

✅ **Rate Limiting**: 2 free checks per user (fingerprint + IP)  
✅ **Daily Budget Cap**: $50/day maximum spend  
✅ **API Key Hidden**: Only accessible server-side  
✅ **Input Validation**: Length limits on all inputs  
✅ **CORS Protection**: API only accessible from your domain  

---

## 📊 Monitoring Costs

### Check API Usage

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click "Usage" → see your spend

### Check Rate Limiting Stats

Vercel KV shows:
- Total checks today
- Unique users
- Cost accumulation

Access via Vercel dashboard → Storage → KV → Data Browser

---

## 🐛 Troubleshooting

### "Missing fingerprint ID" error
→ FingerprintJS didn't load. Check browser console for errors.

### "Rate limit exceeded" after 1 check
→ Check Vercel KV is connected. Go to Storage tab → ensure KV database exists.

### API calls failing with 401
→ ANTHROPIC_API_KEY not set. Go to Settings → Environment Variables → verify it's there → Redeploy.

### "Budget exceeded" error
→ You've hit $50/day. This is intentional protection. Resets at midnight UTC.

---

## 🎯 Post-Deployment Optimizations

### Custom Domain (Optional)

1. Go to Vercel dashboard → Settings → Domains
2. Add your domain (e.g., `signal-vs-noise.app`)
3. Update DNS records as instructed
4. SSL auto-configures

### Analytics (Optional)

Vercel Analytics is free for hobby tier:
1. Settings → Analytics → Enable
2. See traffic, performance, user behavior

---

## 🚦 Phase 2 Features (Coming Next)

After verifying Phase 1 works:

- [ ] Supabase auth (Google OAuth)
- [ ] Pro tier ($7/month via Stripe)
- [ ] Shareable URLs (save reports to database)
- [ ] History view for Pro users
- [ ] User dashboard

---

## 💰 Cost Breakdown (Phase 1)

**Monthly Fixed Costs:**
- Vercel Hosting: **$0** (hobby tier)
- Vercel KV Storage: **$0** (included in hobby tier)

**Variable Costs (API):**
- At 1,000 checks/month: **~$10**
- At 10,000 checks/month: **~$100** (hits monthly cap)

**Total: $0-10/month for first 1,000 users**

---

## 📞 Support

**Issues?**
- Vercel Docs: https://vercel.com/docs
- Anthropic Support: https://support.anthropic.com
- Next.js Docs: https://nextjs.org/docs

**Questions about this deployment?**
- Check the code comments in `app/api/fact-check/route.js`
- Review rate limiting logic in the API route

---

## 🎉 You're Live!

Your fact-checker is now production-ready with:
- ✅ Professional hosting
- ✅ Rate limiting
- ✅ Cost protection
- ✅ Auto-scaling
- ✅ SSL certificate
- ✅ Global CDN

Share your URL and start fighting misinformation! 🎯
