# 🎓 Signal vs Noise - Deployment for Complete Beginners

**Never deployed code before? No problem!** This guide assumes you know nothing and will walk you through everything step-by-step.

---

## 🎯 What We're Going to Do

We're going to put your fact-checker on the internet so anyone can use it. It will have its own web address (like `your-project.vercel.app`).

**Time needed:** About 30 minutes  
**Cost:** $0 to start (only pay when people use it a lot)

---

## 📋 What You Need Before Starting

### 1. A GitHub Account (Free)
This is like Google Drive for code. Your code lives here.

**How to get one:**
- Go to [github.com/signup](https://github.com/signup)
- Pick a username (like "brian-fact-checker")
- Use your email
- Create a password
- Done! ✅

### 2. A Vercel Account (Free)
This is the company that will host your website for free.

**How to get one:**
- Go to [vercel.com/signup](https://vercel.com/signup)
- Click "Continue with GitHub" (easier than email/password)
- It will ask you to connect - click "Authorize"
- Done! ✅

### 3. An Anthropic API Key (Free to start)
This lets your fact-checker talk to Claude AI.

**How to get one:**
- Go to [console.anthropic.com](https://console.anthropic.com)
- Sign in (use same email you use for Claude)
- Click "Get API Keys" on the left
- Click "Create Key"
- Give it a name like "Signal vs Noise"
- **IMPORTANT:** Copy the key that starts with `sk-ant-...`
- Save it somewhere safe (like Notes app) - you'll need it later!
- Done! ✅

---

## 🚀 Step-by-Step Deployment

### Step 1: Download and Extract Your Project

1. Download the file called **signal-vs-noise.tar.gz** from our chat
2. On Mac: Double-click it - it will create a folder called `signal-vs-noise`
3. On Windows: Right-click → "Extract All" → creates `signal-vs-noise` folder

**You should now have a folder with these files inside:**
```
signal-vs-noise/
  ├── app/
  ├── package.json
  ├── README.md
  └── other files...
```

---

### Step 2: Install the Tools We Need

We need two programs on your computer:

#### A. Install Node.js (it's free)

**What is it?** The program that runs JavaScript code on your computer.

**How to install:**
- Mac: Go to [nodejs.org](https://nodejs.org) → Download the "LTS" version → Open the file → Click through the installer
- Windows: Same thing - download, open, install

**How to check it worked:**
- Mac: Open "Terminal" app (search for it in Spotlight)
- Windows: Open "Command Prompt" (search for it in Start menu)
- Type this and press Enter:
  ```
  node --version
  ```
- If you see something like `v20.11.0`, it worked! ✅

#### B. Install Git (it's free)

**What is it?** The program that sends your code to GitHub.

**How to install:**
- Mac: Open Terminal and type:
  ```
  git --version
  ```
  - If it says "command not found", install from [git-scm.com/download/mac](https://git-scm.com/download/mac)
  - If it shows a version number, you already have it! ✅

- Windows: Download from [git-scm.com/download/win](https://git-scm.com/download/win) → Install → Use all default settings

---

### Step 3: Put Your Code Into the Project

**What we're doing:** Taking the fact-checker code (the artifact) and putting it in the right place.

1. Download the file called **fact-checker.jsx** from our chat
2. Open it in any text editor (Notepad on Windows, TextEdit on Mac)
3. Press Cmd+A (Mac) or Ctrl+A (Windows) to select all the code
4. Press Cmd+C (Mac) or Ctrl+C (Windows) to copy it

Now open your `signal-vs-noise` folder:
5. Go into the `app` folder
6. Open the file called `page.js` (use TextEdit or Notepad)
7. Delete everything in there
8. Paste your code (Cmd+V or Ctrl+V)
9. Save the file (Cmd+S or Ctrl+S)

**Done!** Your component is now in the project. ✅

---

### Step 4: Make 3 Small Code Changes

We need to update your code so it talks to your backend instead of directly to Claude.

#### Change #1: Update where it sends API requests

**What to find:** Look for this line (around line 760):
```javascript
response = await fetch("https://api.anthropic.com/v1/messages", {
```

**Change it to:**
```javascript
response = await fetch("/api/fact-check", {
```

**Find it again** around line 830 and change that one too!

**Why?** This makes it use YOUR secure backend instead of calling Claude directly.

---

#### Change #2: Add user tracking

**What to find:** Near the top of the file (around line 750), look for:
```javascript
const [history, setHistory] = useState([]);
```

**Right after that line, add these lines:**
```javascript
const [visitorId, setVisitorId] = useState(null);

useEffect(() => {
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

**Why?** This creates a unique ID for each user so you can track their 2 free checks.

---

#### Change #3: Update imports at the very top

**What to find:** The very first line of the file:
```javascript
import { useState, useRef, useCallback } from 'react';
```

**Change it to:**
```javascript
'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
```

**Why?** This tells Next.js that this is a browser component and adds the useEffect function we need.

---

#### Change #4: Update API calls to include fingerprint

**What to find:** In the fetch call you changed in Change #1, look for:
```javascript
headers: { "Content-Type": "application/json" },
```

**Change it to:**
```javascript
headers: { 
  "Content-Type": "application/json",
  "x-fingerprint-id": visitorId || "anonymous"
},
```

Do this for BOTH fetch calls (the two places you found in Change #1).

**Why?** This sends the user ID to your backend so it can track usage.

---

**Save the file!** (Cmd+S or Ctrl+S)

---

### Step 5: Put Your Code on GitHub

**What we're doing:** Uploading your code to GitHub so Vercel can see it.

1. Open Terminal (Mac) or Command Prompt (Windows)

2. Navigate to your project folder. Type this (replace the path with where YOUR folder is):
   ```bash
   cd ~/Downloads/signal-vs-noise
   ```
   - **Mac tip:** You can drag the folder into Terminal and it will type the path for you!

3. Now type these commands **one at a time**, pressing Enter after each:

   ```bash
   git init
   ```
   (This creates a git repository in your folder)

   ```bash
   git add .
   ```
   (This says "get ready to upload everything")

   ```bash
   git commit -m "Initial commit - fact checker ready to deploy"
   ```
   (This packages everything up)

4. Now go to [github.com](https://github.com) in your browser
   - Click the "+" in the top right
   - Click "New repository"
   - Name it: `signal-vs-noise`
   - Make it **Public** (or Private, your choice)
   - Don't check any boxes
   - Click "Create repository"

5. GitHub will show you some commands. Copy the ones under "push an existing repository":
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/signal-vs-noise.git
   git branch -M main
   git push -u origin main
   ```
   
   Paste them into Terminal/Command Prompt and press Enter.

6. Refresh the GitHub page - you should see all your files! ✅

---

### Step 6: Deploy to Vercel

**What we're doing:** Telling Vercel to make your code into a live website.

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)

2. Click "Add New..." → "Project"

3. It will show your GitHub repositories. Click "Import" next to `signal-vs-noise`

4. Leave everything as default and click "Deploy"

5. **Wait 2-3 minutes** while it builds. You'll see a progress screen.

6. When it's done, you'll see "🎉 Congratulations!" and a link like:
   ```
   https://signal-vs-noise-abc123.vercel.app
   ```

7. **Click the link** - your site is live! 🎉

**BUT WAIT** - it won't work yet! We need to set up the database and API key...

---

### Step 7: Add the Database (Vercel KV)

**What we're doing:** Creating a place to store how many times each user has checked facts.

1. In Vercel, click on your project name at the top

2. Click the "Storage" tab

3. Click "Create Database"

4. Choose "KV" (it's free)

5. Name it: `signal-vs-noise-kv`

6. Click "Create"

7. It will ask to connect to your project - click "Connect"

**Done!** The database is now connected. ✅

---

### Step 8: Add Your API Key

**What we're doing:** Telling your backend how to talk to Claude.

1. Still in Vercel, click the "Settings" tab

2. Click "Environment Variables" on the left

3. Add a new variable:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** Paste that key you saved earlier (starts with `sk-ant-...`)
   - Click "Save"

4. Now go back to "Deployments" tab

5. Find your most recent deployment (top of the list)

6. Click the "..." menu → "Redeploy"

7. Click "Redeploy" again to confirm

8. Wait 2 minutes for it to finish

**Done!** Your API key is now connected. ✅

---

### Step 9: Set a Spending Limit (IMPORTANT!)

**What we're doing:** Making sure you don't get a huge bill if something goes wrong.

1. Go to [console.anthropic.com](https://console.anthropic.com)

2. Click your profile icon (top right) → "Settings"

3. Click "Billing" on the left

4. Under "Spending Limits":
   - Monthly limit: Set to **$100**
   - Email alert: Set to **$50**

5. Click "Save"

**Done!** You're protected from big bills. ✅

---

### Step 10: Test It!

1. Go to your Vercel URL: `https://signal-vs-noise-abc123.vercel.app`

2. Try fact-checking something! Paste in:
   ```
   Breaking: The CDC just admitted that 90% of vaccinated people have severe side effects.
   ```

3. Click "ANALYZE FOR TRUTH ▶"

4. Wait 15-20 seconds (it's thinking!)

5. You should see the fact-check result! 🎉

6. Try it again - should work

7. Try a THIRD time - should say "You've used your 2 free fact-checks!"

**If that works, YOU'RE DONE!** Your fact-checker is live on the internet! 🚀

---

## 🎉 You Did It!

Your fact-checker is now live at: `https://your-project.vercel.app`

**Share it with friends and family!**

---

## 🐛 If Something Doesn't Work

### Problem: "Missing fingerprint ID" error
**Fix:** Clear your browser cache and try again

### Problem: "Rate limit exceeded" on first try
**Fix:** The database might not be connected. Go to Storage tab in Vercel and make sure you see your KV database there.

### Problem: Nothing happens when you click analyze
**Fix:** 
1. Open browser console (F12 or right-click → Inspect → Console tab)
2. Look for red error messages
3. Most likely you forgot to add the API key or it's wrong

### Problem: "API key not found"
**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Make sure `ANTHROPIC_API_KEY` is there
3. If not, add it
4. Redeploy (Deployments → ... → Redeploy)

---

## 📱 Want a Custom Domain?

Like `factchecker.com` instead of `signal-vs-noise-abc123.vercel.app`?

1. Buy a domain from [namecheap.com](https://namecheap.com) or [domains.google.com](https://domains.google.com) (costs ~$12/year)

2. In Vercel → Settings → Domains → Add your domain

3. Follow the instructions to update your DNS

4. Wait a few hours for it to work

5. Done! Your site will be at your custom domain

---

## 💰 How Much Will This Cost?

**Free tier (what you just set up):**
- Vercel hosting: **$0**
- Database: **$0**
- First few hundred fact-checks: **~$5**

**When it gets popular:**
- 1,000 checks/month: **~$10/month**
- 10,000 checks/month: **~$100/month** (but you set a $100 limit, so it stops there)

**If you add paid plans later:**
- You'll make money from subscriptions
- At 50 paying users ($7/month each): **$350/month revenue**
- Minus ~$50 API costs = **$300/month profit**

---

## 🎓 What You Just Learned

Congratulations! You just:
- ✅ Set up a GitHub account
- ✅ Created a repository
- ✅ Deployed code to production
- ✅ Connected a database
- ✅ Set up environment variables
- ✅ Configured API security
- ✅ Launched a real web application

**You're now a developer!** 🎉

---

## 🤔 Questions?

**"How do I update my code later?"**
1. Make changes to your files
2. In Terminal: `git add .` → `git commit -m "Updated XYZ"` → `git push`
3. Vercel automatically redeploys (takes 2 min)

**"How do I see how many people are using it?"**
- Vercel dashboard → Analytics (shows visitors, page views)
- Anthropic console → Usage (shows API calls)

**"Can I make money from this?"**
- Yes! Next step is adding Stripe for payments (we'll do that in Phase 2)

**"What if I break something?"**
- Don't worry! You can always redeploy an old version
- Vercel → Deployments → find an old one that worked → click "..." → "Promote to Production"

---

**You're all set! Your fact-checker is live!** 🚀

Share your URL with us - we'd love to see it!
