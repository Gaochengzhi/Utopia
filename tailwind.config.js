const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: colors.neutral,
        slate: colors.neutral,
        // 票据视觉体系：值来自 CSS 变量（globals.css 定义），
        // .dark 下变量整体切换，因此这些色名无需 dark: 前缀即自动换肤
        paper: 'rgb(var(--c-paper) / <alpha-value>)',   // 页面底：暖纸
        panel: 'rgb(var(--c-panel) / <alpha-value>)',   // 衬底：深一档的纸
        chip: 'rgb(var(--c-chip) / <alpha-value>)',     // 卡片纸
        ink: 'rgb(var(--c-ink) / <alpha-value>)',       // 正文墨
        ink2: 'rgb(var(--c-ink2) / <alpha-value>)',     // 褪色墨
        rule: 'rgb(var(--c-rule) / <alpha-value>)',     // 细线
        accent: 'rgb(var(--c-accent) / <alpha-value>)', // 印泥红
        ledger: 'rgb(var(--c-ledger) / <alpha-value>)', // 账本蓝（链接）
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
          '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"',
          '"Noto Sans SC"', 'sans-serif',
        ],
        mono: [
          'ui-monospace', '"SF Mono"', 'Menlo', 'Consolas',
          '"Liberation Mono"', 'monospace',
        ],
      },
    },
  },
  plugins: [],
}
