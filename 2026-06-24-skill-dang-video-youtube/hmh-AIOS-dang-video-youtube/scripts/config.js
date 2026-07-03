// config.js — Cấu hình hệ thống đăng video YouTube
// Mặc định = hệ thống đang chạy của Hoàng Minh Hóa. Máy/khách khác: đổi 3 giá trị ⬇ (hoặc set biến môi trường).
const path = require('path');

// ROOT = thư mục chứa .secrets/. Mặc định "H:\HOÁ TRI THỨC"; đổi qua env YT_ROOT cho máy khác.
const ROOT = process.env.YT_ROOT || 'H:\\HOÁ TRI THỨC';

module.exports = {
  // --- Lark Base (ĐỔI cho khách khác) ---
  BASE_TOKEN: process.env.YT_BASE_TOKEN || 'TaaEbHJg5aoz2Usw3mQlK9mQgUR',
  TABLE_ID: process.env.YT_TABLE_ID || 'tblpu3bAGohfC4Rt', // "Lịch đăng YouTube"
  // Tên field (lark-cli nhận theo tên field, ổn định hơn id khi đọc)
  FIELDS: {
    tieuDe: 'Tiêu đề',
    moTa: 'Mô tả',
    tags: 'Tags',
    video: 'Video',
    thumbnail: 'Thumbnail',
    loai: 'Loại',          // "Video dài" | "Shorts"
    playlist: 'Playlist',
    cheDo: 'Chế độ',       // "Công khai" | "Không công khai" | "Riêng tư"
    ngayGio: 'Ngày giờ đăng',
    trangThai: 'Trạng thái', // "Chờ đăng" | "Đang đăng" | "Đã đăng" | "Lỗi"
    linkVideo: 'Link video',
    ghiChuLoi: 'Ghi chú lỗi',
  },
  FIELD_IDS: {
    video: 'fldRNZj7wV',
    thumbnail: 'fldVFTTvqJ',
  },
  STATUS: {
    cho: 'Chờ đăng',
    dang: 'Đang đăng',
    xong: 'Đã đăng',
    loi: 'Lỗi',
  },
  PRIVACY_MAP: {
    'Công khai': 'public',
    'Không công khai': 'unlisted',
    'Riêng tư': 'private',
  },

  // --- lark-cli (gọi node trực tiếp vào run.js để tránh lỗi EINVAL khi spawn .cmd) ---
  LARK_JS: 'C:\\Users\\Admin\\AppData\\Roaming\\npm\\node_modules\\@larksuite\\cli\\scripts\\run.js',
  LARK_AS: 'user',

  // --- YouTube / Google ---
  CLIENT_SECRET: path.join(ROOT, '.secrets', 'client_secret.json'),
  TOKEN_FILE: path.join(ROOT, '.secrets', 'youtube-token.json'), // refresh token lưu ở đây
  SCOPES: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ],

  // --- thư mục tạm tải video ---
  TMP_DIR: path.join(process.env.TEMP || 'C:\\Temp', 'yt-upload'),

  // --- log ---
  LOG_FILE: path.join(__dirname, 'run.log'),

  ROOT,
};
