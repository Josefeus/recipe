import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/public/**', '**/src/data/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // 只启用 essential：排版类规则交给 Prettier，避免两套工具互相打架。
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.mjs', '**/*.config.ts', '**/mock/**/*.ts', '**/scripts/**/*.ts'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
)
