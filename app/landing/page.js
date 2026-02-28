'use client';
import { Bebas_Neue, DM_Sans } from 'next/font/google';
import { useState } from 'react';

const bebasNeue = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  display: 'block',
});

const dmSans = DM_Sans({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'block',
});

export default function Landing() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          background: #0a0a0f;
          font-family: ${dmSans.style.fontFamily}, -apple-system, sans-serif;
          color: #f5f5f5;
          -webkit-font-smoothing: antialiased;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .gradient-text {
          background: linear-gradient(135deg, #ffffff 0%, #ff1744 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .feature-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(229, 57, 53, 0.3);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(229, 57, 53, 0.15);
        }

        .cta-button {
          background: linear-gradient(135deg, #c62828 0%, #e53935 50%, #ff1744 100%);
          border: none;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          font-family: ${dmSans.style.fontFamily};
          font-size: 16px;
          font-weight: 700;
          padding: 18px 40px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 24px rgba(229, 57, 53, 0.3);
          position: relative;
          overflow: hidden;
        }

        .cta-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }

        .cta-button:hover::before {
          transform: translateX(100%);
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(229, 57, 53, 0.4);
        }

        .cta-button:active {
          transform: translateY(0);
        }

        .secondary-button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          color: #e0e0e0;
          cursor: pointer;
          font-family: ${dmSans.style.fontFamily};
          font-size: 16px;
          font-weight: 600;
          padding: 18px 40px;
          transition: all 0.2s;
        }

        .secondary-button:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .video-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
          animation: fadeIn 0.3s ease;
        }

        .video-container {
          position: relative;
          width: 100%;
          max-width: 900px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
          animation: fadeUp 0.4s ease;
        }

        .close-button {
          position: absolute;
          top: -50px;
          right: 0;
          background: transparent;
          border: none;
          color: white;
          font-size: 36px;
          cursor: pointer;
          padding: 8px;
          line-height: 1;
          transition: transform 0.2s;
        }

        .close-button:hover {
          transform: scale(1.1);
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 48px !important;
          }
          
          .feature-grid {
            grid-template-columns: 1fr !important;
          }

          .cta-group {
            flex-direction: column !important;
            gap: 16px !important;
          }

          .cta-button, .secondary-button {
            width: 100%;
          }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
        
        {/* Background Elements */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(229,57,53,0.08) 0%, transparent 70%)',
            animation: 'float 8s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-5%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(229,57,53,0.06) 0%, transparent 70%)',
            animation: 'float 10s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(229,57,53,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(229,57,53,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }} />
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          
          {/* Header/Nav */}
          <header style={{ padding: '24px 0' }}>
            <div className="container">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  fontFamily: bebasNeue.style.fontFamily,
                  fontSize: 32,
                  letterSpacing: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #ff1744 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  SIGNAL VS NOISE
                </div>
                <a href="https://signalnoise.tech" style={{ textDecoration: 'none' }}>
                  <button className="secondary-button" style={{ padding: '12px 28px', fontSize: 14 }}>
                    Try It Free →
                  </button>
                </a>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section style={{ padding: '80px 0 120px', animation: 'fadeUp 0.8s ease' }}>
            <div className="container">
              <div style={{ textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
                
                {/* Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(229,57,53,0.08)',
                  border: '1px solid rgba(229,57,53,0.2)',
                  borderRadius: 24,
                  padding: '8px 20px',
                  marginBottom: 32,
                  animation: 'fadeIn 0.8s 0.2s both'
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#e53935',
                    boxShadow: '0 0 8px rgba(229,57,53,0.8)'
                  }} />
                  <span style={{ fontSize: 13, color: '#ef5350', fontWeight: 600, letterSpacing: 1 }}>
                    HYBRID AI • LIVE WEB SEARCH • DEEP RESEARCH
                  </span>
                </div>

                {/* Headline */}
                <h1 className="hero-title" style={{
                  fontFamily: bebasNeue.style.fontFamily,
                  fontSize: 72,
                  lineHeight: 1.1,
                  letterSpacing: 2,
                  marginBottom: 24,
                  animation: 'fadeUp 0.8s 0.3s both'
                }}>
                  <span className="gradient-text">AI FACT-CHECKER</span>
                  <br />
                  THAT ACTUALLY WORKS
                </h1>

                {/* Subheadline */}
                <p style={{
                  fontSize: 22,
                  color: '#b0b0b0',
                  lineHeight: 1.6,
                  marginBottom: 48,
                  animation: 'fadeUp 0.8s 0.4s both'
                }}>
                  Paste any claim, URL, or screenshot.<br />
                  Get instant fact-checks with sources.
                </p>

                {/* CTA Buttons */}
                <div className="cta-group" style={{
                  display: 'flex',
                  gap: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  animation: 'fadeUp 0.8s 0.5s both'
                }}>
                  <a href="https://signalnoise.tech" style={{ textDecoration: 'none' }}>
                    <button className="cta-button">
                      Try It Free →
                    </button>
                  </a>
                  <button className="secondary-button" onClick={() => setShowVideo(true)}>
                    Watch Demo
                  </button>
                </div>

                {/* Social Proof */}
                <div style={{
                  marginTop: 48,
                  fontSize: 14,
                  color: '#666',
                  animation: 'fadeIn 0.8s 0.6s both'
                }}>
                  Trusted by journalists, researchers, and truth-seekers
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section style={{ padding: '80px 0', background: 'rgba(255,255,255,0.01)' }}>
            <div className="container">
              <div className="feature-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 32,
                animation: 'fadeUp 0.8s 0.7s both'
              }}>
                
                {/* Feature 1 */}
                <div className="feature-card">
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(100,181,246,0.12), rgba(100,181,246,0.04))',
                    border: '1px solid rgba(100,181,246,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    marginBottom: 24
                  }}>
                    🔍
                  </div>
                  <h3 style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 12,
                    color: '#ffffff'
                  }}>
                    Multiple Fact-Check Databases
                  </h3>
                  <p style={{
                    fontSize: 15,
                    color: '#888',
                    lineHeight: 1.7
                  }}>
                    Searches Snopes, PolitiFact, Reuters, AP, and more — all in one analysis.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="feature-card">
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(255,179,0,0.12), rgba(255,179,0,0.04))',
                    border: '1px solid rgba(255,179,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    marginBottom: 24
                  }}>
                    🚩
                  </div>
                  <h3 style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 12,
                    color: '#ffffff'
                  }}>
                    Detects Manipulation Tactics
                  </h3>
                  <p style={{
                    fontSize: 15,
                    color: '#888',
                    lineHeight: 1.7
                  }}>
                    Identifies conspiracy hashtags, loaded language, and specific misinformation tactics.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="feature-card">
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(156,39,176,0.12), rgba(156,39,176,0.04))',
                    border: '1px solid rgba(156,39,176,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    marginBottom: 24
                  }}>
                    ⚡
                  </div>
                  <h3 style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 12,
                    color: '#ffffff'
                  }}>
                    Quick or Deep Research Mode
                  </h3>
                  <p style={{
                    fontSize: 15,
                    color: '#888',
                    lineHeight: 1.7
                  }}>
                    Choose fast 30-second checks or comprehensive 10-15 search deep dives.
                  </p>
                </div>

              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section style={{ padding: '120px 0 80px' }}>
            <div className="container">
              <div style={{
                textAlign: 'center',
                maxWidth: 700,
                margin: '0 auto',
                animation: 'fadeUp 0.8s 0.8s both'
              }}>
                <h2 style={{
                  fontFamily: bebasNeue.style.fontFamily,
                  fontSize: 56,
                  letterSpacing: 2,
                  marginBottom: 24,
                  lineHeight: 1.2
                }}>
                  <span className="gradient-text">STOP MISINFORMATION</span>
                  <br />
                  START FACT-CHECKING
                </h2>
                <p style={{
                  fontSize: 18,
                  color: '#b0b0b0',
                  marginBottom: 40,
                  lineHeight: 1.6
                }}>
                  2 free fact-checks per day. No credit card required.
                </p>
                <a href="https://signalnoise.tech" style={{ textDecoration: 'none' }}>
                  <button className="cta-button" style={{ fontSize: 18, padding: '20px 48px' }}>
                    Try It Free →
                  </button>
                </a>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            padding: '40px 0',
            textAlign: 'center'
          }}>
            <div className="container">
              <div style={{ fontSize: 13, color: '#444', letterSpacing: 1 }}>
                © 2026 SIGNAL VS NOISE • POWERED BY CLAUDE AI
              </div>
            </div>
          </footer>

        </div>

        {/* Video Modal */}
        {showVideo && (
          <div className="video-modal" onClick={() => setShowVideo(false)}>
            <div className="video-container" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowVideo(false)}>×</button>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe 
                  src="https://www.loom.com/embed/a39d98ba876940e091053dd1ebb90612" 
                  frameBorder="0" 
                  allowFullScreen 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
