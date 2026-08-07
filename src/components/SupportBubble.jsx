import React, { useState } from 'react';

export default function SupportBubble() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          left: '24px',
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          border: '1px solid var(--border-color, #e2e8f0)',
          maxWidth: '250px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-main, #1e293b)' }}>Need Help?</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted, #64748b)' }}>
            Please raise your issue to our support team at:<br/>
            <strong style={{ color: 'var(--primary, #3b82f6)', display: 'block', marginTop: '4px' }}>premabi11032008@gmail.com</strong>
          </p>
        </div>
      )}
      
      <div 
        className="support-bubble"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px', // Position on the left so it doesn't overlap Chatbot on the right
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#f59e0b', // A nice amber color to distinguish from the blue chatbot
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
          zIndex: 9999,
          cursor: 'pointer',
          transition: 'transform 0.2s'
        }}
        title="Contact Support"
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </>
          )}
        </svg>
      </div>
    </>
  );
}
