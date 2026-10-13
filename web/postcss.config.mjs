// Plain CSS only (no Tailwind). This file also stops the build from picking up ../frontend/postcss.config.js
// for the shared styles in ../frontend/src/styles.
export default { plugins: { autoprefixer: {} } };
