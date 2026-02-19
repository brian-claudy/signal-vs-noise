# Signal vs Noise - AI-Powered Fact Checker

Stop falling for fake news. Fact-check any claim in seconds with AI-powered analysis.

## 🚀 Quick Deploy to Vercel

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local with your API key
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 3. Deploy to Vercel
npm i -g vercel
vercel

# Or push to GitHub and import to Vercel dashboard
```

**Full deployment guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## ✨ Features

- **🎯 Hybrid AI System**: Haiku triage → Sonnet escalation for smart cost optimization
- **⚡ Quick Check Mode**: Fast 5-second checks when you need speed over depth
- **🔍 Multi-Angle Search**: 4-6 web searches across fact-check databases, primary sources, and news
- **📊 Structured Analysis**: Verdict cards, claim-by-claim breakdown, red flag detection
- **🔗 Trusted Sources Only**: Domain filtering to Snopes, Reuters, AP, BBC, NYT, etc.
- **📱 Multi-Modal**: Analyze text, URLs, or upload images
- **💾 Exportable Reports**: Download professional HTML reports
- **𝕏 Share Ready**: Tweet results or native share on mobile
- **🔒 Rate Limited**: Free tier protected with fingerprint + IP tracking

---

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 + React 18
- **API**: Anthropic Claude (Haiku 4.5 + Sonnet 4.6)
- **Rate Limiting**: Vercel KV (Redis)
- **Hosting**: Vercel (auto-scaling, global CDN)
- **Styling**: Inline styles (no build step)

---

## 🔐 Security Features

✅ **API Key Protection**: Server-side only, never exposed to browser  
✅ **Rate Limiting**: 2 free checks per user (fingerprint + IP composite)  
✅ **Daily Budget Cap**: $50/day circuit breaker  
✅ **Input Validation**: Length limits on all user inputs  
✅ **Trusted Sources**: Domain filtering prevents citing unreliable sites  

---

## 📦 Project Structure

```
signal-vs-noise/
├── app/
│   ├── api/
│   │   └── fact-check/
│   │       └── route.js          # API proxy with rate limiting
│   ├── layout.js                 # Root layout
│   └── page.js                   # Main fact-checker component
├── package.json                  # Dependencies
├── next.config.js                # Next.js config
├── .env.local.example            # Environment variables template
├── DEPLOYMENT.md                 # Full deployment guide
└── README.md                     # This file
```

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Add your API key to .env.local
echo "ANTHROPIC_API_KEY=your_key_here" > .env.local

# Run dev server
npm run dev

# Open http://localhost:3000
```

**Note:** Local dev won't have rate limiting unless you set up Vercel KV locally.

---

## 🎨 Customization

### Update Branding

Edit `app/layout.js`:
```javascript
export const metadata = {
  title: 'Your Brand - AI Fact Checker',
  description: 'Your custom description',
}
```

### Adjust Rate Limits

Edit `app/api/fact-check/route.js`:
```javascript
const RATE_LIMIT = {
  FREE_TIER_CHECKS: 2,        // Change to 3, 5, etc.
  DAILY_BUDGET: 50,           // Increase if needed
  COST_PER_CHECK: 0.015,      // Average cost per check
};
```

### Add Custom Domain

1. Vercel Dashboard → Settings → Domains
2. Add your domain
3. Update DNS records
4. SSL auto-configures

---

## 💰 Cost Estimates

### Phase 1 (Current - Free Tier Only)

**Fixed Costs:**
- Vercel Hosting: $0/month (hobby tier)
- Vercel KV: $0/month (included)

**Variable Costs:**
- 1,000 checks/month: ~$10
- 10,000 checks/month: ~$100

**Total: $0-10/month for first 1K users**

### Phase 2 (With Payments)

**Revenue:**
- 50 Pro users ($7/mo): $350/month
- 5 Team accounts ($29/mo): $145/month
- **Total: $495 MRR / $5,940 ARR**

**Costs:**
- Hosting: $0
- API: ~$50/month
- **Profit: ~$445/month**

---

## 🗺️ Roadmap

### ✅ Phase 1 (Complete)
- Core fact-checker with hybrid AI
- Rate limiting + cost protection
- Export + share features
- Quick Check mode
- Vercel deployment

### 📋 Phase 2 (Next)
- Supabase auth (Google OAuth)
- Pro tier ($7/month via Stripe)
- Shareable URLs (save reports to DB)
- History view for Pro users
- User dashboard

### 🚀 Phase 3 (Future)
- Team tier ($29/month for 5 seats)
- Browser extension
- API access for developers
- Webhook integrations

---

## 📊 Monitoring

### Check API Usage
- Anthropic Console: https://console.anthropic.com → Usage

### Check Rate Limiting
- Vercel Dashboard → Storage → KV → Data Browser
- See usage counts per user

### Check Errors
- Vercel Dashboard → Deployments → Logs
- Real-time function logs

---

## 🐛 Troubleshooting

### Rate limiting not working
→ Ensure Vercel KV is connected in Storage tab

### API calls failing
→ Check ANTHROPIC_API_KEY is set in Environment Variables

### "Missing fingerprint ID" error
→ FingerprintJS didn't load. Check browser console.

### Slow response times
→ Expected for deep checks (15-25 sec). Use Quick Check for speed.

---

## 📝 License

MIT License - Feel free to use for personal or commercial projects.

---

## 🙏 Credits

Built with:
- [Anthropic Claude](https://anthropic.com) - AI models
- [Next.js](https://nextjs.org) - React framework
- [Vercel](https://vercel.com) - Hosting + KV storage
- [FingerprintJS](https://fingerprintjs.com) - User identification

---

## 📞 Support

Questions? Issues?
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup
- Anthropic Docs: https://docs.anthropic.com
- Vercel Docs: https://vercel.com/docs

---

**Ready to deploy?** Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.
