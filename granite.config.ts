import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'simplemilkpoop',
  brand: {
    displayName: '간단 수유똥 기록',
    primaryColor: '#e8b4bc',
    icon: 'https://static.toss.im/appsintoss/29121/38f9c28b-983b-4fc7-9e56-464c480f26b9.png',
  },
  web: {
    host: '192.168.0.14',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'tsc -b && vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
  webViewProps: {
    type: 'partner',
  },
});
