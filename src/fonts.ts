// Self-hosted fonts via Fontsource, so the app makes no external font requests.
// This keeps the page cross-origin isolated (COOP/COEP) without COEP blocking
// Google Fonts. Only the weights the UI actually uses are imported.
// Registered font-family names: 'Inter' and 'JetBrains Mono'.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';

import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
