// /workspaces/github-copilot/copilot/languages.js

// Source: /workspaces/github-copilot/translate/LANGUAGES.md
// This list should be kept in sync with LANGUAGES.md
export const actualAvailableLanguages = [
  'afrikaans', 'albanian', 'amharic', 'arabic', 'armenian', 'assamese', 'aymara', 'azerbaijani', 
  'bambara', 'basque', 'belarusian', 'bengali', 'bhojpuri', 'bosnian', 'bulgarian', 'catalan', 
  'cebuano', 'chichewa', 'chinese (simplified)', 'chinese (traditional)', 'corsican', 'croatian', 
  'czech', 'danish', 'dhivehi', 'dogri', 'dutch', 'english', 'esperanto', 'estonian', 'ewe', 
  'filipino', 'finnish', 'french', 'frisian', 'galician', 'georgian', 'german', 'greek', 'guarani', 
  'gujarati', 'haitian creole', 'hausa', 'hawaiian', 'hebrew', 'hindi', 'hmong', 'hungarian', 
  'icelandic', 'igbo', 'ilocano', 'indonesian', 'irish', 'italian', 'japanese', 'javanese', 
  'kannada', 'kazakh', 'khmer', 'kinyarwanda', 'konkani', 'korean', 'krio', 'kurdish (kurmanji)', 
  'kurdish (sorani)', 'kyrgyz', 'lao', 'latin', 'latvian', 'lingala', 'lithuanian', 'luganda', 
  'luxembourgish', 'macedonian', 'maithili', 'malagasy', 'malay', 'malayalam', 'maltese', 'maori', 
  'marathi', 'meiteilon (manipuri)', 'mizo', 'mongolian', 'myanmar', 'nepali', 'norwegian', 
  'odia (oriya)', 'oromo', 'pashto', 'persian', 'polish', 'portuguese', 'punjabi', 'quechua', 
  'romanian', 'russian', 'samoan', 'sanskrit', 'scots gaelic', 'sepedi', 'serbian', 'sesotho', 
  'shona', 'sindhi', 'sinhala', 'slovak', 'slovenian', 'somali', 'spanish', 'sundanese', 
  'swahili', 'swedish', 'tajik', 'tamil', 'tatar', 'telugu', 'thai', 'tigrinya', 'tsonga', 
  'turkish', 'turkmen', 'twi', 'ukrainian', 'urdu', 'uyghur', 'uzbek', 'vietnamese', 'welsh', 
  'xhosa', 'yiddish', 'yoruba', 'zulu'
];

// This map is crucial and needs to be accurate for the translation API.
// It maps the lowercase language name (from actualAvailableLanguages) to its code.
// Based on translate-depricated/languages.js and extended for LANGUAGES.md.
// Please verify these codes, especially for newly added languages.
const nameToCodeMap = {
  'afrikaans': 'af', 'albanian': 'sq', 'amharic': 'am', 'arabic': 'ar', 
  'armenian': 'hy', 'assamese': 'as', 'aymara': 'ay', 'azerbaijani': 'az',
  'bambara': 'bm', 'basque': 'eu', 'belarusian': 'be', 'bengali': 'bn',
  'bhojpuri': 'bho', 'bosnian': 'bs', 'bulgarian': 'bg', 'catalan': 'ca',
  'cebuano': 'ceb', 'chichewa': 'ny', 'chinese (simplified)': 'zh-cn',
  'chinese (traditional)': 'zh-tw', 'corsican': 'co', 'croatian': 'hr',
  'czech': 'cs', 'danish': 'da', 'dhivehi': 'dv', 'dogri': 'doi',
  'dutch': 'nl', 'english': 'en', 'esperanto': 'eo', 'estonian': 'et',
  'ewe': 'ee', 'filipino': 'tl', 'finnish': 'fi', 'french': 'fr',
  'frisian': 'fy', 'galician': 'gl', 'georgian': 'ka', 'german': 'de',
  'greek': 'el', 'guarani': 'gn', 'gujarati': 'gu', 'haitian creole': 'ht',
  'hausa': 'ha', 'hawaiian': 'haw', 'hebrew': 'iw', 'hindi': 'hi',
  'hmong': 'hmn', 'hungarian': 'hu', 'icelandic': 'is', 'igbo': 'ig',
  'ilocano': 'ilo', 'indonesian': 'id', 'irish': 'ga', 'italian': 'it',
  'japanese': 'ja', 'javanese': 'jw', 'kannada': 'kn', 'kazakh': 'kk',
  'khmer': 'km', 'kinyarwanda': 'rw', 'konkani': 'gom', 'korean': 'ko',
  'krio': 'kri', 'kurdish (kurmanji)': 'ku', 'kurdish (sorani)': 'ckb',
  'kyrgyz': 'ky', 'lao': 'lo', 'latin': 'la', 'latvian': 'lv',
  'lingala': 'ln', 'lithuanian': 'lt', 'luganda': 'lg', 'luxembourgish': 'lb',
  'macedonian': 'mk', 'maithili': 'mai', 'malagasy': 'mg', 'malay': 'ms',
  'malayalam': 'ml', 'maltese': 'mt', 'maori': 'mi', 'marathi': 'mr',
  'meiteilon (manipuri)': 'mni-mtei', // Or 'mni'. Verify with API.
  'mizo': 'lus', 'mongolian': 'mn', 'myanmar': 'my',
  'nepali': 'ne', 'norwegian': 'no', 'odia (oriya)': 'or', 'oromo': 'om',
  'pashto': 'ps', 'persian': 'fa', 'polish': 'pl', 'portuguese': 'pt',
  'punjabi': 'pa', 'quechua': 'qu', 'romanian': 'ro', 'russian': 'ru',
  'samoan': 'sm', 'sanskrit': 'sa', 'scots gaelic': 'gd', 'sepedi': 'nso',
  'serbian': 'sr', 'sesotho': 'st', 'shona': 'sn', 'sindhi': 'sd',
  'sinhala': 'si', 'slovak': 'sk', 'slovenian': 'sl', 'somali': 'so',
  'spanish': 'es', 'sundanese': 'su', 'swahili': 'sw', 'swedish': 'sv',
  'tajik': 'tg', 'tamil': 'ta', 'tatar': 'tt', 'telugu': 'te',
  'thai': 'th', 'tigrinya': 'ti', 'tsonga': 'ts', 'turkish': 'tr',
  'turkmen': 'tk', 'twi': 'ak', // 'ak' is often used for Akan/Twi. Verify.
  'ukrainian': 'uk', 'urdu': 'ur', 'uyghur': 'ug', 'uzbek': 'uz', 
  'vietnamese': 'vi', 'welsh': 'cy', 'xhosa': 'xh', 'yiddish': 'yi', 
  'yoruba': 'yo', 'zulu': 'zu'
};

export function getCode(desiredLang) {
  if (!desiredLang) {
    return false;
  }
  // Normalize to lowercase to match keys in nameToCodeMap
  const lowerDesiredLang = desiredLang.toLowerCase();
  const code = nameToCodeMap[lowerDesiredLang];

  if (!code) {
    // This warning is helpful during development if a language name from content.js
    // doesn't find a mapping.
    console.warn(`No code found for language name: "${desiredLang}" (tried "${lowerDesiredLang}"). Check 'nameToCodeMap' in copilot/languages.js.`);
    return false;
  }
  return code;
}

// Sanity check: Ensure all actualAvailableLanguages have a mapping.
// This runs when the module is first loaded.
actualAvailableLanguages.forEach(langName => {
  // Ensure the lookup key is also lowercase, matching how nameToCodeMap is defined.
  if (!nameToCodeMap[langName.toLowerCase()]) { 
    console.warn(`Language "${langName}" from actualAvailableLanguages is missing in nameToCodeMap or has a casing mismatch.`);
  }
});
