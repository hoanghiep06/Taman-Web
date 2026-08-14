// LƯU Ý: Toàn bộ giá trị màu trong file này giờ đồng bộ 1-1 với token
// trong `src/index.css` (biến --color-*). Đây là bản dịch sang JS object
// để dùng trong style động (badge trạng thái, chart màu...) — không phải
// nguồn màu độc lập nữa. Nếu cần đổi màu thương hiệu, sửa `index.css` TRƯỚC,
// rồi đồng bộ lại giá trị tương ứng ở đây.
export const theme = {
  color: {
    bg: '#F4F6F9',           // = --color-bg
    surface: '#FFFFFF',       // = --color-surface
    surfaceMuted: '#F1F5F9',
    border: '#E2E8F0',        // = --color-border
    borderStrong: '#CBD5E1',

    ink: '#0F172A',           // = --color-text-heading
    inkSecondary: '#334155',  // = --color-text
    inkTertiary: '#64748B',   // = --color-text-muted
    inkMuted: '#94A3B8',

    primary: '#1F6F78',       // = --color-primary (đã đồng bộ, trước đây là #0284C7 lệch tông)
    primaryDark: '#163F44',   // = --color-primary-dark
    primaryTint: '#E3F1F0',   // = --color-primary-light
    primaryRing: 'rgba(31, 111, 120, 0.16)',

    success: '#2E7D32',       // = --color-success
    successDark: '#1B5E20',
    successTint: '#EAF6EC',   // = --color-success-bg

    warning: '#B45309',       // = --color-warning
    warningDark: '#92400E',
    warningTint: '#FDF3E7',   // = --color-warning-bg
    warningTintSoft: '#FEFCE8',

    danger: '#C0392B',        // = --color-danger
    dangerDark: '#962D22',
    dangerTint: '#FDEDEC',    // = --color-danger-bg

    info: '#6366F1',          // = --color-info
    infoDark: '#4338CA',      // = --color-info-dark
    infoTint: '#EEF2FF',      // = --color-info-bg
  },
  radius: { sm: '8px', md: '12px', lg: '14px', xl: '16px', xxl: '20px', pill: '999px' },
  shadow: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.05)',
    md: '0 2px 10px rgba(15, 23, 42, 0.06)',
    lg: '0 10px 24px -8px rgba(15, 23, 42, 0.18)',
    xl: '0 24px 48px -12px rgba(15, 23, 42, 0.3)',
  },
};