import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs also work when the built site is served from a subpath.
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      // video/ 下的 CDP 脚本、下载中的视频会用 Windows 锁住文件，
      // watcher 一旦 watch 到就 EBUSY 崩进程，这里把临时文件/产物排除掉。
      ignored: [
        '**/*.tmpdir/**',
        '**/*.tmpdir',
        '**/.cdp.mjs.*',
        '**/*.crdownload',
        '**/*.part',
        '**/*.download',
        '**/video/out/**',
        '**/video/frames/**',
        '**/video/node_modules/**',
        '**/video/vendor/**',
        '**/video/*.log',
      ],
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
