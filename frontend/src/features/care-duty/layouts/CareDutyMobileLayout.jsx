import React from 'react';

export const CareDutyMobileLayout = ({ children }) => {
  return (
    <div 
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '100vh',
        overflowY: 'auto', // Bắt buộc cho phép cuộn dọc
        WebkitOverflowScrolling: 'touch', // Cuộn mượt trên iOS Safari
        padding: '16px',
        paddingBottom: '100px', // Khoảng trống dưới cùng để không bị che bởi BottomNav
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  );
};