import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // 全局忽略
  {
    ignores: ['dist/', 'node_modules/', '*.config.ts', '*.config.js'],
  },

  // 基础推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则（类型感知关闭以提升速度，tsc 已覆盖类型检查）
  ...tseslint.configs.recommended,

  // React 项目源文件
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // React Hooks 规则
      ...reactHooks.configs.recommended.rules,

      // ── 实用宽松规则 ──
      // tsconfig 已启用 noUnusedLocals/noUnusedParameters，ESLint 侧关闭避免重复报错
      '@typescript-eslint/no-unused-vars': 'off',
      // 外部数据使用 unknown + 类型收窄，避免类型检查在接口处失效。
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'warn',
      // 关闭 require-yield（generator 在 sagas 中可能不需要 yield）
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);
