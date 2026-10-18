// 影像面板的后端配置。
// 未配置时，面板进入「本地演示模式」：数据只保存在当前浏览器，方便预览。
// 配置方式：在项目根目录建 .env.local，或在 GitHub 仓库 Variables 里填同名变量。
const env = import.meta.env || {};

export const backend = {
  url: (env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
  anonKey: env.VITE_SUPABASE_ANON_KEY || '',
  ownerEmail: (env.VITE_OWNER_EMAIL || '').trim().toLowerCase(),
  enabled: Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
};

export const SITE = {
  bilibiliProfile: env.VITE_BILIBILI_PROFILE || 'https://space.bilibili.com/'
};
