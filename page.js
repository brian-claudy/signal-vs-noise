'use client';

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#080810',
      color: 'white',
      fontFamily: 'system-ui'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem' }}>Signal vs Noise</h1>
        <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>IT WORKS! 🎉</p>
      </div>
    </div>
  );
}