import { createClient } from '@supabase/supabase-js';

// Đọc cấu hình từ biến môi trường Vite hoặc từ localStorage nếu người dùng nhập trực tiếp từ UI
const getStoredConfig = () => {
  try {
    const raw = localStorage.getItem('caphe_supabase_config');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const stored = getStoredConfig();
const DEFAULT_URL = 'https://oywnzrsnvscumjqdstdu.supabase.co';
const DEFAULT_KEY = 'sb_publishable_UgrI5YBxKPEqrv3mdu4rhw_JE1HNmSE';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || stored?.url || DEFAULT_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || stored?.key || DEFAULT_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_URL.includes('.supabase.co') &&
    SUPABASE_ANON_KEY.length > 20
  );
};

export const saveSupabaseConfig = (url, key) => {
  const cleanUrl = (url || '').trim();
  const cleanKey = (key || '').trim();
  localStorage.setItem('caphe_supabase_config', JSON.stringify({ url: cleanUrl, key: cleanKey }));
  window.location.reload();
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('caphe_supabase_config');
  window.location.reload();
};

// Tạo Supabase client nếu đã được cấu hình hợp lệ
export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Auth helper utilities
export const authService = {
  async getSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  },

  async getUser() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  },

  async signUp(email, password, fullName) {
    if (!supabase) throw new Error('Supabase chưa được cấu hình URL và API Key.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || email.split('@')[0] },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase chưa được cấu hình URL và API Key.');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async resetPassword(email) {
    if (!supabase) throw new Error('Supabase chưa được cấu hình URL và API Key.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
    });
    if (error) throw error;
  },

  async updateUser(attributes) {
    if (!supabase) throw new Error('Supabase chưa được cấu hình.');
    const { data, error } = await supabase.auth.updateUser(attributes);
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async deleteOwnAccount() {
    if (!supabase) throw new Error('Supabase chưa được cấu hình.');
    const { error } = await supabase.rpc('delete_own_account');
    if (error) throw error;
  },

  onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },
};
