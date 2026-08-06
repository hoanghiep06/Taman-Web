import React from 'react';

export const CareDutyWebLayout = ({ children }) => {
  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        maxHeight: 'calc(100vh - 64px)',
        overflowY: 'auto', // Cho phép cuộn trên Web
        padding: '24px',
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  );
};