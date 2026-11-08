// ============ CÀ PHÊ — Hằng số & Cấu hình mặc định ============

export const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
export const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const CATS = ['Học tập', 'Bài tập', 'Dự án', 'Cá nhân', 'Sức khỏe'];

export const CC = {
  'Học tập': 'var(--k-study)',
  'Bài tập': 'var(--k-study)',
  'Dự án': 'var(--k-proj)',
  'Cá nhân': 'var(--k-pers)',
  'Sức khỏe': 'var(--k-pers)'
};

export const PRI = ['Thấp', 'Trung bình', 'Cao'];

export const ST = {
  todo: 'Chưa làm',
  doing: 'Đang làm',
  done: 'Hoàn thành'
};

// Bảng màu & nhóm việc mặc định: tên + trọng số ngân sách
export const PAL = ['#e0a24a', '#5b8def', '#6fae7c', '#a07be0', '#e58e5d', '#d9658b', '#4fb3bf', '#c9b458', '#a99a89'];

export const GRP0 = [
  ['Ăn uống', 0.3],
  ['Đi lại', 0.08],
  ['Học tập', 0.15],
  ['Dự án', 0.1],
  ['Giải trí', 0.12],
  ['Mua sắm', 0.1],
  ['Sức khỏe', 0.05],
  ['Cá nhân', 0.05],
  ['Khác', 0.05]
];

export const defaultGroups = () => GRP0.map(([name, share], i) => ({
  name,
  share,
  color: PAL[i % PAL.length]
}));

export const QUOTES = [
  'Mỗi ngày một bước nhỏ, cuối tháng thành quãng đường dài.',
  'Một tách cà phê, một kế hoạch rõ ràng — thế là đủ để bắt đầu.',
  'Kỷ luật hôm nay là tự do của ngày mai.',
  'Code một dòng, tiết kiệm một đồng, tiến gần mục tiêu hơn một chút.',
  'Đừng chờ đủ động lực — hãy bắt đầu, động lực sẽ tới.',
  'Tiến bộ 1% mỗi ngày, một năm sau bạn sẽ ngạc nhiên.'
];

export const CHIPS = {
  expense: [
    ['Cà phê', 'Ăn uống'],
    ['Ăn trưa', 'Ăn uống'],
    ['Xăng', 'Đi lại'],
    ['Gửi xe', 'Đi lại'],
    ['Mua sách', 'Học tập'],
    ['Xem phim', 'Giải trí']
  ],
  income: [
    ['Làm thêm', 'Khác'],
    ['Freelance', 'Dự án'],
    ['Học bổng', 'Học tập'],
    ['Gia đình', 'Khác']
  ]
};

export const NAV = [
  ['today', '🏠', 'Trang chính'],
  ['cal', '📅', 'Lịch'],
  ['fin', '💰', 'Tài chính'],
  ['goal', '🎯', 'Quỹ']
];
