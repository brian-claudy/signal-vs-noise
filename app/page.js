'use client';
import { useState, useEffect, useRef } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Bebas_Neue, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react"

const bebasNeue = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  display: 'optional',
  fallback: ['system-ui', 'arial'],
});

const dmSans = DM_Sans({ 
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  display: 'optional',
  fallback: ['system-ui', 'sans-serif'],
});

const jetBrainsMono = JetBrains_Mono({ 
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'optional',
  fallback: ['Courier New', 'monospace'],
});
// PROMPTS
const ANALYSIS_PROMPT = `You are a specialized misinformation detection AI. Your role is to fact-check claims, URLs, and images with extreme rigor.

PROCESS:
1. MULTI-ANGLE FACT-CHECK SEARCH STRATEGY (run 5-8 searches in this order):
   a) PRIMARY FACT-CHECK DATABASES (run these FIRST - highest priority):
      - Search 1: "site:snopes.com [claim]"
      - Search 2: "site:politifact.com [claim]" 
      - Search 3: "site:factcheck.org [claim]"
      - Search 4: "site:reuters.com/fact-check [claim]"
      - Search 5: "site:apnews.com/ap-fact-check [claim]"
   
   b) If no results from fact-check sites, then run general searches:
      - Broad search: "[claim]" to understand context
      - Primary sources: Look for official statements, original documents
      - Counter-narratives: "[claim] debunked" or "[claim] false"
      - Recent news: "[claim] [current year]"
   
   c) If the claim involves a named person/organization:
      - Search their official website or verified social media

2. EXTRACT & ANALYZE CLAIMS:
   - Break down the input into individual factual claims
   - For each claim, determine: TRUE, FALSE, MISLEADING, or UNVERIFIABLE
   - Cite specific sources for each determination

3. DETECT RED FLAGS (be explicit about these):
   - Conspiracy theory hashtags (#qanon, #wwg1wga, #pizzagate, etc.)
   - Emotional manipulation language ("they don't want you to know", "wake up")
   - Cherry-picked statistics without context
   - Misattributed quotes or out-of-context clips
   - Deepfakes or manipulated images
   - Appeals to fear, anger, or tribalism
   - Lack of credible sources
   - Logical fallacies

4. VERDICT SCALE (choose ONE):
   - FACT: Supported by multiple credible sources, no contradictions
   - MOSTLY FACT: Largely accurate with minor issues or missing context
   - MISLEADING: Contains truth but presented in a deceptive way
   - MOSTLY FALSE: Largely inaccurate with some kernel of truth
   - FALSE: Definitively disproven by credible sources
   - UNVERIFIABLE: Insufficient evidence to make a determination

5. CONFIDENCE SCORE (0-100%):
   - Based on source quality, consensus, and evidence strength
   - Be honest about uncertainty

RESPONSE FORMAT (JSON):
{
  "verdict": "FACT|MOSTLY FACT|MISLEADING|MOSTLY FALSE|FALSE|UNVERIFIABLE",
  "confidence": 85,
  "summary": "One-sentence bottom line",
  "bottomLine": "2-3 sentence plain-English explanation of the verdict",
  "claims": [
    {
      "claim": "Specific claim from input",
      "status": "TRUE|FALSE|MISLEADING|UNVERIFIABLE",
      "explanation": "Why this claim received this status"
    }
  ],
  "redFlags": [
    "List any manipulation tactics, conspiracy elements, or misleading framing"
  ],
  "citations": [
    {
      "title": "Source title",
      "url": "https://...",
      "reliability": "HIGH|MEDIUM|LOW",
      "summary": "What this source says"
    }
  ]
}

CRITICAL RULES:
- Prioritize fact-check databases (Snopes, PolitiFact, etc.) as most authoritative
- If fact-checkers disagree, note the disagreement explicitly
- Don't hedge excessively - if something is clearly false, say so
- Provide specific evidence, not vague assertions
- If an image is manipulated, explain how you can tell
- Always cite your sources with URLs
- For political claims, check both conservative and liberal fact-checkers
- Be aware of satire sites (The Onion, Babylon Bee) - flag them clearly`;

const QUICK_CHECK_PROMPT = `You are a rapid fact-checking AI. Perform a QUICK assessment (1-2 web searches max).

PROCESS:
1. Run 1-2 targeted searches (prioritize fact-check sites if relevant)
2. Provide a fast, high-confidence verdict if possible
3. If unable to verify quickly, return UNVERIFIABLE and suggest Deep Research

Keep it brief but accurate. Use the same JSON format as the main analysis.`;

const DEEP_RESEARCH_PROMPT = `You are an investigative fact-checking AI conducting DEEP RESEARCH. This is a comprehensive, multi-source analysis.

COMPREHENSIVE SEARCH STRATEGY (10-15 searches):

1. COMPREHENSIVE FACT-CHECK DATABASE SWEEP (5-7 searches):
   - site:snopes.com [claim]
   - site:politifact.com [claim]
   - site:factcheck.org [claim]
   - site:reuters.com/fact-check [claim]
   - site:apnews.com/ap-fact-check [claim]
   - site:fullfact.org [claim] (UK-based)
   - site:factcheck.afp.com [claim] (global coverage)

2. PRIMARY SOURCE VERIFICATION (2-3 searches):
   - Official government data/statements
   - Original scientific papers or studies
   - Direct quotes from authoritative sources
   - Historical records or archives

3. COUNTER-NARRATIVE ANALYSIS (2-3 searches):
   - "[claim] debunked"
   - "[claim] false"
   - Expert critiques or rebuttals
   - Alternative explanations

4. TEMPORAL ANALYSIS (1-2 searches):
   - "[claim] [current year]" for recent developments
   - "[claim] history" to understand evolution
   - When did this claim first appear?

5. EXPERT CONSULTATION (1-2 searches):
   - Academic expert opinions
   - Industry professional analysis
   - Subject matter authority statements

ANALYSIS DEPTH:
- Cross-reference ALL sources for consistency
- Note methodology of fact-checkers (how did they verify?)
- Identify any conflicts of interest in sources
- Examine the ABSENCE of coverage (is mainstream media ignoring this?)
- Assess the claim's origin and propagation pattern

Use the same JSON format but provide MORE detail in explanations and citations.`;

const IMAGE_ANALYSIS_PROMPT = `You are analyzing an image for potential misinformation. Consider:

VISUAL ANALYSIS:
1. Is this image manipulated? (Check for: inconsistent lighting, perspective issues, clone stamp artifacts, unnatural edges)
2. Is this image taken out of context? (Reverse image search for original source)
3. Does the image match the accompanying claim?
4. Are there signs of AI generation? (Unnatural details, impossible physics, weird text)

TEXT IN IMAGE:
1. Extract all visible text
2. Fact-check any claims made in text overlays
3. Check if quotes are real and properly attributed
4. Identify any conspiracy hashtags or coded language

CONTEXT VERIFICATION:
1. When/where was this image originally taken?
2. Is it being presented with false context?
3. Does it show what it claims to show?

Provide detailed analysis using the same JSON format.`;
// Verdict configurations
const VERDICT_CONFIG = {
  "FACT": {
    color: "#00C851",
    label: "VERIFIED FACT",
    bgGradient: "linear-gradient(135deg, rgba(0,200,81,0.15), rgba(0,200,81,0.05))",
    borderColor: "rgba(0,200,81,0.3)",
    icon: "✓"
  },
  "MOSTLY FACT": {
    color: "#7BC67E",
    label: "MOSTLY ACCURATE",
    bgGradient: "linear-gradient(135deg, rgba(123,198,126,0.15), rgba(123,198,126,0.05))",
    borderColor: "rgba(123,198,126,0.3)",
    icon: "✓"
  },
  "MISLEADING": {
    color: "#FFB300",
    label: "MISLEADING",
    bgGradient: "linear-gradient(135deg, rgba(255,179,0,0.15), rgba(255,179,0,0.05))",
    borderColor: "rgba(255,179,0,0.3)",
    icon: "⚠"
  },
  "MOSTLY FALSE": {
    color: "#FF7043",
    label: "MOSTLY FALSE",
    bgGradient: "linear-gradient(135deg, rgba(255,112,67,0.15), rgba(255,112,67,0.05))",
    borderColor: "rgba(255,112,67,0.3)",
    icon: "✗"
  },
  "FALSE": {
    color: "#FF1744",
    label: "FALSE",
    bgGradient: "linear-gradient(135deg, rgba(255,23,68,0.15), rgba(255,23,68,0.05))",
    borderColor: "rgba(255,23,68,0.3)",
    icon: "✗"
  },
  "UNVERIFIABLE": {
    color: "#90A4AE",
    label: "UNVERIFIABLE",
    bgGradient: "linear-gradient(135deg, rgba(144,164,174,0.15), rgba(144,164,174,0.05))",
    borderColor: "rgba(144,164,174,0.3)",
    icon: "?"
  }
};

// Helper: Generate report text
function generateReportText(result, urlInput, textInput) {
  const verdictConfig = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG["UNVERIFIABLE"];
  
  let report = `FACT-CHECK REPORT\n`;
  report += `${'='.repeat(60)}\n\n`;
  report += `VERDICT: ${verdictConfig.label}\n`;
  report += `CONFIDENCE: ${result.confidence}%\n\n`;
  report += `SUMMARY:\n${result.summary}\n\n`;
  report += `BOTTOM LINE:\n${result.bottomLine}\n\n`;
  
  if (urlInput || textInput) {
    report += `INPUT ANALYZED:\n`;
    if (urlInput) report += `URL: ${urlInput}\n`;
    if (textInput) report += `Text: ${textInput}\n`;
    report += `\n`;
  }
  
  if (result.claims && result.claims.length > 0) {
    report += `CLAIMS BREAKDOWN:\n`;
    result.claims.forEach((claim, i) => {
      report += `\n${i + 1}. ${claim.claim}\n`;
      report += `   Status: ${claim.status}\n`;
      report += `   ${claim.explanation}\n`;
    });
    report += `\n`;
  }
  
  if (result.redFlags && result.redFlags.length > 0) {
    report += `RED FLAGS DETECTED:\n`;
    result.redFlags.forEach((flag, i) => {
      report += `${i + 1}. ${flag}\n`;
    });
    report += `\n`;
  }
  
  if (result.citations && result.citations.length > 0) {
    report += `SOURCES:\n`;
    result.citations.forEach((cite, i) => {
      report += `\n${i + 1}. ${cite.title}\n`;
      report += `   URL: ${cite.url}\n`;
      if (cite.reliability) report += `   Reliability: ${cite.reliability}\n`;
      if (cite.summary) report += `   ${cite.summary}\n`;
    });
  }
  
  report += `\n${'='.repeat(60)}\n`;
  report += `Generated by Signal vs Noise AI\n`;
  report += `https://signalnoise.tech\n`;
  
  return report;
}
// ResultPanel Component
function ResultPanel({ result, onClose, urlInput, textInput, hasImage }) {
  const [exporting, setExporting] = useState(false);
  const verdictConfig = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG["UNVERIFIABLE"];

  const handleExport = async () => {
    setExporting(true);
    try {
      const reportText = generateReportText(result, urlInput, textInput);
      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fact-check-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      background: "rgba(10,10,15,0.97)",
      backdropFilter: "blur(20px)",
      borderRadius: 20,
      padding: "32px",
      maxWidth: 900,
      width: "100%",
      boxShadow: "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
      position: "relative",
      animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 20, right: 20,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, width: 36, height: 36,
          color: "#78909C", cursor: "pointer",
          fontSize: 20, lineHeight: 1,
          transition: "all 0.2s"
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,23,68,0.15)";
          e.currentTarget.style.borderColor = "rgba(255,23,68,0.3)";
          e.currentTarget.style.color = "#FF1744";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          e.currentTarget.style.color = "#78909C";
        }}
      >×</button>

      {/* Verdict Badge */}
      <div style={{
        background: verdictConfig.bgGradient,
        border: `1px solid ${verdictConfig.borderColor}`,
        borderRadius: 16,
        padding: "24px 28px",
        marginBottom: 28,
        boxShadow: `0 8px 24px ${verdictConfig.color}22`
      }}>
        <div style={{
          fontFamily: dmSans.style.fontFamily,
          fontSize: 11,
          color: verdictConfig.color,
          fontWeight: 700,
          letterSpacing: 2.5,
          marginBottom: 8,
          opacity: 0.7
        }}>VERDICT</div>
        <div style={{
          fontFamily: bebasNeue.style.fontFamily,
          fontSize: 38,
          color: verdictConfig.color,
          fontWeight: 900,
          letterSpacing: 3,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span style={{ fontSize: 32 }}>{verdictConfig.icon}</span>
          {verdictConfig.label}
        </div>
        <div style={{
          fontFamily: dmSans.style.fontFamily,
          fontSize: 16,
          color: "#E0E0E0",
          fontStyle: "italic",
          marginBottom: 14,
          lineHeight: 1.5
        }}>"{result.summary}"</div>
        <div style={{
          fontFamily: jetBrainsMono.style.fontFamily,
          fontSize: 12,
          color: "#90A4AE",
          letterSpacing: 1
        }}>Confidence: {result.confidence}%</div>
      </div>

      {/* Bottom Line */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 20,
        marginBottom: 20
      }}>
        <div style={{
          fontFamily: dmSans.style.fontFamily,
          fontSize: 11,
          color: "#607D8B",
          fontWeight: 700,
          letterSpacing: 2.5,
          marginBottom: 10
        }}>BOTTOM LINE</div>
        <div style={{
          fontFamily: dmSans.style.fontFamily,
          fontSize: 15,
          color: "#CFD8DC",
          lineHeight: 1.7
        }}>{result.bottomLine}</div>
      </div>

      {/* Claims Breakdown */}
      {result.claims && result.claims.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: dmSans.style.fontFamily,
            fontSize: 11,
            color: "#607D8B",
            fontWeight: 700,
            letterSpacing: 2.5,
            marginBottom: 12
          }}>CLAIMS ANALYZED</div>
          {result.claims.map((claim, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 10
            }}>
              <div style={{
                fontFamily: dmSans.style.fontFamily,
                fontSize: 13,
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: 8
              }}>{claim.claim}</div>
              <div style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                marginBottom: 8,
                background: claim.status === "TRUE" ? "rgba(0,200,81,0.15)" :
                           claim.status === "FALSE" ? "rgba(255,23,68,0.15)" :
                           claim.status === "MISLEADING" ? "rgba(255,179,0,0.15)" :
                           "rgba(144,164,174,0.15)",
                color: claim.status === "TRUE" ? "#00C851" :
                       claim.status === "FALSE" ? "#FF1744" :
                       claim.status === "MISLEADING" ? "#FFB300" :
                       "#90A4AE"
              }}>{claim.status}</div>
              <div style={{
                fontFamily: dmSans.style.fontFamily,
                fontSize: 13,
                color: "#B0BEC5",
                lineHeight: 1.6
              }}>{claim.explanation}</div>
            </div>
          ))}
        </div>
      )}

      {/* Red Flags */}
      {result.redFlags && result.redFlags.length > 0 && (
        <div style={{
          background: "rgba(255,23,68,0.08)",
          border: "1px solid rgba(255,23,68,0.15)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20
        }}>
          <div style={{
            fontFamily: dmSans.style.fontFamily,
            fontSize: 11,
            color: "#EF5350",
            fontWeight: 700,
            letterSpacing: 2.5,
            marginBottom: 10
          }}>🚩 RED FLAGS DETECTED</div>
          <ul style={{
            margin: 0,
            paddingLeft: 20,
            fontFamily: dmSans.style.fontFamily,
            fontSize: 14,
            color: "#FFAAAA",
            lineHeight: 1.8
          }}>
            {result.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
          </ul>
        </div>
      )}

      {/* Citations */}
      {result.citations && result.citations.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: dmSans.style.fontFamily,
            fontSize: 11,
            color: "#607D8B",
            fontWeight: 700,
            letterSpacing: 2.5,
            marginBottom: 12
          }}>SOURCES & CITATIONS</div>
          {result.citations.map((cite, i) => (
            <a
              key={i}
              href={cite.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                textDecoration: "none",
                color: "#90A8B8",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <div style={{
                fontFamily: dmSans.style.fontFamily,
                fontSize: 14,
                fontWeight: 500
              }}>{cite.title || cite.url} ↗</div>
            </a>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <button
        onClick={handleExport}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%",
          padding: "14px 20px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          color: "#607D8B",
          cursor: "pointer",
          fontFamily: jetBrainsMono.style.fontFamily,
          fontSize: 10,
          letterSpacing: 2.5,
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { 
          e.currentTarget.style.background = "rgba(255,255,255,0.07)"; 
          e.currentTarget.style.color = "#90A4AE"; 
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => { 
          e.currentTarget.style.background = "rgba(255,255,255,0.03)"; 
          e.currentTarget.style.color = "#607D8B"; 
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {exporting ? (
          <>
            <span style={{ width: 10, height: 10, border: "1.5px solid rgba(255,255,255,0.15)", borderTopColor: "#607D8B", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
            BUILDING REPORT...
          </>
        ) : (
          <>
            <span style={{ fontSize: 14, opacity: 0.6 }}>⬇</span>
            EXPORT REPORT
          </>
        )}
      </button>

      <button
        onClick={async (e) => {
          try {
            const response = await fetch('/api/save-check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ result, urlInput, textInput, hasImage })
            });
            
            if (!response.ok) throw new Error('Failed to save');
            
            const data = await response.json();
            const shareUrl = `https://signalnoise.tech/check/${data.id}`;
            
            await navigator.clipboard.writeText(shareUrl);
            
            const btn = e.currentTarget;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span style="font-size:11px">✓</span> LINK COPIED!';
            btn.style.background = 'rgba(0,200,81,0.12)';
            btn.style.borderColor = 'rgba(0,200,81,0.3)';
            btn.style.color = '#00C851';
            
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.background = 'rgba(255,255,255,0.03)';
              btn.style.borderColor = 'rgba(255,255,255,0.1)';
              btn.style.color = '#607D8B';
            }, 3000);
          } catch (err) {
            console.error('Share error:', err);
            alert('Failed to create share link. Please try again.');
          }
        }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%", marginTop: 10,
          padding: "14px 20px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          color: "#607D8B",
          cursor: "pointer",
          fontFamily: jetBrainsMono.style.fontFamily,
          fontSize: 10,
          letterSpacing: 2.5,
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { 
          e.currentTarget.style.background = "rgba(255,255,255,0.07)"; 
          e.currentTarget.style.color = "#90A4AE"; 
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => { 
          e.currentTarget.style.background = "rgba(255,255,255,0.03)"; 
          e.currentTarget.style.color = "#607D8B"; 
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.6 }}>🔗</span>
        SHARE THIS FACT-CHECK
      </button>

    </div>
  );
}
// Main Component
export default function Home() {
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [usageCount, setUsageCount] = useState(0);
  const [fingerprint, setFingerprint] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [bonusChecks, setBonusChecks] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [quickCheck, setQuickCheck] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize fingerprint
  useEffect(() => {
    const initFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
        
        // Check usage count and Pro status
        const usageRes = await fetch('/api/check-usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-fingerprint-id': result.visitorId
          }
        });
        
        if (usageRes.ok) {
          const data = await usageRes.json();
          setUsageCount(data.usage || 0);
          setBonusChecks(data.bonusChecks || 0);
          setIsPro(data.isPro || false);
        }
      } catch (err) {
        console.error('Fingerprint error:', err);
      }
    };
    initFingerprint();
  }, []);

  // Image upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, etc.)");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large. Please use an image under 5MB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const maxDimension = 2000;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL(file.type, 0.8).split(",")[1];
        setUploadedImage({ data: base64, type: file.type, name: file.name });
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Promo code handler
  const handlePromoCode = async () => {
    if (!promoCode.trim()) return;
    if (!fingerprint) {
      setPromoMessage("⚠ Please wait for initialization...");
      return;
    }

    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-fingerprint-id': fingerprint
        },
        body: JSON.stringify({ code: promoCode.toUpperCase() })
      });

      const data = await res.json();
      
      if (res.ok) {
        setBonusChecks(data.bonusChecks);
        setPromoMessage(`✓ ${data.message}`);
        setPromoCode('');
        setTimeout(() => setPromoMessage(''), 5000);
      } else {
        setPromoMessage(`✗ ${data.error}`);
        setTimeout(() => setPromoMessage(''), 3000);
      }
    } catch (err) {
      setPromoMessage("✗ Failed to apply code");
      setTimeout(() => setPromoMessage(''), 3000);
    }
  };

  // Main fact-check handler
  const handleCheck = async () => {
    if (!textInput.trim() && !urlInput.trim() && !uploadedImage) {
      setError("Please enter a claim, URL, or upload an image to fact-check.");
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const messages = [];
      
      // Build content array
      const content = [];
      
      if (uploadedImage) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: uploadedImage.type,
            data: uploadedImage.data
          }
        });
      }
      
      let promptText = deepResearch ? DEEP_RESEARCH_PROMPT : 
                       quickCheck ? QUICK_CHECK_PROMPT : 
                       ANALYSIS_PROMPT;
      
      if (uploadedImage) {
        promptText = IMAGE_ANALYSIS_PROMPT + "\n\n" + promptText;
      }
      
      if (urlInput.trim()) {
        promptText += `\n\nURL to fact-check: ${urlInput}`;
      }
      
      if (textInput.trim()) {
        promptText += `\n\nClaim to fact-check: ${textInput}`;
      }
      
      content.push({ type: "text", text: promptText });
      messages.push({ role: "user", content });

      // Determine model and timeout
      let model = "claude-haiku-4-20250228";
      let timeout = 45000;
      
      if (deepResearch) {
        model = "claude-sonnet-4-20250514";
        timeout = 90000;
      } else if (quickCheck) {
        model = "claude-haiku-4-20250228";
        timeout = 30000;
      }

      // API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch('/api/fact-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-fingerprint-id': fingerprint
        },
        body: JSON.stringify({
          model,
          max_tokens: deepResearch ? 8192 : 4096,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 429) {
          setError(errorData.error.message || "Rate limit reached. Please upgrade to Pro for unlimited checks!");
          return;
        }
        
        throw new Error(errorData.error?.message || 'Fact-check failed');
      }

      const data = await response.json();
      
      // Update usage count
      setUsageCount(prev => prev + 1);
      if (bonusChecks > 0) {
        setBonusChecks(prev => prev - 1);
      }

      // Parse result
      let analysisResult;
      const textContent = data.content?.find(c => c.type === "text")?.text || "";
      
      const jsonMatch = textContent.match(/\{[\s\S]*"verdict"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisResult = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("JSON parse error:", e);
        }
      }

      if (!analysisResult) {
        analysisResult = {
          verdict: "UNVERIFIABLE",
          confidence: 0,
          summary: "Unable to parse fact-check results",
          bottomLine: textContent.substring(0, 300),
          claims: [],
          redFlags: [],
          citations: []
        };
      }

      setResult(analysisResult);

    } catch (err) {
      if (err.name === 'AbortError') {
        setError("Request timed out. Try Quick Check mode or a shorter claim.");
      } else {
        console.error('FACT-CHECK ERROR:', err.message);
        setError(err.message || "An error occurred during fact-checking.");
      }
    } finally {
      setLoading(false);
    }
  };
  // JSX Return
  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --mono: ${jetBrainsMono.style.fontFamily};
        }
        body {
          background: linear-gradient(180deg, #080810 0%, #0D0D18 100%);
          min-height: 100vh;
          overflow-x: hidden;
          font-family: ${dmSans.style.fontFamily};
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative"
      }}>

        {/* Background effects */}
        <div style={{
          position: "fixed",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(229,57,53,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          animation: "float 8s ease-in-out infinite"
        }} />
        
        <div style={{
          position: "fixed",
          bottom: "-20%",
          left: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(229,57,53,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          animation: "float 10s ease-in-out infinite 1s"
        }} />

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-30px); }
          }
        `}</style>

        {/* Main content */}
        <div style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: result ? 1000 : 700
        }}>

          {!result ? (
            // Input form
            <div style={{
              background: "rgba(10,10,15,0.85)",
              backdropFilter: "blur(20px)",
              borderRadius: 24,
              padding: "40px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)"
            }}>

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <h1 style={{
                  fontFamily: bebasNeue.style.fontFamily,
                  fontSize: 56,
                  fontWeight: 900,
                  letterSpacing: 4,
                  marginBottom: 12,
                  background: "linear-gradient(135deg, #FFFFFF 0%, #E53935 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>SIGNAL VS NOISE</h1>
                <p style={{
                  fontFamily: dmSans.style.fontFamily,
                  fontSize: 16,
                  color: "#90A4AE",
                  fontWeight: 500,
                  letterSpacing: 0.5
                }}>AI-Powered Fact-Checking</p>
              </div>

              {/* URL Input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontFamily: dmSans.style.fontFamily,
                  fontSize: 12,
                  color: "#78909C",
                  marginBottom: 8,
                  fontWeight: 600,
                  letterSpacing: 1
                }}>PASTE URL (OPTIONAL)</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/article"
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#ECEFF1",
                    fontSize: 15,
                    fontFamily: dmSans.style.fontFamily,
                    outline: "none",
                    transition: "all 0.2s"
                  }}
                  onFocus={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.06)";
                    e.target.style.borderColor = "rgba(229,57,53,0.4)";
                  }}
                  onBlur={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.04)";
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                />
              </div>

              {/* Text Input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontFamily: dmSans.style.fontFamily,
                  fontSize: 12,
                  color: "#78909C",
                  marginBottom: 8,
                  fontWeight: 600,
                  letterSpacing: 1
                }}>OR ENTER CLAIM</label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste the claim you want to fact-check..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#ECEFF1",
                    fontSize: 15,
                    fontFamily: dmSans.style.fontFamily,
                    resize: "vertical",
                    outline: "none",
                    transition: "all 0.2s",
                    lineHeight: 1.6
                  }}
                  onFocus={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.06)";
                    e.target.style.borderColor = "rgba(229,57,53,0.4)";
                  }}
                  onBlur={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.04)";
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                />
              </div>

              {/* Image Upload */}
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: "block",
                  fontFamily: dmSans.style.fontFamily,
                  fontSize: 12,
                  color: "#78909C",
                  marginBottom: 8,
                  fontWeight: 600,
                  letterSpacing: 1
                }}>OR UPLOAD IMAGE</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    background: uploadedImage ? "rgba(0,200,81,0.12)" : "rgba(255,255,255,0.04)",
                    border: uploadedImage ? "1px solid rgba(0,200,81,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: uploadedImage ? "#00C851" : "#90A4AE",
                    fontSize: 14,
                    fontFamily: dmSans.style.fontFamily,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontWeight: 600
                  }}
                  onMouseEnter={(e) => {
                    if (!uploadedImage) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploadedImage) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    }
                  }}
                >
                  {uploadedImage ? `✓ ${uploadedImage.name}` : "📎 Upload Screenshot or Image"}
                </button>
                {uploadedImage && (
                  <button
                    onClick={() => setUploadedImage(null)}
                    style={{
                      marginTop: 8,
                      padding: "8px 16px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#FF5252",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: dmSans.style.fontFamily
                    }}
                  >Remove Image</button>
                )}
              </div>

              {/* Mode Toggles */}
              <div style={{
                display: "flex",
                gap: 12,
                marginBottom: 24,
                padding: "16px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <button
                  onClick={() => {
                    setQuickCheck(!quickCheck);
                    if (!quickCheck) setDeepResearch(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: quickCheck ? "rgba(100,181,246,0.15)" : "rgba(255,255,255,0.03)",
                    border: quickCheck ? "1px solid rgba(100,181,246,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    color: quickCheck ? "#64B5F6" : "#78909C",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: dmSans.style.fontFamily,
                    letterSpacing: 0.5,
                    transition: "all 0.2s"
                  }}
                >⚡ QUICK (5s)</button>
                
                <button
                  onClick={() => {
                    setDeepResearch(!deepResearch);
                    if (!deepResearch) setQuickCheck(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: deepResearch ? "rgba(156,39,176,0.15)" : "rgba(255,255,255,0.03)",
                    border: deepResearch ? "1px solid rgba(156,39,176,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    color: deepResearch ? "#AB47BC" : "#78909C",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: dmSans.style.fontFamily,
                    letterSpacing: 0.5,
                    transition: "all 0.2s"
                  }}
                >🔬 DEEP (3-5min)</button>
              </div>

              {/* Error message */}
              {error && (
                <div style={{
                  padding: "14px 18px",
                  background: "rgba(255,23,68,0.12)",
                  border: "1px solid rgba(255,23,68,0.25)",
                  borderRadius: 12,
                  color: "#FF5252",
                  fontSize: 14,
                  marginBottom: 20,
                  fontFamily: dmSans.style.fontFamily,
                  lineHeight: 1.5
                }}>{error}</div>
              )}

              {/* Analyze button */}
              <button
                onClick={handleCheck}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "18px 24px",
                  background: loading ? "rgba(144,164,174,0.2)" : "linear-gradient(135deg, #C62828 0%, #E53935 50%, #FF1744 100%)",
                  border: "none",
                  borderRadius: 14,
                  color: "white",
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 2,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: bebasNeue.style.fontFamily,
                  transition: "all 0.25s",
                  boxShadow: loading ? "none" : "0 12px 28px rgba(229,57,53,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 18px 40px rgba(229,57,53,0.45)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 12px 28px rgba(229,57,53,0.35)";
                  }
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite"
                    }} />
                    ANALYZING...
                  </>
                ) : (
                  <>🔍 ANALYZE FOR TRUTH</>
                )}
              </button>

              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
              `}</style>

              {/* Usage counter */}
              {!isPro && (
                <div style={{
                  marginTop: 20,
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  textAlign: "center"
                }}>
                  <div style={{
                    fontFamily: dmSans.style.fontFamily,
                    fontSize: 13,
                    color: "#78909C",
                    marginBottom: 4
                  }}>
                    {bonusChecks > 0 ? (
                      <>✨ Bonus checks remaining: <span style={{ color: "#00C851", fontWeight: 700 }}>{bonusChecks}</span></>
                    ) : (
                      <>Free tier: <span style={{ color: usageCount >= 2 ? "#FF5252" : "#64B5F6", fontWeight: 700 }}>{usageCount}/2</span> used today</>
                    )}
                  </div>
                  
                    href="https://buy.stripe.com/3cs5otcKC9fP5fG6os"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      padding: "6px 14px",
                      background: "rgba(100,181,246,0.12)",
                      border: "1px solid rgba(100,181,246,0.25)",
                      borderRadius: 8,
                      color: "#64B5F6",
                      fontSize: 11,
                      fontWeight: 700,
                      textDecoration: "none",
                      letterSpacing: 1,
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(100,181,246,0.2)";
                      e.currentTarget.style.borderColor = "rgba(100,181,246,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(100,181,246,0.12)";
                      e.currentTarget.style.borderColor = "rgba(100,181,246,0.25)";
                    }}
                  >
                    ⚡ UPGRADE TO PRO — $7/MO
                      </a>
                </div>
              )}

              {/* Promo code section */}
              {!isPro && usageCount >= 2 && bonusChecks === 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{
                    display: "flex",
                    gap: 8
                  }}>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="PROMO CODE"
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        color: "#ECEFF1",
                        fontSize: 13,
                        fontFamily: jetBrainsMono.style.fontFamily,
                        outline: "none",
                        letterSpacing: 1
                      }}
                    />
                    <button
                      onClick={handlePromoCode}
                      style={{
                        padding: "12px 20px",
                        background: "rgba(0,200,81,0.15)",
                        border: "1px solid rgba(0,200,81,0.25)",
                        borderRadius: 10,
                        color: "#00C851",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: dmSans.style.fontFamily,
                        letterSpacing: 1
                      }}
                    >APPLY</button>
                  </div>
                  {promoMessage && (
                    <div style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: promoMessage.startsWith('✓') ? "#00C851" : "#FF5252",
                      fontFamily: dmSans.style.fontFamily
                    }}>{promoMessage}</div>
                  )}
                </div>
              )}

            </div>
          ) : (
            // Result display
            <ResultPanel
              result={result}
              onClose={() => {
                setResult(null);
                setTextInput('');
                setUrlInput('');
                setUploadedImage(null);
              }}
              urlInput={urlInput}
              textInput={textInput}
              hasImage={!!uploadedImage}
            />
          )}

        </div>
      </div>
      
      <Analytics />
    </>
  );
}
