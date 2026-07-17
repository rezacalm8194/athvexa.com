import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      "**/.next/**",
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**"
    ]
  },
  ...nextVitals,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off"
    }
  }
];

export default eslintConfig;
