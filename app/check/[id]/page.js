import { Redis } from '@upstash/redis';
import { notFound } from 'next/navigation';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function generateMetadata({ params }) {
  const { id } = params;
  const data = await redis.get(`factcheck:${id}`);
  
  if (!data) return { title: 'Fact-Check Not Found' };
  
  const checkData = typeof data === 'string' ? JSON.parse(data) : data;
  return {
    title: `Fact-Check: ${checkData.result.verdict} - Signal vs Noise`,
    description: checkData.result.summary || 'AI-powered fact-check with sources',
  };
}

export default async function SharedCheck({ params }) {
  const { id } = params;
  const data = await redis.get(`factcheck:${id}`);
  
  if (!data) {
    notFound();
  }
  
  const checkData = typeof data === 'string' ? JSON.parse(data) : data;
  const { result, urlInput, textInput, hasImage } = checkData;
  
  const verdictConfig = {
    "FACT": { color: "#00C851", bg: "rgba(0,200,81,0.12)", border: "rgba(0,200,81,0.4)", icon: "✓" },
    "MOSTLY FACT": { color: "#7BC67E", bg: "rgba(123,198,126,0.12)", border: "rgba(123,198,126,0.4)", icon: "◑" },
    "MISLEADING": { color: "#FFB300", bg: "rgba(255,179,0,0.12)", border: "rgba(255,179,0,0.4)", icon: "⚠" },
    "MOSTLY FALSE": { color: "#FF7043", bg: "rgba(255,112,67,0.12)", border: "rgba(255,112,67,0.4)", icon: "✕" },
    "FALSE": { color: "#FF1744", bg: "rgba(255,23,68,0.12)", border: "rgba(255,23,68,0.4)", icon: "✕" },
    "UNVERIFIABLE": { color: "#90A4AE", bg: "rgba(144,164,174,0.12)", border: "rgba(144,164,174,0.4)", icon: "?" }
  };
  
  const cfg = verdictConfig[result.verdict] || verdictConfig["UNVERIFIABLE"];
  
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #080810;
            font-family: 'DM Sans', -apple-system, sans-serif;
            color: #E8E8E8;
            -webkit-font-smoothing: antialiased;
          }
          .verdict-badge {
            position: relative;
            overflow: hidden;
          }
          .verdict-badge::before {
            content: '';
            position: absolute;
            top: -20px;
            right: -20px;
            font-size: 120px;
            opacity: 0.04;
            font-weight: 900;
            line-height: 1;
            pointer-events: none;
          }
          .claim-card {
            background: rgba(255,255,255,0.025);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 10px;
            transition: all 0.2s;
          }
          .claim-card:hover {
            background: rgba(255,255,255,0.05);
            border-color: rgba(255,255,255,0.1);
          }
          .citation-link {
            display: block;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px;
            padding: 14px;
            margin-bottom: 10px;
            text-decoration: none;
            color: #90A8B8;
            transition: all 0.2s;
          }
          .citation-link:hover {
            background: rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.15);
            transform: translateX(3px);
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #C62828 0%, #E53935 50%, #FF1744 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 16px;
            font-weight: 700;
            padding: 18px 48px;
            text-decoration: none;
            box-shadow: 0 8px 24px rgba(229,57,53,0.3);
            transition: all 0.25s;
            letter-spacing: 1px;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 40px rgba(229,57,53,0.4);
          }
          .section-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            margin-bottom: 12px;
            color: #666;
          }
        `}</style>
      </head>
      <body>
        <div style={{ minHeight: '100vh', position: 'relative' }}>
          {/* Background effects */}
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(229,57,53,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(229,57,53,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, background: 'radial-gradient(ellipse, rgba(229,57,53,0.07) 0%, transparent 70%)' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '40px 20px 80px' }}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, fontWeight: 900, letterSpacing: 4, margin: '0 0 8px' }}>
                <span style={{ background: 'linear-gradient(135deg, #fff 0%, #ff1744 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  SIGNAL VS NOISE
                </span>
              </h1>
              <p style={{ fontSize: 14, color: '#666', margin: 0, letterSpacing: 0.5 }}>AI-Powered Fact-Check Report</p>
            </div>

            {/* Verdict Badge */}
            <div className="verdict-badge" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: `0 8px 24px ${cfg.color}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#000', fontWeight: 900, boxShadow: `0 0 20px ${cfg.color}55` }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: cfg.color, letterSpacing: 3, marginBottom: 4 }}>VERDICT</div>
                  <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 32, fontWeight: 900, color: cfg.color, letterSpacing: 2 }}>{verdictConfig[result.verdict]?.color === cfg.color ? result.verdict : 'UNVERIFIABLE'}</div>
                </div>
              </div>
              <p style={{ fontSize: 16, color: '#ddd', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5 }}>"{result.summary}"</p>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>CONFIDENCE</span>
                  <span style={{ color: cfg.color, fontWeight: 700 }}>{result.confidence}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${result.confidence}%`, background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`, borderRadius: 3 }} />
                </div>
              </div>
            </div>

            {/* Input Analyzed */}
            {(urlInput || textInput || hasImage) && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div className="section-label">CLAIM ANALYZED</div>
                {urlInput && <p style={{ fontSize: 13, color: '#999', marginBottom: 8 }}><strong>URL:</strong> {urlInput}</p>}
                {textInput && <p style={{ fontSize: 14, color: '#ccc', margin: 0, lineHeight: 1.7 }}>{textInput}</p>}
                {hasImage && <p style={{ fontSize: 13, color: '#999', marginTop: 8, fontStyle: 'italic' }}>🖼 Image analyzed</p>}
              </div>
            )}

            {/* Bottom Line */}
            <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div className="section-label">THE BOTTOM LINE</div>
              <p style={{ fontSize: 15, color: '#ddd', margin: 0, lineHeight: 1.8 }}>{result.bottomLine}</p>
            </div>

            {/* Claims */}
            {result.claims && result.claims.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="section-label">CLAIMS ANALYZED ({result.claims.length})</div>
                {result.claims.map((claim, i) => {
                  const claimColors = {
                    "TRUE": "#00C851",
                    "FALSE": "#FF1744",
                    "MISLEADING": "#FFB300",
                    "UNVERIFIABLE": "#90A4AE"
                  };
                  const claimColor = claimColors[claim.status] || "#90A4AE";
                  return (
                    <div key={i} className="claim-card" style={{ borderLeft: `3px solid ${claimColor}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ color: claimColor, fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>[{claim.status === "TRUE" ? "✓" : claim.status === "FALSE" ? "✕" : claim.status === "MISLEADING" ? "⚠" : "?"}]</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#E8E8E8', fontWeight: 600, lineHeight: 1.5 }}>{claim.claim}</p>
                          <p style={{ margin: 0, fontSize: 13, color: '#B0B0B0', lineHeight: 1.6 }}>{claim.explanation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Red Flags */}
            {result.redFlags && result.redFlags.length > 0 && (
              <div style={{ background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.15)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div className="section-label" style={{ color: '#EF5350' }}>🚩 RED FLAGS DETECTED</div>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#FFAAAA', fontSize: 14, lineHeight: 1.8 }}>
                  {result.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
                </ul>
              </div>
            )}

            {/* Citations */}
            {result.citations && result.citations.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div className="section-label">SOURCES & CITATIONS</div>
                {result.citations.map((cite, i) => (
                  <a key={i} href={cite.url} target="_blank" rel="noopener noreferrer" className="citation-link">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, color: '#37474F', fontFamily: "'JetBrains Mono', monospace", background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span style={{ fontSize: 14, flex: 1 }}>{cite.title || cite.url}</span>
                      <span style={{ fontSize: 12, color: '#455A64' }}>↗</span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* CTA Section */}
            <div style={{ textAlign: 'center', padding: '60px 20px 40px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 36, fontWeight: 900, letterSpacing: 2, marginBottom: 12, background: 'linear-gradient(135deg, #fff 0%, #ff1744 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                TRY YOUR OWN FACT-CHECK
              </h2>
              <p style={{ fontSize: 15, color: '#888', marginBottom: 32, lineHeight: 1.6 }}>
                2 free fact-checks per day. No credit card required.
              </p>
              <a href="https://signalnoise.tech" className="cta-button">
                ANALYZE FOR TRUTH →
              </a>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: 10, color: '#444', margin: 0, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2 }}>
                © 2026 SIGNAL VS NOISE • POWERED BY CLAUDE AI
              </p>
            </div>

          </div>
        </div>
      </body>
    </html>
  );
}
