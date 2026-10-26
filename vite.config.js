import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

const DEPLOY_REPOSITORY = 'ACE-IoT-Solutions/bacnet-planning-studio';

function googleAnalyticsPlugin(measurementId) {
  return {
    name: 'bacnet-studio-google-analytics',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            attrs: {
              async: true,
              src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`,
            },
            injectTo: 'head',
          },
          {
            tag: 'script',
            children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');`,
            injectTo: 'head',
          },
        ];
      },
    },
  };
}

export default defineConfig(({ command }) => {
  const measurementId = process.env.GA_MEASUREMENT_ID?.trim();
  const isCanonicalCiBuild = command === 'build'
    && process.env.CI === 'true'
    && process.env.GITHUB_REPOSITORY === DEPLOY_REPOSITORY;
  const shouldInjectAnalytics = isCanonicalCiBuild && /^G-[A-Z0-9]+$/.test(measurementId ?? '');

  return {
    plugins: [vue(), ...(shouldInjectAnalytics ? [googleAnalyticsPlugin(measurementId)] : [])],
    base: './', // Ensures relative assets so it hosts properly on GitHub Pages subpaths
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
