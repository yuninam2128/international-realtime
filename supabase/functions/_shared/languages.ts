// 프롬프트에는 코드 대신 이름을 넣는다. "my" 만 주면 미얀마어 대신 라오스어로 번역하는 일이 있었다.
const NAMES: Record<string, string> = {
  ko: 'Korean (한국어)',
  en: 'English',
  my: 'Burmese / Myanmar language (မြန်မာဘာသာ, Myanmar script)',
  vi: 'Vietnamese (Tiếng Việt)',
  zh: 'Simplified Chinese (简体中文)',
  ja: 'Japanese (日本語)',
  mn: 'Mongolian (Монгол хэл, Cyrillic script)',
  uz: "Uzbek (O'zbek tili, Latin script)",
  ne: 'Nepali (नेपाली)',
  id: 'Indonesian (Bahasa Indonesia)',
  th: 'Thai (ภาษาไทย)',
  ru: 'Russian (Русский)',
  fr: 'French (Français)',
  es: 'Spanish (Español)',
};

export const languageName = (code: string) => NAMES[code] ?? code;
