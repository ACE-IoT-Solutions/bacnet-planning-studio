/// <reference types="vite/client" />

declare const __QUIZ_RESULTS_ENDPOINT__: string;

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
