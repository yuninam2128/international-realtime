// 화면·번역 언어. 번역은 Gemini 가 하므로 Soniox 가 소리를 못 알아듣는 언어(미얀마어 등)도 고를 수 있다.
export const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'my', label: 'မြန်မာ' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'mn', label: 'Монгол' },
  { code: 'uz', label: "O'zbek" },
  { code: 'ne', label: 'नेपाली' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'th', label: 'ไทย' },
  { code: 'ru', label: 'Русский' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
] as const;

export const DEFAULT_LANGUAGE = 'ko';
