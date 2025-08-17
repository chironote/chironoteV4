import React from 'react';

const ErrorBanner = ({ isVisible = false }) => {
  if (!isVisible) return null;

  const bannerStyles = {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '8px 16px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
    borderBottom: '1px solid #c82333',
    position: 'relative',
    zIndex: 1000,
    width: '100%',
    boxSizing: 'border-box',
    lineHeight: '1.4'
  };

  return (
    <div style={bannerStyles}>
      We are currently facing a disruption of service or undergoing maintenance. Some features may not be working currently as intended.
    </div>
  );
};

export default ErrorBanner;
