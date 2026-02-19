# Component Integration Guide

## How to Connect Your Fact-Checker Artifact to the Vercel Backend

Follow these steps to integrate your React component with the API proxy.

---

## Step 1: Copy Your Component to `app/page.js`

1. Open your `fact-checker.jsx` artifact
2. Copy the **entire file content**
3. Paste it into `app/page.js` (replacing the placeholder)

---

## Step 2: Make These Key Changes

### A. Update the fetch() calls

Find **both** locations where the component calls Anthropic API directly (lines ~760 and ~830):

**FIND THIS:**
```javascript
response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  signal: controller.signal,
  body: JSON.stringify({ model, max_tokens, system, tools, messages })
});
```

**REPLACE WITH THIS:**
```javascript
response = await fetch("/api/fact-check", {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "x-fingerprint-id": visitorId || "anonymous"
  },
  signal: controller.signal,
  body: JSON.stringify({ model, max_tokens, system, tools, messages })
});
```

**Why:** Routes API calls through your secure backend instead of directly to Anthropic.

---

### B. Add FingerprintJS for Rate Limiting

**At the top of your component** (after the useState declarations around line 745), add:

```javascript
const [visitorId, setVisitorId] = useState(null);

useEffect(() => {
  // Load FingerprintJS from CDN
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js';
  script.async = true;
  script.onload = () => {
    window.FingerprintJS.load().then(fp => fp.get()).then(result => {
      setVisitorId(result.visitorId);
    });
  };
  document.head.appendChild(script);
}, []);
```

**Why:** Creates a unique ID for each user to track their 2 free checks.

---

### C. Update Error Handling for Rate Limits

Find the error handling in `handleCheck` (around line 920). Add special handling for rate limit errors:

**FIND THIS:**
```javascript
} catch (err) {
  if (err.name === "AbortError") {
    setError("Request cancelled.");
  } else {
    setError(err.message || "Unknown error occurred.");
  }
  setResult(null);
}
```

**REPLACE WITH THIS:**
```javascript
} catch (err) {
  if (err.name === "AbortError") {
    setError("Request cancelled.");
  } else if (err.message.includes("rate_limit_exceeded")) {
    setError("You've used your 2 free fact-checks! Upgrade to Pro for unlimited checks.");
  } else if (err.message.includes("budget_exceeded")) {
    setError("Service temporarily at capacity. Please try again in a few hours.");
  } else {
    setError(err.message || "Unknown error occurred.");
  }
  setResult(null);
}
```

**Why:** Shows user-friendly messages when they hit the free tier limit.

---

### D. Add Missing useEffect Import

At the top of the file, update the React import:

**FIND THIS:**
```javascript
import { useState, useRef, useCallback } from 'react';
```

**REPLACE WITH THIS:**
```javascript
import { useState, useRef, useCallback, useEffect } from 'react';
```

**Why:** Needed for FingerprintJS setup.

---

## Step 3: Test Locally (Optional)

```bash
# In your project directory
npm install
npm run dev

# Open http://localhost:3000
```

**Note:** Rate limiting won't work locally without Vercel KV, but the app will still function.

---

## Step 4: Deploy to Vercel

Follow the full guide in [DEPLOYMENT.md](./DEPLOYMENT.md)

Quick version:
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main

# Then import to Vercel dashboard
```

---

## ✅ Verification After Deploy

Test these scenarios:

1. **First check works** → Should complete normally
2. **Second check works** → Should complete normally
3. **Third check fails** → Should show: "You've used your 2 free fact-checks!"
4. **Next day** → Counter resets, can do 2 more checks

---

## 🔍 What Changed?

| Before (Artifact) | After (Vercel) |
|-------------------|----------------|
| Direct Anthropic API calls | Proxied through `/api/fact-check` |
| No rate limiting | 2 free checks per user |
| API key in browser | API key server-side only |
| Unlimited usage | Daily budget protection |
| No user tracking | FingerprintJS identifies users |

---

## 🐛 Common Issues

### "Missing fingerprint ID" error
→ FingerprintJS didn't load. Check browser console for script errors.

### Checks work but rate limit doesn't
→ Vercel KV not connected. Go to Storage tab in Vercel dashboard.

### All checks fail immediately
→ ANTHROPIC_API_KEY not set. Check Environment Variables.

---

## 📝 Summary of Changes

**3 code changes total:**
1. Update `fetch()` URLs to `/api/fact-check`
2. Add FingerprintJS initialization
3. Enhance error handling for rate limits

**Result:** Production-ready fact-checker with rate limiting and cost protection!

---

Need help? Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting.
