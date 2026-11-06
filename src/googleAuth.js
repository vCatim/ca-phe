// Quản lý xác thực Google OAuth2 (Google Identity Services - GIS)
const STORAGE_KEY = 'caphe_google_auth';
const CONFIG_KEY = 'caphe_google_client_id';

// Scopes cần thiết cho Google Calendar và Google Tasks
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// Lấy Client ID từ env hoặc từ cấu hình lưu trữ
export const getGoogleClientId = () => {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem(CONFIG_KEY) || '';
};

export const saveGoogleClientId = (clientId) => {
  if (!clientId || !clientId.trim()) {
    localStorage.removeItem(CONFIG_KEY);
  } else {
    localStorage.setItem(CONFIG_KEY, clientId.trim());
  }
};

// Đọc thông tin token và profile đã lưu
export const getStoredGoogleAuth = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const auth = JSON.parse(raw);
    return auth;
  } catch (e) {
    return null;
  }
};

// Kiểm tra token còn hạn không (chừa 60 giây an toàn)
export const isGoogleTokenValid = () => {
  const auth = getStoredGoogleAuth();
  if (!auth || !auth.accessToken) return false;
  if (!auth.expiresAt) return true;
  return Date.now() < (auth.expiresAt - 60000);
};

export const isGoogleConnected = () => {
  const auth = getStoredGoogleAuth();
  return Boolean(auth && auth.accessToken);
};

export const saveGoogleAuth = (authData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
};

export const clearGoogleAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Nạp Google Identity Services script động nếu chưa có
let gisLoadedPromise = null;
export const loadGisScript = () => {
  if (gisLoadedPromise) return gisLoadedPromise;

  gisLoadedPromise = new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      resolve(window.google);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve(window.google);
      } else {
        reject(new Error('Không thể tải Google Identity Services.'));
      }
    };
    script.onerror = () => reject(new Error('Lỗi mạng khi tải Google API client.'));
    document.head.appendChild(script);
  });

  return gisLoadedPromise;
};

// Lấy thông tin tài khoản Google từ access token
export const fetchGoogleUserInfo = async (accessToken) => {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Lỗi lấy thông tin Google user:', e);
    return null;
  }
};

// Khởi chạy popup xác thực Google OAuth2 và lấy token
export const requestGoogleAccessToken = async (customClientId) => {
  const clientId = customClientId || getGoogleClientId();
  if (!clientId) {
    throw new Error('Chưa cấu hình Google Client ID. Vui lòng nhập Client ID trong cài đặt.');
  }

  const google = await loadGisScript();

  return new Promise((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        prompt: 'consent',
        callback: async (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }

          const accessToken = response.access_token;
          const expiresIn = Number(response.expires_in) || 3599;
          const expiresAt = Date.now() + (expiresIn * 1000);

          // Lấy thông tin user
          const user = await fetchGoogleUserInfo(accessToken);

          const authData = {
            accessToken,
            expiresAt,
            user: user ? {
              email: user.email,
              name: user.name,
              picture: user.picture,
            } : null,
            connectedAt: new Date().toISOString(),
          };

          saveGoogleAuth(authData);
          resolve(authData);
        },
      });

      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
};
