'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

// ── Haiku triage prompt: fast initial scan + escalation decision ─────────────
const HAIKU_TRIAGE_PROMPT = `You are a fact-check triage analyst. Your job is to do a quick initial analysis of a social media claim and decide whether it needs deeper investigation by a more powerful model.

STEP 1 — Use web_search (1-2 searches max) to get basic context on the claim.
STEP 2 — Produce a triage JSON assessment.

ESCALATION RULES — set escalate=true if ANY of the following apply:
- Political, geopolitical, or election-related claims
- Health, medical, vaccine, or scientific claims
- Financial, investment, or economic claims
- Subtle manipulation or sophisticated disinformation (not just obvious fake news)
- Claims involving named public figures and serious allegations
- Ambiguous claims that could be interpreted multiple ways
- Conspiracy theories or coordinated narratives
- Your confidence is below 85%
- Anything that feels borderline, nuanced, or high-stakes
When in doubt — ESCALATE. It is always better to over-escalate than miss something.

CRITICAL OUTPUT RULES:
- Respond ONLY with valid JSON. No prose. No markdown fences.
- Keep all strings under 200 characters.
- No line breaks or special characters inside string values.

Required JSON (output this and nothing else):
{"escalate":true|false,"escalateReason":"One sentence reason if escalating, empty string if not","initialConfidence":0-100,"claimCategories":["category1","category2"],"quickSummary":"One sentence description of what this post claims"}`;

// ── Full analysis prompt used by both Haiku (simple) and Sonnet (escalated) ──
const ANALYSIS_PROMPT = `You are a world-class fact-checker and misinformation analyst with access to real-time web search. Analyze social media claims with rigorous, evidence-based reasoning.

PROCESS:
1. MULTI-ANGLE SEARCH STRATEGY (run 4-6 searches):
   a) General search: broad query about the core claim
   b) Fact-check database search: "site:snopes.com [claim]" OR "site:politifact.com [claim]" OR "site:factcheck.org [claim]" OR "site:reuters.com/fact-check [claim]"
   c) Primary source search: look for original documents, official statements, or direct evidence
   d) Counter-narrative search: search for rebuttals or opposing viewpoints
   e) Recent news search: "[claim] news [current month/year]" to find latest coverage
   f) If claim involves a named person/org: search their official website or verified social media

2. After searching, identify: (a) each individual factual claim, (b) the structural manipulation tactic if any, (c) conspiracy hashtags or loaded language used, (d) whether fact-check databases have already verified this claim.

3. Output your final verdict as JSON only.

CRITICAL OUTPUT RULES:
- Respond ONLY with a single valid JSON object. No prose before or after. No markdown fences.
- Keep ALL string values concise (under 220 characters each).
- Limit "claims" array to a maximum of 6 items — cover ALL significant claims.
- Limit "redFlags" array to a maximum of 6 items. Include: conspiracy hashtags used, named manipulation tactics (e.g. "real facts strung together to imply fabricated connection"), and loaded/emotional language.
- Never use line breaks or special characters inside string values.
- Do not use single quotes inside strings — use double quotes only.
- "citations" must be an array of objects with "title", "url", and optionally "cited_text" and "page_age" from your actual search results.
- When web search returns results, extract the "cited_text" field (the specific quote) and "page_age" field (when source was updated) if available.

Required JSON structure (output this and nothing else after searching):
{"verdict":"FACT|MOSTLY FACT|MISLEADING|MOSTLY FALSE|FALSE|UNVERIFIABLE","confidence":0-100,"summary":"One sentence verdict.","claims":[{"claim":"Specific claim","status":"TRUE|FALSE|MISLEADING|UNVERIFIABLE","explanation":"Evidence-based explanation under 200 chars."}],"context":"Key background a reader needs to know, under 220 chars.","redFlags":["Conspiracy hashtag: #example","Tactic: real facts used to imply fabricated connection","Loaded language: emotionally charged phrasing"],"citations":[{"title":"Source name or article title","url":"https://...","cited_text":"Direct quote from source if available","page_age":"Last updated date if available"}],"factCheckMatch":"Name of fact-check site (Snopes, PolitiFact, etc.) if a matching fact-check was found, empty string if not","bottomLine":"Plain English takeaway under 220 chars."}

Be direct and specific. Name exact tactics. Call out hashtags. Base everything on your actual search findings.`;

const DEMO_CLAIM = "Breaking: The CDC just admitted that 90% of vaccinated people have severe side effects. Mainstream media is hiding this!";

// ── Quick Check mode (Haiku-only, fast, less detailed) ────────────────────────
const QUICK_CHECK_PROMPT = `You are a fast fact-checker. Quickly assess this claim with 1-2 web searches.

PROCESS:
1. Run 1-2 targeted searches to verify the core claim
2. Output a quick verdict as JSON

CRITICAL OUTPUT RULES:
- Respond ONLY with valid JSON. No prose. No markdown.
- Keep all strings under 150 characters.

Required JSON (output this and nothing else):
{"verdict":"FACT|MOSTLY FACT|MISLEADING|MOSTLY FALSE|FALSE|UNVERIFIABLE","confidence":0-100,"summary":"One sentence verdict under 150 chars.","bottomLine":"Quick takeaway under 150 chars.","citations":[{"title":"Source","url":"https://..."}]}`;

const verdictConfig = {
  "FACT": { 
    color: "#00C851", 
    bg: "rgba(0, 200, 81, 0.12)", 
    border: "rgba(0, 200, 81, 0.4)",
    icon: "✓",
    label: "VERIFIED FACT"
  },
  "MOSTLY FACT": { 
    color: "#7BC67E", 
    bg: "rgba(123, 198, 126, 0.12)", 
    border: "rgba(123, 198, 126, 0.4)",
    icon: "◑",
    label: "MOSTLY ACCURATE"
  },
  "MISLEADING": { 
    color: "#FFB300", 
    bg: "rgba(255, 179, 0, 0.12)", 
    border: "rgba(255, 179, 0, 0.4)",
    icon: "⚠",
    label: "MISLEADING"
  },
  "MOSTLY FALSE": { 
    color: "#FF7043", 
    bg: "rgba(255, 112, 67, 0.12)", 
    border: "rgba(255, 112, 67, 0.4)",
    icon: "✕",
    label: "MOSTLY FALSE"
  },
  "FALSE": { 
    color: "#FF1744", 
    bg: "rgba(255, 23, 68, 0.12)", 
    border: "rgba(255, 23, 68, 0.4)",
    icon: "✕",
    label: "FALSE"
  },
  "UNVERIFIABLE": { 
    color: "#90A4AE", 
    bg: "rgba(144, 164, 174, 0.12)", 
    border: "rgba(144, 164, 174, 0.4)",
    icon: "?",
    label: "UNVERIFIABLE"
  }
};

const claimStatusConfig = {
  "TRUE": { color: "#00C851", symbol: "✓" },
  "FALSE": { color: "#FF1744", symbol: "✕" },
  "MISLEADING": { color: "#FFB300", symbol: "⚠" },
  "UNVERIFIABLE": { color: "#90A4AE", symbol: "?" }
};

function ConfidenceMeter({ value }) {
  const color = value >= 80 ? "#00C851" : value >= 60 ? "#FFB300" : "#FF1744";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999", marginBottom: 4, fontFamily: "var(--mono)" }}>
        <span>CONFIDENCE</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ 
          height: "100%", 
          width: `${value}%`, 
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 2,
          transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)"
        }} />
      </div>
    </div>
  );
}

function ClaimCard({ claim, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = claimStatusConfig[claim.status] || claimStatusConfig["UNVERIFIABLE"];

  return (
    <div
      className="claim-card"
      onClick={() => setExpanded(!expanded)}
      style={{
        borderLeft: `3px solid ${cfg.color}`,
        animationDelay: `${index * 0.06}s`,
        transition: "background 0.2s",
        marginBottom: 8
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ 
          color: cfg.color, 
          fontSize: 14, 
          fontWeight: 700, 
          fontFamily: "var(--mono)",
          flexShrink: 0,
          marginTop: 1
        }}>
          [{cfg.symbol}]
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14.5, color: "#E8E8E8", lineHeight: 1.5 }}>{claim.claim}</p>
          {expanded && (
            <p style={{ margin: "8px 0 0", fontSize: 16, color: "#B0B0B0", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
              {claim.explanation}
            </p>
          )}
        </div>
        <span style={{ color: "#E0E0E0", fontSize: 12, flexShrink: 0, marginTop: 2 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>
    </div>
  );
}

function generateReport(result, urlInput, textInput, hasImage) {
  const verdictLabels = {
    "FACT": "VERIFIED FACT", "MOSTLY FACT": "MOSTLY ACCURATE",
    "MISLEADING": "MISLEADING", "MOSTLY FALSE": "MOSTLY FALSE",
    "FALSE": "FALSE", "UNVERIFIABLE": "UNVERIFIABLE"
  };
  const verdictColors = {
    "FACT": "#00C851", "MOSTLY FACT": "#7BC67E", "MISLEADING": "#FFB300",
    "MOSTLY FALSE": "#FF7043", "FALSE": "#FF1744", "UNVERIFIABLE": "#90A4AE"
  };
  const claimColors = {
    "TRUE": "#00C851", "FALSE": "#FF1744", "MISLEADING": "#FFB300", "UNVERIFIABLE": "#90A4AE"
  };
  const vColor = verdictColors[result.verdict] || "#90A4AE";
  const vLabel = verdictLabels[result.verdict] || result.verdict;
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const claimsHtml = (result.claims || []).map((c, i) => {
    const cc = claimColors[c.status] || "#90A4AE";
    return `
      <div style="margin-bottom:10px;padding:12px 14px;border-left:4px solid ${cc};background:#f9f9f9;border-radius:0 6px 6px 0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="background:${cc};color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:1px;">${c.status}</span>
          <span style="font-size:11px;color:#999;">CLAIM ${i + 1}</span>
        </div>
        <p style="margin:0 0 5px;font-size:13px;font-weight:600;color:#222;">${c.claim || ""}</p>
        ${c.explanation ? `<p style="margin:0;font-size:12px;color:#666;line-height:1.5;">${c.explanation}</p>` : ""}
      </div>`;
  }).join("");

  const redFlagsHtml = (result.redFlags || []).map(f =>
    `<li style="margin-bottom:6px;font-size:12px;color:#c62828;line-height:1.5;">&#127988; ${f}</li>`
  ).join("");

  const citationsHtml = (result.citations || []).map((c, i) =>
    `<div style="margin-bottom:6px;padding:8px 10px;background:#f5f7f9;border-radius:5px;border:1px solid #e0e6ea;">
      <span style="font-size:10px;color:#78909c;font-family:monospace;margin-right:8px;">[${String(i+1).padStart(2,"0")}]</span>
      <a href="${c.url || "#"}" style="font-size:12px;color:#1565c0;text-decoration:none;">${c.title || c.url || "Source"}</a>
      ${c.url ? `<div style="font-size:10px;color:#90a4ae;margin-top:2px;margin-left:24px;word-break:break-all;">${c.url}</div>` : ""}
    </div>`
  ).join("");

  const modelInfo = result._modelInfo;
  const factCheckBadge = result.factCheckMatch ? `
    <span style="display:inline-flex;align-items:center;gap:4px;background:#e3f2fd;border:1px solid #90caf9;border-radius:12px;padding:2px 10px;font-size:10px;font-family:monospace;color:#1565c0;">
      ✓ VERIFIED BY ${result.factCheckMatch.toUpperCase()}
    </span>` : "";

  const modelBadgeHtml = modelInfo ? `
    <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span style="display:inline-flex;align-items:center;gap:4px;background:${modelInfo.escalated ? "#ffebee" : "#f5f5f5"};border:1px solid ${modelInfo.escalated ? "#ef9a9a" : "#e0e0e0"};border-radius:12px;padding:2px 10px;font-size:10px;font-family:monospace;color:${modelInfo.escalated ? "#c62828" : "#888"};">
        ${modelInfo.escalated ? "⬆ ESCALATED TO " + modelInfo.model.toUpperCase() : "◆ ANALYZED BY " + modelInfo.model.toUpperCase()}
      </span>
      ${modelInfo.escalated && modelInfo.escalateReason ? `<span style="font-size:10px;color:#999;font-style:italic;">${modelInfo.escalateReason}</span>` : ""}
      ${factCheckBadge}
    </div>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Signal vs Noise Fact Check Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f0f2f5; color: #222; }
  .page { max-width: 780px; margin: 0 auto; background: white; min-height: 100vh; }
  @media print {
    body { background: white; }
    .page { max-width: 100%; box-shadow: none; }
    .no-print { display: none !important; }
    a { color: #1565c0 !important; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div style="background:${vColor};padding:22px 28px 18px;color:white;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:22px;font-weight:900;letter-spacing:2px;">SIGNAL VS NOISE FACT CHECK</div>
      </div>
      <div style="text-align:right;font-size:11px;opacity:0.8;">${dateStr}</div>
    </div>
  </div>

  <div style="padding:24px 28px;">

    <!-- Verdict -->
    <div style="background:${vColor}18;border:1.5px solid ${vColor}55;border-radius:10px;padding:18px 20px;margin-bottom:18px;">
      <div style="font-size:10px;color:${vColor};font-weight:700;letter-spacing:2px;margin-bottom:4px;">VERDICT</div>
      <div style="font-size:26px;font-weight:900;color:${vColor};letter-spacing:1px;">${vLabel}</div>
      <div style="margin:10px 0 6px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#888;margin-bottom:4px;">
          <span>CONFIDENCE</span><span style="color:${vColor};font-weight:700;">${result.confidence}%</span>
        </div>
        <div style="height:5px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${result.confidence}%;background:${vColor};border-radius:3px;"></div>
        </div>
      </div>
      <p style="font-size:14px;color:#333;font-style:italic;margin-top:8px;">"${result.summary || ""}"</p>
      ${modelBadgeHtml}
    </div>

    <!-- Bottom Line -->
    <div style="background:#fafafa;border:1px solid #e8e8e8;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:10px;color:#888;font-weight:700;letter-spacing:2px;margin-bottom:6px;">BOTTOM LINE</div>
      <p style="font-size:13px;color:#444;line-height:1.6;">${result.bottomLine || ""}</p>
    </div>

    ${urlInput || textInput || hasImage ? `
    <!-- Input Provided -->
    <div style="background:#fafafa;border:1px solid #e8e8e8;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:10px;color:#888;font-weight:700;letter-spacing:2px;margin-bottom:6px;">INPUT PROVIDED</div>
      ${urlInput ? `<p style="font-size:11px;color:#999;margin:0 0 6px;"><strong>URL:</strong> ${urlInput}</p>` : ""}
      ${textInput ? `<p style="font-size:12px;color:#666;line-height:1.6;word-break:break-word;margin:0;">${textInput.substring(0, 500)}${textInput.length > 500 ? "..." : ""}</p>` : ""}
      ${hasImage ? `<p style="font-size:11px;color:#999;margin:${textInput ? "6px" : "0"} 0 0;"><em>🖼 Image uploaded and analyzed</em></p>` : ""}
    </div>` : ""}

    ${claimsHtml ? `
    <!-- Claims -->
    <div style="margin-bottom:16px;">
      <div style="font-size:10px;color:#888;font-weight:700;letter-spacing:2px;margin-bottom:10px;">CLAIMS ANALYZED</div>
      ${claimsHtml}
    </div>` : ""}

    ${result.context ? `
    <!-- Context -->
    <div style="background:#e3f2fd;border:1px solid #90caf9;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:10px;color:#1565c0;font-weight:700;letter-spacing:2px;margin-bottom:6px;">CONTEXT</div>
      <p style="font-size:13px;color:#1a237e;line-height:1.6;">${result.context}</p>
    </div>` : ""}

    ${redFlagsHtml ? `
    <!-- Red Flags -->
    <div style="background:#ffebee;border:1px solid #ef9a9a;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <div style="font-size:10px;color:#c62828;font-weight:700;letter-spacing:2px;margin-bottom:8px;">RED FLAGS & MANIPULATION TACTICS</div>
      <ul style="padding-left:16px;">${redFlagsHtml}</ul>
    </div>` : ""}

    ${citationsHtml ? `
    <!-- Citations -->
    <div style="margin-bottom:16px;">
      <div style="font-size:10px;color:#607d8b;font-weight:700;letter-spacing:2px;margin-bottom:8px;">SOURCES & CITATIONS</div>
      ${citationsHtml}
    </div>` : ""}

    <!-- Print tip -->
    <div class="no-print" style="margin-top:20px;padding:12px 14px;background:#e8f5e9;border-radius:6px;font-size:11px;color:#2e7d32;text-align:center;">
      💡 To save as PDF: use your browser's <strong>File → Print → Save as PDF</strong>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#f5f5f5;border-top:1px solid #e0e0e0;padding:12px 28px;text-align:center;">
    <span style="font-size:10px;color:#aaa;letter-spacing:1px;">GENERATED BY SIGNAL VS NOISE FACT CHECK · ${dateStr}</span>
  </div>
</div>
</body>
</html>`;

  // Trigger download
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signal-noise-check-${new Date().toISOString().split("T")[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


function ResultPanel({ result, urlInput, textInput, hasImage }) {
  const cfg = verdictConfig[result.verdict] || verdictConfig["UNVERIFIABLE"];
  const [showRedFlags, setShowRedFlags] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    setTimeout(() => {
      try { generateReport(result, urlInput, textInput, hasImage); }
      catch(e) { console.error("Export failed:", e); }
      finally { setExporting(false); }
    }, 80);
  }, [result, urlInput, textInput, hasImage]);

  return (
    <div style={{ animation: "fadeSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
      {/* Verdict Hero */}
      <div style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", top: -20, right: -20, fontSize: 120,
          color: cfg.color, opacity: 0.04, fontWeight: 900, lineHeight: 1,
          fontFamily: "var(--mono)", pointerEvents: "none"
        }}>
          {cfg.icon}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: cfg.color, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 24, color: "#000", fontWeight: 900,
            boxShadow: `0 0 20px ${cfg.color}55, 0 0 40px ${cfg.color}22`,
            animation: "pulse 3s ease-in-out infinite"
          }}>
            {cfg.icon}
          </div>
          <div>
            <div style={{ fontSize: 10, color: cfg.color, fontFamily: "var(--mono)", letterSpacing: 3 }}>
              VERDICT
            </div>
            <div style={{ 
              fontSize: 28, fontWeight: 800, color: cfg.color, letterSpacing: 1.5, 
              fontFamily: "var(--display)",
              position: "relative"
            }}>
              {cfg.label}
              <div style={{
                position: "absolute", bottom: -4, left: 0, right: 0,
                height: 2, background: cfg.color, opacity: 0.4,
                animation: "revealBar 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
                transformOrigin: "left"
              }} />
            </div>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 16, color: "#EBEBEB", lineHeight: 1.55, fontStyle: "italic" }}>
          "{result.summary}"
        </p>
        <ConfidenceMeter value={result.confidence} />

        {/* Model badge */}
        {result._modelInfo && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: result._modelInfo.escalated ? "rgba(229,57,53,0.12)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${result._modelInfo.escalated ? "rgba(229,57,53,0.3)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 20, padding: "3px 10px",
              fontSize: 10, fontFamily: "var(--mono)", letterSpacing: 1,
              color: result._modelInfo.escalated ? "#EF5350" : "#888"
            }}>
              <span style={{ fontSize: 8 }}>{result._modelInfo.escalated ? "⬆" : "◆"}</span>
              {result._modelInfo.escalated ? `ESCALATED TO ${result._modelInfo.model.toUpperCase()}` : `ANALYZED BY ${result._modelInfo.model.toUpperCase()}`}
            </span>
            {result._modelInfo.escalated && result._modelInfo.escalateReason && (
              <span style={{
                fontSize: 10, fontFamily: "var(--mono)",
                color: "#666", fontStyle: "italic"
              }}>
                {result._modelInfo.escalateReason}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Line */}
      <div className="result-card" style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.09)",
        animationDelay: "0.1s"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div className="section-label" style={{ color: "#666", marginBottom: 0, flex: 1 }}>
            THE BOTTOM LINE
          </div>
          {result.factCheckMatch && (
            <span style={{
              fontSize: 10, fontFamily: "var(--mono)",
              background: "rgba(100,181,246,0.12)",
              border: "1px solid rgba(100,181,246,0.25)",
              borderRadius: 20, padding: "3px 10px",
              color: "#64B5F6", letterSpacing: 1, flexShrink: 0, marginLeft: 10
            }}>
              ✓ {result.factCheckMatch.toUpperCase()}
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 15, color: "#DCDCDC", lineHeight: 1.8, fontWeight: 400 }}>
          {result.bottomLine}
        </p>
      </div>

      {/* Claims Breakdown */}
      {result.claims && result.claims.length > 0 && (
        <div style={{ marginBottom: 14, animation: "fadeUp 0.4s 0.2s ease both" }}>
          <div className="section-label" style={{ color: "#666" }}>
            CLAIMS ANALYZED <span style={{ opacity: 0.5 }}>({result.claims.length})</span>
          </div>
          {result.claims.map((c, i) => <ClaimCard key={i} claim={c} index={i} />)}
        </div>
      )}

      {/* Context */}
      {result.context && (
        <div className="result-card" style={{
          background: "linear-gradient(145deg, rgba(100,181,246,0.07), rgba(100,181,246,0.03))",
          border: "1px solid rgba(100,181,246,0.15)",
          borderLeft: "3px solid rgba(100,181,246,0.5)",
          animationDelay: "0.25s"
        }}>
          <div className="section-label" style={{ color: "#64B5F6" }}>
            BACKGROUND CONTEXT
          </div>
          <p style={{ margin: 0, fontSize: 14.5, color: "#A8C8E0", lineHeight: 1.8, fontWeight: 400 }}>{result.context}</p>
        </div>
      )}

      {/* Red Flags */}
      {result.redFlags && result.redFlags.length > 0 && (
        <div className="result-card" style={{
          background: "linear-gradient(145deg, rgba(255,23,68,0.08), rgba(255,23,68,0.03))",
          border: "1px solid rgba(255,23,68,0.15)",
          borderLeft: "3px solid rgba(255,23,68,0.5)",
          animationDelay: "0.3s",
          cursor: "pointer"
        }}
          onClick={() => setShowRedFlags(!showRedFlags)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="section-label" style={{ color: "#EF5350", marginBottom: 0, flex: 1 }}>
              🚩 RED FLAGS DETECTED ({result.redFlags.length})
            </div>
            <span style={{ 
              color: "#EF5350", fontSize: 10, fontFamily: "var(--mono)",
              background: "rgba(255,23,68,0.1)", borderRadius: 4,
              padding: "3px 8px", marginLeft: 10, flexShrink: 0
            }}>
              {showRedFlags ? "HIDE ▲" : "SHOW ▼"}
            </span>
          </div>
          {showRedFlags && (
            <ul style={{ margin: "12px 0 0", padding: "0 0 0 0", listStyle: "none" }}>
              {result.redFlags.map((flag, i) => (
                <li key={i} style={{
                  fontSize: 14, color: "#FFAAAA", lineHeight: 1.65,
                  marginBottom: 8, paddingLeft: 16, position: "relative", fontWeight: 300
                }}>
                  <span style={{ position: "absolute", left: 0, color: "#FF1744", fontSize: 10 }}>▸</span>
                  {flag}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Citations */}
      {result.citations && result.citations.length > 0 && (
        <div className="result-card" style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          animationDelay: "0.35s"
        }}>
          <div className="section-label" style={{ color: "#546E7A" }}>
            SOURCES & CITATIONS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {result.citations.map((cite, i) => (
              <a
                key={i}
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", flexDirection: "column", gap: 6,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8,
                  textDecoration: "none",
                  transition: "all 0.15s"
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.transform = "translateX(3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateX(0)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, color: "#37474F", fontFamily: "var(--mono)", flexShrink: 0, background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 3 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 16, color: "#90A8B8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 400 }}>
                    {cite.title || cite.url}
                  </span>
                  <span style={{ fontSize: 12, color: "#455A64", flexShrink: 0 }}>↗</span>
                </div>
                {cite.cited_text && (
                  <div style={{ 
                    fontSize: 11, 
                    color: "#607D8B", 
                    lineHeight: 1.5, 
                    fontStyle: "italic",
                    paddingLeft: 30,
                    borderLeft: "2px solid rgba(255,255,255,0.06)",
                    marginLeft: 5
                  }}>
                    "{cite.cited_text.substring(0, 150)}{cite.cited_text.length > 150 ? "..." : ""}"
                  </div>
                )}
                {cite.page_age && (
                  <div style={{ 
                    fontSize: 10, 
                    color: "#455A64", 
                    fontFamily: "var(--mono)",
                    paddingLeft: 30
                  }}>
                    Updated: {cite.page_age}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%", marginTop: 16,
          padding: "14px 20px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          color: exporting ? "#444" : "#607D8B",
          cursor: exporting ? "not-allowed" : "pointer",
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 2.5,
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { if (!exporting) { 
          e.currentTarget.style.background = "rgba(255,255,255,0.07)"; 
          e.currentTarget.style.color = "#90A4AE"; 
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}}
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

      {/* Share Results - Native share on mobile, clipboard on desktop */}
      <button
        onClick={async () => {
          const shareText = `🎯 Fact-Check Results: ${result.verdict}

📊 Bottom Line: ${result.bottomLine}

${result.claims?.length > 0 ? `🔍 Key Claims:
${result.claims.slice(0, 3).map((c, i) => `${i+1}. ${c.status}: ${c.claim}`).join('\n')}` : ''}

Fact-checked with Signal vs Noise AI
`;

          // Try native share first (mobile), fallback to clipboard (desktop)
          if (navigator.share) {
            try {
              await navigator.share({
                title: `Fact-Check: ${result.verdict}`,
                text: shareText,
                url: window.location.href
              });
            } catch (err) {
              if (err.name !== 'AbortError') console.log('Share failed:', err);
            }
          } else {
            // Desktop fallback: copy formatted text to clipboard
            try {
              await navigator.clipboard.writeText(shareText);
              // Show success feedback
              const btn = event.currentTarget;
              const originalText = btn.innerHTML;
              btn.innerHTML = '<span style="font-size:11px">✓</span> COPIED TO CLIPBOARD';
              btn.style.color = '#00C851';
              setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.color = '#546E7A';
              }, 2000);
            } catch (err) {
              alert('Could not copy to clipboard. Please try again.');
            }
          }
        }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", marginTop: 10,
          padding: "11px 20px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          color: "#546E7A",
          cursor: "pointer",
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 2,
          transition: "all 0.15s"
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          e.currentTarget.style.color = "#78909C";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "#546E7A";
        }}
      >
        <span style={{ fontSize: 11 }}>↗</span>
        SHARE RESULTS
      </button>

      {/* Tweet This Button */}
      <button
        onClick={() => {
          // Get the claim text
          const claimText = textInput || urlInput || "Claim analyzed";
          const claimPreview = claimText.length > 100 ? claimText.substring(0, 100) + "..." : claimText;
          
          // Generate comprehensive tweet (under 280 chars with room for link)
          const tweetText = `CLAIM: "${claimPreview}"

VERDICT: ${result.verdict}
${result.bottomLine.substring(0, 100)}

Full analysis with sources:
👉 Export the HTML report for complete breakdown

#FactCheck #SignalVsNoise`;
          
          // Open Twitter intent
          const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
          window.open(tweetUrl, '_blank', 'width=550,height=420');
        }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", marginTop: 8,
          padding: "11px 20px",
          background: "transparent",
          border: "1px solid rgba(29,161,242,0.15)",
          borderRadius: 8,
          color: "rgba(29,161,242,0.7)",
          cursor: "pointer",
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 2,
          transition: "all 0.15s"
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(29,161,242,0.08)";
          e.currentTarget.style.borderColor = "rgba(29,161,242,0.3)";
          e.currentTarget.style.color = "#1DA1F2";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "rgba(29,161,242,0.15)";
          e.currentTarget.style.color = "rgba(29,161,242,0.7)";
        }}
      >
        <span style={{ fontSize: 11 }}>𝕏</span>
        TWEET THIS
      </button>
    </div>
  );
}

export default function FactChecker() {
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("ANALYZING...");
  const [loadingSubtext, setLoadingSubtext] = useState("");
  const [result, setResult] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [quickCheckMode, setQuickCheckMode] = useState(false);
  const [history, setHistory] = useState([]);
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
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  // ── Shared agentic fetch loop ─────────────────────────────────────────────
  const runAgenticLoop = async (systemPrompt, userMessage, model, controller, statusPrefix) => {
    // userMessage can be a string OR an array of content blocks (for images)
    const messages = [{ role: "user", content: userMessage }];
    const tools = [{ 
      type: "web_search_20250305", 
      name: "web_search",
      max_uses: 5
    }];
    let finalText = "";
    const MAX_TURNS = 5;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const timeoutId = setTimeout(() => controller.abort(), 40000);
      let response;
      try {
        response = await fetch("/api/fact-check", {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "x-fingerprint-id": visitorId || "anonymous"
  },
          signal: controller.signal,
          body: JSON.stringify({ model, max_tokens: 2048, system: systemPrompt, tools, messages })
        });
      } finally {
        clearTimeout(timeoutId);
      }
      if (controller.signal.aborted) throw new Error("Request cancelled.");
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const textBlocks = data.content.filter(b => b.type === "text");
      const toolUseBlocks = data.content.filter(b => b.type === "tool_use");
      if (data.stop_reason === "tool_use" && toolUseBlocks.length > 0) {
        setLoadingStatus(`${statusPrefix} (${turn + 1}/${MAX_TURNS})`);
        const substexts = [
          "Checking Snopes, PolitiFact, and FactCheck.org",
          "Finding primary sources and official statements",
          "Cross-referencing Reuters and AP fact-checks",
          "Searching for counter-narratives and rebuttals",
          "Verifying with recent news coverage"
        ];
        setLoadingSubtext(substexts[turn] || "Gathering additional sources");
        messages.push({ role: "assistant", content: data.content });
        messages.push({ role: "user", content: toolUseBlocks.map(tb => ({ type: "tool_result", tool_use_id: tb.id, content: [] })) });
      } else {
        finalText = textBlocks.map(b => b.text || "").join("");
        break;
      }
    }
    return finalText;
  };

  // ── JSON parse helper ─────────────────────────────────────────────────────
  const parseJSON = (text) => {
    let clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const first = clean.indexOf("{"), last = clean.lastIndexOf("}");
    if (first !== -1 && last !== -1) clean = clean.slice(first, last + 1);
    clean = clean.replace(/,\s*([}\]])/g, "$1").replace(/[ -]/g, " ");
    return JSON.parse(clean);
  };

  const isUrl = (str) => {
    return str.includes("instagram.com") || str.includes("twitter.com") || 
           str.includes("x.com") || str.includes("facebook.com") || 
           str.includes("tiktok.com") || str.includes("threads.net");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, etc.)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target.result.split(",")[1];
      setUploadedImage({ data: base64, type: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setUploadedImage(null);
  };

  const handleCheck = async () => {
    // At least one input required
    if (!urlInput.trim() && !textInput.trim() && !uploadedImage) return;
    
    setLoading(true);
    setLoadingStatus("ANALYZING...");
    setError(null);
    setResult(null);
    setModelInfo(null);

    try {
      // ── Build comprehensive user message from all available inputs ─────────
      let userMessage;
      let messageContent = [];
      let contextParts = [];

      // 1. Process URL if provided
      if (urlInput.trim() && isUrl(urlInput.trim())) {
        const domain = urlInput.includes("instagram.com") ? "Instagram" :
                      urlInput.includes("twitter.com") || urlInput.includes("x.com") ? "Twitter/X" :
                      urlInput.includes("facebook.com") ? "Facebook" :
                      urlInput.includes("tiktok.com") ? "TikTok" : "social media";
        contextParts.push(`URL: ${urlInput.trim()} (${domain} post)`);
      }

      // 2. Add text claim if provided
      if (textInput.trim()) {
        contextParts.push(`Text claim: "${textInput.trim()}"`);
      }

      // 3. Build final message based on what we have
      if (uploadedImage) {
        // Image + optional text + optional URL
        messageContent.push({ type: "image", source: { type: "base64", media_type: uploadedImage.type, data: uploadedImage.data } });
        
        let imagePrompt = "Analyze this image for misinformation, fake data, manipulated content, or misleading visual claims.";
        if (contextParts.length > 0) {
          imagePrompt += "\n\nAdditional context provided by user:\n" + contextParts.join("\n");
        }
        messageContent.push({ type: "text", text: imagePrompt });
        userMessage = messageContent;
      } else {
        // Text and/or URL only (no image)
        let prompt = "Please fact-check the following:\n\n";
        if (contextParts.length > 0) {
          prompt += contextParts.join("\n\n");
        }
        userMessage = prompt;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      // ── STEP 1: Haiku triage ───────────────────────────────────────────────
      // Quick Check mode: skip triage, go straight to fast analysis
      if (quickCheckMode) {
        setLoadingStatus("QUICK CHECK...");
        setLoadingSubtext("Running fast fact-check");
        
        const quickMessage = uploadedImage
          ? messageContent
          : userMessage;
        
        const quickResult = await runAgenticLoop(
          QUICK_CHECK_PROMPT,
          quickMessage,
          "claude-haiku-4-5-20251001",
          controller,
          "CHECKING"
        );
        
        const parsed = parseJSON(quickResult);
        parsed._modelInfo = { model: "haiku", escalated: false };
        setModelInfo(parsed._modelInfo);
        setResult(parsed);
        setHistory(prev => [{ 
          urlInput: urlInput.trim(), 
          textInput: textInput.trim(), 
          hasImage: !!uploadedImage,
          result: parsed, 
          time: new Date() 
        }, ...prev.slice(0, 4)]);
        
        if (isFirstVisit) {
          setIsFirstVisit(false);
          setTimeout(() => {
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 3000);
          }, 400);
        }
        return;
      }

      setLoadingStatus("HAIKU SCANNING...");
      setLoadingSubtext("Reading claim and gathering context");
      const triageMessage = uploadedImage 
        ? `Quick triage scan — the user uploaded an image${input.trim() ? " with context: " + input.trim() : ""}. Determine if this needs escalation.`
        : `Quick triage scan of this claim: ${typeof userMessage === 'string' ? userMessage : 'see content'}`;

      const triageText = await runAgenticLoop(
        HAIKU_TRIAGE_PROMPT,
        triageMessage,
        "claude-haiku-4-5-20251001",
        controller,
        "HAIKU SCANNING"
      );
      if (!triageText) throw new Error("Triage scan failed. Please try again.");

      let triage;
      try { triage = parseJSON(triageText); }
      catch(e) { triage = { escalate: true, escalateReason: "Could not parse triage — defaulting to Sonnet", initialConfidence: 0 }; }

      const shouldEscalate = triage.escalate === true || (triage.initialConfidence ?? 100) < 85;
      const finalModel = shouldEscalate ? "claude-sonnet-4-5-20250929" : "claude-haiku-4-5-20251001";
      const finalModelLabel = shouldEscalate ? "Sonnet" : "Haiku";

      // ── STEP 2: Full analysis with chosen model ────────────────────────────
      if (shouldEscalate) {
        setLoadingStatus("ESCALATING TO SONNET...");
        setLoadingSubtext("Complex claim detected — using deeper analysis model");
      } else {
        setLoadingStatus("HAIKU ANALYZING...");
        setLoadingSubtext("Running fact-check analysis");
      }

      const analysisText = await runAgenticLoop(
        ANALYSIS_PROMPT,
        uploadedImage && messageContent ? messageContent : userMessage,
        finalModel,
        controller,
        shouldEscalate ? "SONNET SEARCHING" : "HAIKU SEARCHING"
      );

      abortRef.current = null;
      if (!analysisText) throw new Error("No response received. Please try again.");

      let parsed;
      try { parsed = parseJSON(analysisText); }
      catch(e) { throw new Error(`Response parsing failed: ${e.message}. Please try again.`); }

      // Attach model metadata to result
      parsed._modelInfo = {
        model: finalModelLabel,
        escalated: shouldEscalate,
        escalateReason: shouldEscalate ? (triage.escalateReason || "Escalation threshold met") : null,
        categories: triage.claimCategories || []
      };

      setModelInfo(parsed._modelInfo);
      setResult(parsed);
      setHistory(prev => [{ 
        urlInput: urlInput.trim(), 
        textInput: textInput.trim(), 
        hasImage: !!uploadedImage,
        result: parsed, 
        time: new Date() 
      }, ...prev.slice(0, 4)]);

      // First check celebration
      if (isFirstVisit) {
        setIsFirstVisit(false);
        setTimeout(() => {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }, 400);
      }

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setLoadingStatus("ANALYZING...");
    setError("Analysis cancelled. Paste your claim and try again.");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleCheck();
    }
  };

  const loadHistory = (item) => {
    setUrlInput(item.urlInput || "");
    setTextInput(item.textInput || "");
    setResult(item.result);
    setError(null);
    // Note: can't restore uploaded image from history
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;700&display=swap');

        :root {
          --red: #E53935;
          --red-bright: #FF1744;
          --red-dim: rgba(229,57,53,0.15);
          --surface: rgba(255,255,255,0.03);
          --surface-hover: rgba(255,255,255,0.06);
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.16);
          --text: #E8E8E8;
          --text-muted: #666;
          --text-dim: #444;
          --mono: 'JetBrains Mono', monospace;
          --display: 'Bebas Neue', cursive;
          --body: 'DM Sans', sans-serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080810;
          font-family: var(--body);
          color: var(--text);
          -webkit-font-smoothing: antialiased;
        }

        /* ── Animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes confetti {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebrationBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(229,57,53,0.1); }
          50%       { box-shadow: 0 0 40px rgba(229,57,53,0.25); }
        }
        @keyframes revealBar {
          from { width: 0; }
        }
        @keyframes staggerIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* ── Field Labels ── */
        .field-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 2.5px;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .field-label-icon {
          width: 18px; height: 18px;
          border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px;
        }

        /* ── Input fields ── */
        .input-area {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          font-family: var(--body);
          font-size: 15px;
          line-height: 1.65;
          outline: none;
          padding: 13px 16px;
          resize: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          width: 100%;
        }
        .input-area:focus {
          border-color: rgba(229,57,53,0.45);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 0 3px rgba(229,57,53,0.06);
        }
        .input-area::placeholder { color: #4a4a5a; }

        /* ── Main CTA button ── */
        .check-btn {
          background: linear-gradient(135deg, #C62828 0%, #E53935 50%, #FF1744 100%);
          border: none;
          border-radius: 10px;
          color: white;
          cursor: pointer;
          font-family: var(--mono);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 3px;
          padding: 16px 28px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
          margin-top: 14px;
          position: relative;
          overflow: hidden;
          animation: glow 3s ease-in-out infinite;
        }
        .check-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          background-size: 200% 100%;
          animation: shimmer 2.5s linear infinite;
        }
        .check-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(229,57,53,0.45), 0 0 0 1px rgba(229,57,53,0.3);
          animation: none;
        }
        .check-btn:active:not(:disabled) { transform: translateY(0); }
        .check-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          animation: none;
        }
        .check-btn:disabled::before { display: none; }

        /* ── Result cards ── */
        .result-card {
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 14px;
          position: relative;
          overflow: hidden;
          animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .result-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
          pointer-events: none;
        }

        /* ── Section labels ── */
        .section-label {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: currentColor;
          opacity: 0.15;
        }

        /* ── Claim cards ── */
        .claim-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 13px 15px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          margin-bottom: 8px;
          animation: staggerIn 0.3s ease both;
        }
        .claim-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }

        /* ── History items ── */
        .history-item {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          padding: 11px 15px;
          transition: all 0.2s;
          margin-bottom: 7px;
        }
        .history-item:hover {
          background: var(--surface-hover);
          border-color: var(--border-hover);
          transform: translateX(3px);
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
      `}</style>
      
      <div style={{
        minHeight: "100vh",
        background: "#080810",
        color: "var(--text)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Layered atmospheric background */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          {/* Deep grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(229,57,53,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(229,57,53,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />
          {/* Red radial glow top-center */}
          <div style={{
            position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)",
            width: 800, height: 600,
            background: "radial-gradient(ellipse, rgba(229,57,53,0.07) 0%, transparent 70%)",
          }} />
          {/* Subtle bottom glow */}
          <div style={{
            position: "absolute", bottom: -100, right: "20%",
            width: 400, height: 400,
            background: "radial-gradient(ellipse, rgba(229,57,53,0.04) 0%, transparent 70%)",
          }} />
          {/* Noise texture overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            opacity: 0.4
          }} />
        </div>
        
        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px" }}>
          
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 44, animation: "fadeUp 0.6s ease both" }}>
            {/* Live badge */}
            <div style={{ 
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(229,57,53,0.08)", 
              border: "1px solid rgba(229,57,53,0.2)",
              borderRadius: 20, padding: "5px 16px", marginBottom: 20
            }}>
              <div style={{ 
                width: 7, height: 7, borderRadius: "50%", 
                background: "#E53935", 
                animation: "pulse 2s infinite",
                boxShadow: "0 0 6px rgba(229,57,53,0.8)"
              }} />
              <span style={{ fontSize: 10, color: "#EF5350", fontFamily: "var(--mono)", letterSpacing: 3, fontWeight: 700 }}>
                HYBRID AI · LIVE WEB SEARCH
              </span>
            </div>

            {/* Logo */}
            <h1 style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(56px, 12vw, 96px)",
              letterSpacing: 6,
              margin: "0 0 4px",
              lineHeight: 0.95,
              background: "linear-gradient(160deg, #FFFFFF 0%, #FFFFFF 40%, #EF5350 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 40px rgba(229,57,53,0.15))"
            }}>
              SIGNAL
            </h1>
            <div style={{ 
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12, 
              marginBottom: 6 
            }}>
              <div style={{ height: 1, width: 40, background: "linear-gradient(90deg, transparent, rgba(229,57,53,0.5))" }} />
              <span style={{ 
                fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 5, 
                color: "rgba(229,57,53,0.7)" 
              }}>VS</span>
              <div style={{ height: 1, width: 40, background: "linear-gradient(90deg, rgba(229,57,53,0.5), transparent)" }} />
            </div>
            <h1 style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(56px, 12vw, 96px)",
              letterSpacing: 6,
              margin: "0 0 16px",
              lineHeight: 0.95,
              background: "linear-gradient(160deg, #EF5350 0%, #FF1744 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(229,57,53,0.25))"
            }}>
              NOISE
            </h1>
            <p style={{ 
              color: "#B0B0B0", fontSize: 14, margin: 0, 
              fontFamily: "var(--body)", letterSpacing: 0.5,
              fontWeight: 300
            }}>
              Paste a URL, a claim, or upload a screenshot — get the truth.
            </p>
          </div>

          {/* Input Card */}
          <div style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 18,
            padding: "24px 24px 20px",
            marginBottom: 24,
            backdropFilter: "blur(20px)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            animation: "fadeUp 0.6s 0.1s ease both"
          }}>
            {/* Card header */}
            <div style={{ 
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 20, paddingBottom: 14,
              borderBottom: "1px solid rgba(255,255,255,0.06)"
            }}>
              <span style={{ fontSize: 10, color: "#E0E0E0", fontFamily: "var(--mono)", letterSpacing: 3 }}>
                FACT-CHECK INPUT
              </span>
              <span style={{ fontSize: 10, color: "rgba(229,57,53,0.8)", fontFamily: "var(--mono)", letterSpacing: 2 }}>
                MORE CONTEXT = BETTER RESULTS
              </span>
            </div>

            {/* URL field */}
            <div style={{ marginBottom: 14 }}>
              <div className="field-label">
                <span className="field-label-icon" style={{ background: "rgba(100,181,246,0.12)", color: "#64B5F6" }}>↗</span>
                SOCIAL MEDIA URL
                <span style={{ color: "#4a4a5a", marginLeft: "auto", fontSize: 8 }}>OPTIONAL</span>
              </div>
              <input
                className="input-area"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="instagram.com/p/... · twitter.com/... · facebook.com/..."
                style={{ height: 44 }}
              />
            </div>

            {/* Text field */}
            <div style={{ marginBottom: 14 }}>
              <div className="field-label">
                <span className="field-label-icon" style={{ background: "rgba(255,179,0,0.12)", color: "#FFB300" }}>⌨</span>
                CLAIM OR CAPTION TEXT
                <span style={{ color: "#4a4a5a", marginLeft: "auto", fontSize: 8 }}>OPTIONAL</span>
              </div>
              <textarea
                ref={textareaRef}
                className="input-area"
                rows={4}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste the post caption, viral claim, or any text you want fact-checked..."
              />
            </div>

            {/* Image upload area */}
            <div style={{ marginBottom: 4 }}>
              <div className="field-label">
                <span className="field-label-icon" style={{ background: "rgba(0,200,81,0.12)", color: "#00C851" }}>🖼</span>
                SCREENSHOT OR IMAGE
                <span style={{ color: "#4a4a5a", marginLeft: "auto", fontSize: 8 }}>OPTIONAL</span>
              </div>
              {uploadedImage ? (
                <div style={{
                  padding: "12px 14px",
                  background: "rgba(0,200,81,0.05)",
                  border: "1px solid rgba(0,200,81,0.2)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  animation: "fadeIn 0.3s ease"
                }}>
                  <img
                    src={`data:${uploadedImage.type};base64,${uploadedImage.data}`}
                    alt="Upload preview"
                    style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "2px solid rgba(0,200,81,0.25)", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#E0E0E0", fontWeight: 600, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {uploadedImage.name}
                    </div>
                    <div style={{ fontSize: 10, color: "#00C851", fontFamily: "var(--mono)", letterSpacing: 1 }}>
                      ✓ READY FOR ANALYSIS
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>
                      Claude will analyze visual content, charts, text in image
                    </div>
                  </div>
                  <button
                    onClick={clearImage}
                    style={{
                      background: "rgba(255,23,68,0.1)",
                      border: "1px solid rgba(255,23,68,0.2)",
                      borderRadius: 7,
                      color: "#EF5350",
                      cursor: "pointer",
                      fontSize: 10,
                      padding: "7px 12px",
                      fontFamily: "var(--mono)",
                      letterSpacing: 1,
                      flexShrink: 0,
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,23,68,0.2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,23,68,0.1)"}
                  >
                    ✕ REMOVE
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => document.getElementById("imageUploadInput")?.click()}
                  style={{
                    width: "100%",
                    padding: "18px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1.5px dashed rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color: "#3a3a4a",
                    cursor: "pointer",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: 2,
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                    e.currentTarget.style.color = "#888";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "#3a3a4a";
                  }}
                >
                  <span style={{ fontSize: 22, opacity: 0.4 }}>⊕</span>
                  DRAG & DROP OR CLICK TO UPLOAD
                  <span style={{ fontSize: 8, letterSpacing: 1, opacity: 0.5 }}>PNG · JPG · WEBP · SCREENSHOTS</span>
                </button>
              )}
            </div>
            <input 
              id="imageUploadInput" 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              style={{ display: "none" }} 
            />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: "#666", fontFamily: "var(--mono)" }}>
                  ⌘ + ENTER to check
                </span>
                <button
                  onClick={() => setQuickCheckMode(!quickCheckMode)}
                  title={quickCheckMode ? "Quick Check: Fast mode (5 sec, less detailed)" : "Click for Quick Check mode (faster but less thorough)"}
                  style={{
                    background: quickCheckMode ? "rgba(100,181,246,0.12)" : "transparent",
                    border: quickCheckMode ? "1px solid rgba(100,181,246,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    color: quickCheckMode ? "#64B5F6" : "#666",
                    cursor: "pointer",
                    fontSize: 10,
                    padding: "4px 8px",
                    fontFamily: "var(--mono)",
                    letterSpacing: 1,
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => { if (!quickCheckMode) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                  onMouseLeave={e => { if (!quickCheckMode) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                >
                  ⚡ QUICK
                </button>
                {quickCheckMode && (
                  <span style={{ fontSize: 10, color: "#64B5F6", fontFamily: "var(--mono)" }}>
                    Fast mode: ~5 sec
                  </span>
                )}
              </div>
              {(urlInput || textInput || uploadedImage) && (
                <button 
                  onClick={() => { setUrlInput(""); setTextInput(""); clearImage(); setResult(null); setError(null); }}
                  style={{ background: "none", border: "none", color: "#B0B0B0", cursor: "pointer", fontSize: 12, fontFamily: "var(--mono)" }}
                >
                  CLEAR ALL ✕
                </button>
              )}
            </div>
            
            {loading ? (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className="check-btn"
                  disabled
                  style={{ flex: 1, marginTop: 0, opacity: 0.7, cursor: "not-allowed" }}
                >
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                      {loadingStatus}
                    </span>
                    {loadingSubtext && (
                      <span style={{ fontSize: 10, color: "#666", letterSpacing: 0.5, fontFamily: "var(--body)", fontWeight: 300 }}>
                        {loadingSubtext}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    background: "rgba(255,23,68,0.12)",
                    border: "1px solid rgba(255,23,68,0.3)",
                    borderRadius: 8,
                    color: "#EF5350",
                    cursor: "pointer",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: 1,
                    padding: "14px 18px",
                    transition: "all 0.2s",
                    flexShrink: 0
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,23,68,0.22)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,23,68,0.12)"; }}
                >
                  ✕ CANCEL
                </button>
              </div>
            ) : (
              <button
                className="check-btn"
                onClick={result && !loading ? () => { 
                  setUrlInput(""); 
                  setTextInput(""); 
                  clearImage(); 
                  setResult(null); 
                  setError(null); 
                  setTimeout(() => textareaRef.current?.focus(), 50); 
                } : () => {
                  if (isFirstVisit && !textInput && !urlInput && !uploadedImage) {
                    setTextInput(DEMO_CLAIM);
                    setTimeout(() => handleCheck(), 100);
                  } else {
                    handleCheck();
                  }
                }}
                disabled={!result && !urlInput.trim() && !textInput.trim() && !uploadedImage && !isFirstVisit}
                style={{
                  animation: isFirstVisit && !textInput && !urlInput && !uploadedImage && !result 
                    ? "glow 2s ease-in-out infinite, pulse 2s ease-in-out infinite" 
                    : undefined
                }}
              >
                {result ? "↺ CHECK NEXT CLAIM" : (isFirstVisit && !textInput && !urlInput && !uploadedImage ? "⚡ TRY DEMO EXAMPLE" : "ANALYZE FOR TRUTH ▶")}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(255,23,68,0.08)",
              border: "1px solid rgba(255,23,68,0.25)",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 24,
              fontSize: 16,
              color: "#EF9A9A"
            }}>
           <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
  <span style={{ fontSize: 20 }}>⚠</span>
  <div style={{ flex: 1 }}>
    <div style={{ marginBottom: 8 }}>{error}</div>
    
    {error.includes('Free tier limit') && (
      <button
        onClick={async () => {
          try {
            const response = await fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                priceId: 'price_1T33WFRTl9hYt1sI62cCvbRp',
                userId: visitorId
              })
            });
            const { url } = await response.json();
            window.location.href = url;
          } catch (err) {
            alert('Failed to start checkout. Please try again.');
          }
        }}
        style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)',
          border: 'none',
          borderRadius: 8,
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(229,57,53,0.3)'
        }}
      >
        ⚡ Upgrade to Pro - $7/month
      </button>
    )}
  </div>
</div>
            </div>
          )}

          {/* First check celebration */}
          {showCelebration && (
            <div style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)", zIndex: 9999,
              background: "linear-gradient(145deg, rgba(0,200,81,0.15), rgba(0,200,81,0.08))",
              border: "2px solid rgba(0,200,81,0.4)",
              borderRadius: 16, padding: "24px 32px",
              animation: "fadeUp 0.4s ease both, celebrationBounce 0.6s ease 0.4s",
              backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#00C851", marginBottom: 6, fontFamily: "var(--display)", letterSpacing: 1 }}>
                FIRST FACT-CHECK COMPLETE!
              </div>
              <div style={{ fontSize: 12, color: "#90D5A8", fontFamily: "var(--body)", fontWeight: 300 }}>
                You're now part of the fight against misinformation.
              </div>
            </div>
          )}
          {showCelebration && (
            <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9998 }}>
              {[...Array(20)].map((_, i) => (
                <div key={i} style={{
                  position: "absolute",
                  left: `${Math.random() * 100}%`,
                  top: "-10px",
                  width: 8, height: 8,
                  background: ["#00C851", "#FFB300", "#64B5F6", "#EF5350"][i % 4],
                  borderRadius: "50%",
                  animation: `confetti ${1.5 + Math.random()}s linear forwards`,
                  animationDelay: `${Math.random() * 0.3}s`
                }} />
              ))}
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#E0E0E0", fontFamily: "var(--mono)", letterSpacing: 2 }}>
                  ANALYSIS RESULT
                </div>
                <button
                  onClick={() => { setInput(""); setResult(null); setError(null); setTimeout(() => textareaRef.current?.focus(), 50); }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6,
                    color: "#888",
                    cursor: "pointer",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: 1,
                    padding: "5px 12px",
                  }}
                >
                  ↺ NEW CLAIM
                </button>
              </div>
              <ResultPanel result={result} urlInput={urlInput} textInput={textInput} hasImage={!!uploadedImage} />
            </div>
          )}

          {/* History */}
          {history.length > 0 && !loading && (
            <div>
              <div className="section-label" style={{ color: "#333", marginBottom: 10 }}>
                RECENT CHECKS
              </div>
              {history.map((item, i) => {
                const cfg = verdictConfig[item.result.verdict] || verdictConfig["UNVERIFIABLE"];
                return (
                  <div key={i} className="history-item" onClick={() => loadHistory(item)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: cfg.color, fontFamily: "var(--mono)", fontSize: 12, flexShrink: 0 }}>
                        {cfg.icon}
                      </span>
                      <span style={{ fontSize: 16, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {item.hasImage && "🖼 "}
                        {item.textInput ? item.textInput.substring(0, 60) : item.urlInput ? item.urlInput.substring(0, 60) : "Image analysis"}
                        {(item.textInput?.length > 60 || item.urlInput?.length > 60) ? "..." : ""}
                      </span>
                      <span style={{ 
                        fontSize: 10, color: cfg.color, fontFamily: "var(--mono)", 
                        background: cfg.bg, padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                        border: `1px solid ${cfg.border}`
                      }}>
                        {item.result.verdict}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Footer note */}
          {!result && !loading && (
            <div style={{ textAlign: "center", marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ 
                display: "inline-flex", alignItems: "center", gap: 6,
                marginBottom: 12
              }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#E53935", opacity: 0.6 }} />
                <span style={{ fontSize: 10, color: "#333", fontFamily: "var(--mono)", letterSpacing: 3 }}>POWERED BY CLAUDE AI</span>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#E53935", opacity: 0.6 }} />
              </div>
              <p style={{ fontSize: 10, color: "#444455", fontFamily: "var(--mono)", lineHeight: 2, margin: 0 }}>
                INSTAGRAM · TWITTER/X · FACEBOOK · TIKTOK · THREADS<br />
                TEXT CLAIMS · SCREENSHOTS · CHARTS · IMAGES
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
