const DOTA_FINDING_MATCH_LABELS: Readonly<Record<string, string>> = {
  'cs-CZ': 'Vyhledávání zápasu',
  'da-DK': 'Finder kamp',
  'de-DE': 'Partie wird gesucht',
  'el-GR': 'Εύρεση παιχνιδιού',
  en: 'Finding Match',
  'es-ES': 'Buscando partida',
  'fi-FI': 'Etsitään peliä',
  'fr-FR': 'Recherche de match',
  'hu-HU': 'Játékkeresés',
  'it-IT': 'In cerca di una partita',
  'ja-JP': 'マッチを検索する',
  'ko-KR': '매치 찾는 중',
  'nl-NL': 'Match zoeken',
  'no-NO': 'Finner kamp',
  'pl-PL': 'Szukanie meczu',
  'pt-BR': 'Buscando partida',
  'pt-PT': 'A procurar',
  'ro-RO': 'Se caută meci',
  'ru-RU': 'Поиск игры',
  'sv-SE': 'Söker match',
  'th-TH': 'กำลังค้นหาแมตช์',
  'tr-TR': 'Maç Aranıyor',
  'uk-UA': 'Пошук матчу',
  'vi-VN': 'Đang tìm trận',
  'zh-CN': '寻找比赛',
  'zh-TW': '搜尋比賽中',
}

export function getDotaFindingMatchLabel(locale?: string | null): string {
  return (locale && DOTA_FINDING_MATCH_LABELS[locale]) || DOTA_FINDING_MATCH_LABELS.en
}
