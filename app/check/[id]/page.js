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
    "FACT": { color: "#00C851", label: "VERIFIED FACT" },
    "MOSTLY FACT": { color: "#7BC67E", label: "MOSTLY ACCURATE" },
    "MISLEADING": { color: "#FFB300", label: "MISLEADING" },
    "MOSTLY FALSE": { color: "#FF7043", label: "MOSTLY FALSE" },
    "FALSE": { color: "#FF1744", label: "FALSE" },
    "UNVERIFIABLE": { color: "#90A4AE", label: "UNVERIFIABLE" }
  };
  
  const cfg = verdictConfig[result.verdict] || verdictConfig["UNVERIFIABLE"];
  
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', background: '#080810', color: '#f5f5f5' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2, margin: '0 0 8px' }}>
              <span style={{ background: 'linear-gradient(135deg, #fff 0%, #ff1744 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                SIGNAL VS NOISE
              </span>
            </h1>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>AI-Powered Fact-Check Report</p>
          </div>
          
          {/* Verdict */}
          <div style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}55`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: cfg.color, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>VERDICT</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: cfg.color, marginBottom: 16 }}>{cfg.label}</div>
            <div style={{ fontSize: 16, color: '#ddd', fontStyle: 'italic', marginBottom: 16 }}>"{result.summary}"</div>
            <div style={{ fontSize: 13, color: '#888' }}>Confidence: {result.confidence}%</div>
          </div>
          
          {/* Input */}
          {(urlInput || textInput || hasImage) && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#666', fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>CLAIM ANALYZED</div>
              {urlInput && <p style={{ fontSize: 13, color: '#999', marginBottom: 8 }}><strong>URL:</strong> {urlInput}</p>}
              {textInput && <p style={{ fontSize: 14, color: '#ccc', margin: 0, lineHeight: 1.6 }}>{textInput}</p>}
              {hasImage && <p style={{ fontSize: 13, color: '#999', marginTop: 8, fontStyle: 'italic' }}>🖼 Image analyzed</p>}
            </div>
          )}
          
          {/* Bottom Line */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#666', fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>BOTTOM LINE</div>
            <p style={{ fontSize: 15, color: '#ddd', margin: 0, lineHeight: 1.7 }}>{result.bottomLine}</p>
          </div>
          
          {/* Claims */}
          {result.claims && result.claims.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#666', fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>CLAIMS ANALYZED</div>
              {result.claims.map((claim, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{claim.claim}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{claim.explanation}</div>
                </div>
              ))}
            </div>
          )}
          
          {/* Red Flags */}
          {result.redFlags && result.redFlags.length > 0 && (
            <div style={{ background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.15)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: '#ef5350', fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>🚩 RED FLAGS DETECTED</div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#ffaaaa', fontSize: 14, lineHeight: 1.8 }}>
                {result.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
              </ul>
            </div>
          )}
          
          {/* Citations */}
          {result.citations && result.citations.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: '#666', fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>SOURCES & CITATIONS</div>
              {result.citations.map((cite, i) => (
                <a key={i} href={cite.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, marginBottom: 10, textDecoration: 'none', color: '#90a8b8', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 14 }}>{cite.title || cite.url} ↗</div>
                </a>
              ))}
            </div>
          )}
          
          {/* CTA */}
          <div style={{ textAlign: 'center', padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, color: '#fff' }}>Try Your Own Fact-Check</h2>
            <p style={{ fontSize: 15, color: '#888', marginBottom: 24 }}>2 free checks per day. No credit card required.</p>
            <a href="https://signalnoise.tech" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #c62828 0%, #e53935 50%, #ff1744 100%)', border: 'none', borderRadius: 10, color: 'white', fontSize: 16, fontWeight: 700, padding: '16px 40px', textDecoration: 'none', boxShadow: '0 8px 24px rgba(229,57,53,0.3)' }}>
              Try It Free →
            </a>
          </div>
          
          {/* Footer */}
          <div style={{ textAlign: 'center', paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 11, color: '#444', margin: 0 }}>© 2026 SIGNAL VS NOISE • POWERED BY CLAUDE AI</p>
          </div>
          
        </div>
      </body>
    </html>
  );
}
