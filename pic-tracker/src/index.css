@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root {
    @apply h-full;
  }
  body {
    @apply bg-ink-950 text-ink-100 font-body antialiased;
    font-feature-settings: 'cv11', 'ss01', 'ss03';
  }
  /* Bigger tap targets, no double-tap zoom on buttons */
  button { touch-action: manipulation; }
  /* Subtle scrollbar in dark */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #252a35; border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: #363c4a; }
}

@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold tracking-wide transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed;
  }
  .btn-primary {
    @apply btn bg-ink-100 text-ink-950 hover:bg-white;
  }
  .btn-ghost {
    @apply btn bg-ink-800 text-ink-100 hover:bg-ink-700 border border-ink-700;
  }
  .btn-danger {
    @apply btn bg-code-5 text-white hover:opacity-90;
  }
  .input {
    @apply w-full bg-ink-900 border border-ink-700 rounded-lg px-3.5 py-2.5 text-ink-100 placeholder-ink-500 focus:outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-400;
  }
  .label {
    @apply block text-xs font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2;
  }
  .chip {
    @apply inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition select-none cursor-pointer;
  }
  .chip-off {
    @apply chip bg-ink-900 text-ink-300 border-ink-700 hover:border-ink-500;
  }
  .chip-on {
    @apply chip bg-ink-100 text-ink-950 border-ink-100;
  }
  .panel {
    @apply bg-ink-900 border border-ink-800 rounded-xl;
  }
  .divider {
    @apply h-px bg-ink-800;
  }
}
