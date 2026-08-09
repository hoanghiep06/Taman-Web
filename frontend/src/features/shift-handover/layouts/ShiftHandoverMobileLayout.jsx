import React from 'react';

export const ShiftHandoverMobileLayout = ({ children }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '100vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px',
        paddingBottom: '100px', // Khoảng trống tránh bị che bởi BottomNav
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
};

export default ShiftHandoverMobileLayout;