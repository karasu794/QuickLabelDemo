// src/lib/data/locations.ts
import { countries } from 'countries-list';

// 型定義
export interface LocationData {
  name: string;
  code: string;
}

// 国選択用のオプション型
export interface CountryOption {
  value: string;
  label: string;
}

// 主要国の日本語名マップ
const japaneseNames: { [key: string]: string } = {
  'JP': '日本',
  'US': 'アメリカ合衆国',
  'CN': '中国',
  'KR': '韓国',
  'TW': '台湾',
  'HK': '香港',
  'SG': 'シンガポール',
  'TH': 'タイ',
  'VN': 'ベトナム',
  'MY': 'マレーシア',
  'PH': 'フィリピン',
  'ID': 'インドネシア',
  'AU': 'オーストラリア',
  'NZ': 'ニュージーランド',
  'GB': 'イギリス',
  'DE': 'ドイツ',
  'FR': 'フランス',
  'IT': 'イタリア',
  'ES': 'スペイン',
  'NL': 'オランダ',
  'BE': 'ベルギー',
  'CH': 'スイス',
  'AT': 'オーストリア',
  'SE': 'スウェーデン',
  'NO': 'ノルウェー',
  'DK': 'デンマーク',
  'FI': 'フィンランド',
  'CA': 'カナダ',
  'RU': 'ロシア',
  'IN': 'インド',
  'BR': 'ブラジル',
  'MX': 'メキシコ',
  'AR': 'アルゼンチン',
  'CL': 'チリ',
  'CO': 'コロンビア',
  'PE': 'ペルー',
  'VE': 'ベネズエラ',
  'UY': 'ウルグアイ',
  'PY': 'パラグアイ',
  'BO': 'ボリビア',
  'EC': 'エクアドル',
  'GY': 'ガイアナ',
  'SR': 'スリナム',
  'FK': 'フォークランド諸島',
  'GF': 'フランス領ギアナ',
  'ZA': '南アフリカ',
  'EG': 'エジプト',
  'MA': 'モロッコ',
  'NG': 'ナイジェリア',
  'KE': 'ケニア',
  'ET': 'エチオピア',
  'GH': 'ガーナ',
  'CI': 'コートジボワール',
  'CM': 'カメルーン',
  'UG': 'ウガンダ',
  'TZ': 'タンザニア',
  'AO': 'アンゴラ',
  'MG': 'マダガスカル',
  'MZ': 'モザンビーク',
  'ZM': 'ザンビア',
  'ZW': 'ジンバブエ',
  'BW': 'ボツワナ',
  'NA': 'ナミビア',
  'SZ': 'スワジランド',
  'LS': 'レソト',
  'MW': 'マラウイ',
  'TR': 'トルコ',
  'IL': 'イスラエル',
  'SA': 'サウジアラビア',
  'AE': 'アラブ首長国連邦',
  'QA': 'カタール',
  'KW': 'クウェート',
  'BH': 'バーレーン',
  'OM': 'オマーン',
  'JO': 'ヨルダン',
  'LB': 'レバノン',
  'SY': 'シリア',
  'IQ': 'イラク',
  'IR': 'イラン',
  'AF': 'アフガニスタン',
  'PK': 'パキスタン',
  'BD': 'バングラデシュ',
  'LK': 'スリランカ',
  'MV': 'モルディブ',
  'NP': 'ネパール',
  'BT': 'ブータン',
  'MM': 'ミャンマー',
  'LA': 'ラオス',
  'KH': 'カンボジア',
  'MN': 'モンゴル',
  'KZ': 'カザフスタン',
  'KG': 'キルギス',
  'TJ': 'タジキスタン',
  'TM': 'トルクメニスタン',
  'UZ': 'ウズベキスタン',
  'GE': 'ジョージア',
  'AM': 'アルメニア',
  'AZ': 'アゼルバイジャン',
  'BY': 'ベラルーシ',
  'UA': 'ウクライナ',
  'MD': 'モルドバ',
  'RO': 'ルーマニア',
  'BG': 'ブルガリア',
  'RS': 'セルビア',
  'ME': 'モンテネグロ',
  'BA': 'ボスニア・ヘルツェゴビナ',
  'HR': 'クロアチア',
  'SI': 'スロベニア',
  'SK': 'スロバキア',
  'CZ': 'チェコ',
  'PL': 'ポーランド',
  'HU': 'ハンガリー',
  'LT': 'リトアニア',
  'LV': 'ラトビア',
  'EE': 'エストニア',
  'IE': 'アイルランド',
  'PT': 'ポルトガル',
  'GR': 'ギリシャ',
  'CY': 'キプロス',
  'MT': 'マルタ',
  'LU': 'ルクセンブルク',
  'LI': 'リヒテンシュタイン',
  'MC': 'モナコ',
  'AD': 'アンドラ',
  'SM': 'サンマリノ',
  'VA': 'バチカン',
  'IS': 'アイスランド',
  'AL': 'アルバニア',
  'MK': '北マケドニア',
  'XK': 'コソボ'
};

// 統一された国選択リスト生成関数（日本語名 (国コード) 形式）
export const getCountryOptions = (): CountryOption[] => {
  // 人気国を上位に表示
  const popularCountries = ['JP', 'US', 'CN', 'KR', 'TW', 'HK', 'SG', 'TH', 'VN', 'MY', 'PH', 'ID', 'AU', 'NZ', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'CA'];
  
  const allCountryOptions = Object.entries(countries).map(([code, country]) => {
    const name = japaneseNames[code] || country.name; // 日本語名があれば使い、なければ英語名
    return {
      value: code,
      label: `${name} (${code})`,
    };
  });

  // 人気国を先頭に配置
  const popular = allCountryOptions.filter(country => popularCountries.includes(country.value));
  const others = allCountryOptions.filter(country => !popularCountries.includes(country.value));
  
  // 人気国は定義順、その他はアルファベット順
  others.sort((a, b) => a.label.localeCompare(b.label, 'ja'));
  
  return [...popular, ...others];
};

// 日本語国名を含む国リスト生成関数
export const getAllCountryOptionsJapanese = (): CountryOption[] => {
  const japaneseNames: Record<string, string> = {
    'JP': '日本',
    'US': 'アメリカ合衆国',
    'CN': '中国',
    'KR': '韓国',
    'TW': '台湾',
    'HK': '香港',
    'SG': 'シンガポール',
    'TH': 'タイ',
    'VN': 'ベトナム',
    'MY': 'マレーシア',
    'PH': 'フィリピン',
    'ID': 'インドネシア',
    'AU': 'オーストラリア',
    'NZ': 'ニュージーランド',
    'GB': 'イギリス',
    'DE': 'ドイツ',
    'FR': 'フランス',
    'IT': 'イタリア',
    'ES': 'スペイン',
    'NL': 'オランダ',
    'BE': 'ベルギー',
    'CH': 'スイス',
    'AT': 'オーストリア',
    'SE': 'スウェーデン',
    'NO': 'ノルウェー',
    'DK': 'デンマーク',
    'FI': 'フィンランド',
    'CA': 'カナダ',
    'RU': 'ロシア',
    'IN': 'インド',
    'BR': 'ブラジル',
    'MX': 'メキシコ',
    'AR': 'アルゼンチン',
    'CL': 'チリ',
    'CO': 'コロンビア',
    'PE': 'ペルー',
    'VE': 'ベネズエラ',
    'UY': 'ウルグアイ',
    'PY': 'パラグアイ',
    'BO': 'ボリビア',
    'EC': 'エクアドル',
    'GY': 'ガイアナ',
    'SR': 'スリナム',
    'FK': 'フォークランド諸島',
    'GF': 'フランス領ギアナ',
    'ZA': '南アフリカ',
    'EG': 'エジプト',
    'MA': 'モロッコ',
    'NG': 'ナイジェリア',
    'KE': 'ケニア',
    'ET': 'エチオピア',
    'GH': 'ガーナ',
    'CI': 'コートジボワール',
    'CM': 'カメルーン',
    'UG': 'ウガンダ',
    'TZ': 'タンザニア',
    'AO': 'アンゴラ',
    'MG': 'マダガスカル',
    'MZ': 'モザンビーク',
    'ZM': 'ザンビア',
    'ZW': 'ジンバブエ',
    'BW': 'ボツワナ',
    'NA': 'ナミビア',
    'SZ': 'スワジランド',
    'LS': 'レソト',
    'MW': 'マラウイ',
    'TR': 'トルコ',
    'IL': 'イスラエル',
    'SA': 'サウジアラビア',
    'AE': 'アラブ首長国連邦',
    'QA': 'カタール',
    'KW': 'クウェート',
    'BH': 'バーレーン',
    'OM': 'オマーン',
    'JO': 'ヨルダン',
    'LB': 'レバノン',
    'SY': 'シリア',
    'IQ': 'イラク',
    'IR': 'イラン',
    'AF': 'アフガニスタン',
    'PK': 'パキスタン',
    'BD': 'バングラデシュ',
    'LK': 'スリランカ',
    'MV': 'モルディブ',
    'NP': 'ネパール',
    'BT': 'ブータン',
    'MM': 'ミャンマー',
    'LA': 'ラオス',
    'KH': 'カンボジア',
    'MN': 'モンゴル',
    'KZ': 'カザフスタン',
    'KG': 'キルギス',
    'TJ': 'タジキスタン',
    'TM': 'トルクメニスタン',
    'UZ': 'ウズベキスタン',
    'GE': 'ジョージア',
    'AM': 'アルメニア',
    'AZ': 'アゼルバイジャン',
    'BY': 'ベラルーシ',
    'UA': 'ウクライナ',
    'MD': 'モルドバ',
    'RO': 'ルーマニア',
    'BG': 'ブルガリア',
    'RS': 'セルビア',
    'ME': 'モンテネグロ',
    'BA': 'ボスニア・ヘルツェゴビナ',
    'HR': 'クロアチア',
    'SI': 'スロベニア',
    'SK': 'スロバキア',
    'CZ': 'チェコ',
    'PL': 'ポーランド',
    'HU': 'ハンガリー',
    'LT': 'リトアニア',
    'LV': 'ラトビア',
    'EE': 'エストニア',
    'IE': 'アイルランド',
    'PT': 'ポルトガル',
    'GR': 'ギリシャ',
    'CY': 'キプロス',
    'MT': 'マルタ',
    'LU': 'ルクセンブルク',
    'LI': 'リヒテンシュタイン',
    'MC': 'モナコ',
    'AD': 'アンドラ',
    'SM': 'サンマリノ',
    'VA': 'バチカン',
    'IS': 'アイスランド',
    'AL': 'アルバニア',
    'MK': '北マケドニア',
    'XK': 'コソボ'
  };

  return Object.entries(countries)
    .map(([code, country]) => ({
      value: code,
      label: japaneseNames[code] || country.name
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ja'));
};

// 人気国を上位に表示する関数
export const getPopularCountryOptions = (): CountryOption[] => {
  const popularCountries = ['JP', 'US', 'CN', 'KR', 'TW', 'HK', 'SG', 'TH', 'VN', 'MY', 'PH', 'ID', 'AU', 'NZ', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'CA'];
  const allCountries = getAllCountryOptionsJapanese();
  
  const popular = allCountries.filter(country => popularCountries.includes(country.value));
  const others = allCountries.filter(country => !popularCountries.includes(country.value));
  
  return [...popular, ...others];
};

export const usStates: LocationData[] = [
  { name: 'アラバマ州', code: 'AL' },
  { name: 'アラスカ州', code: 'AK' },
  { name: 'アリゾナ州', code: 'AZ' },
  { name: 'アーカンソー州', code: 'AR' },
  { name: 'カリフォルニア州', code: 'CA' },
  { name: 'コロラド州', code: 'CO' },
  { name: 'コネチカット州', code: 'CT' },
  { name: 'デラウェア州', code: 'DE' },
  { name: 'フロリダ州', code: 'FL' },
  { name: 'ジョージア州', code: 'GA' },
  { name: 'ハワイ州', code: 'HI' },
  { name: 'アイダホ州', code: 'ID' },
  { name: 'イリノイ州', code: 'IL' },
  { name: 'インディアナ州', code: 'IN' },
  { name: 'アイオワ州', code: 'IA' },
  { name: 'カンザス州', code: 'KS' },
  { name: 'ケンタッキー州', code: 'KY' },
  { name: 'ルイジアナ州', code: 'LA' },
  { name: 'メイン州', code: 'ME' },
  { name: 'メリーランド州', code: 'MD' },
  { name: 'マサチューセッツ州', code: 'MA' },
  { name: 'ミシガン州', code: 'MI' },
  { name: 'ミネソタ州', code: 'MN' },
  { name: 'ミシシッピ州', code: 'MS' },
  { name: 'ミズーリ州', code: 'MO' },
  { name: 'モンタナ州', code: 'MT' },
  { name: 'ネブラスカ州', code: 'NE' },
  { name: 'ネバダ州', code: 'NV' },
  { name: 'ニューハンプシャー州', code: 'NH' },
  { name: 'ニュージャージー州', code: 'NJ' },
  { name: 'ニューメキシコ州', code: 'NM' },
  { name: 'ニューヨーク州', code: 'NY' },
  { name: 'ノースカロライナ州', code: 'NC' },
  { name: 'ノースダコタ州', code: 'ND' },
  { name: 'オハイオ州', code: 'OH' },
  { name: 'オクラホマ州', code: 'OK' },
  { name: 'オレゴン州', code: 'OR' },
  { name: 'ペンシルベニア州', code: 'PA' },
  { name: 'ロードアイランド州', code: 'RI' },
  { name: 'サウスカロライナ州', code: 'SC' },
  { name: 'サウスダコタ州', code: 'SD' },
  { name: 'テネシー州', code: 'TN' },
  { name: 'テキサス州', code: 'TX' },
  { name: 'ユタ州', code: 'UT' },
  { name: 'バーモント州', code: 'VT' },
  { name: 'バージニア州', code: 'VA' },
  { name: 'ワシントン州', code: 'WA' },
  { name: 'ウェストバージニア州', code: 'WV' },
  { name: 'ウィスコンシン州', code: 'WI' },
  { name: 'ワイオミング州', code: 'WY' }
];

export const canadianProvinces: LocationData[] = [
  { name: 'アルバータ州', code: 'AB' },
  { name: 'ブリティッシュコロンビア州', code: 'BC' },
  { name: 'マニトバ州', code: 'MB' },
  { name: 'ニューブランズウィック州', code: 'NB' },
  { name: 'ニューファンドランド・ラブラドール州', code: 'NL' },
  { name: 'ノースウエスト準州', code: 'NT' },
  { name: 'ノバスコシア州', code: 'NS' },
  { name: 'ヌナブト準州', code: 'NU' },
  { name: 'オンタリオ州', code: 'ON' },
  { name: 'プリンスエドワードアイランド州', code: 'PE' },
  { name: 'ケベック州', code: 'QC' },
  { name: 'サスカチュワン州', code: 'SK' },
  { name: 'ユーコン準州', code: 'YT' }
];

export const japanesePrefectures: LocationData[] = [
  { name: '北海道', code: 'Hokkaido' },
  { name: '青森県', code: 'Aomori' },
  { name: '岩手県', code: 'Iwate' },
  { name: '宮城県', code: 'Miyagi' },
  { name: '秋田県', code: 'Akita' },
  { name: '山形県', code: 'Yamagata' },
  { name: '福島県', code: 'Fukushima' },
  { name: '茨城県', code: 'Ibaraki' },
  { name: '栃木県', code: 'Tochigi' },
  { name: '群馬県', code: 'Gunma' },
  { name: '埼玉県', code: 'Saitama' },
  { name: '千葉県', code: 'Chiba' },
  { name: '東京都', code: 'Tokyo' },
  { name: '神奈川県', code: 'Kanagawa' },
  { name: '新潟県', code: 'Niigata' },
  { name: '富山県', code: 'Toyama' },
  { name: '石川県', code: 'Ishikawa' },
  { name: '福井県', code: 'Fukui' },
  { name: '山梨県', code: 'Yamanashi' },
  { name: '長野県', code: 'Nagano' },
  { name: '岐阜県', code: 'Gifu' },
  { name: '静岡県', code: 'Shizuoka' },
  { name: '愛知県', code: 'Aichi' },
  { name: '三重県', code: 'Mie' },
  { name: '滋賀県', code: 'Shiga' },
  { name: '京都府', code: 'Kyoto' },
  { name: '大阪府', code: 'Osaka' },
  { name: '兵庫県', code: 'Hyogo' },
  { name: '奈良県', code: 'Nara' },
  { name: '和歌山県', code: 'Wakayama' },
  { name: '鳥取県', code: 'Tottori' },
  { name: '島根県', code: 'Shimane' },
  { name: '岡山県', code: 'Okayama' },
  { name: '広島県', code: 'Hiroshima' },
  { name: '山口県', code: 'Yamaguchi' },
  { name: '徳島県', code: 'Tokushima' },
  { name: '香川県', code: 'Kagawa' },
  { name: '愛媛県', code: 'Ehime' },
  { name: '高知県', code: 'Kochi' },
  { name: '福岡県', code: 'Fukuoka' },
  { name: '佐賀県', code: 'Saga' },
  { name: '長崎県', code: 'Nagasaki' },
  { name: '熊本県', code: 'Kumamoto' },
  { name: '大分県', code: 'Oita' },
  { name: '宮崎県', code: 'Miyazaki' },
  { name: '鹿児島県', code: 'Kagoshima' },
  { name: '沖縄県', code: 'Okinawa' }
];

// 英語版も提供
export const usStatesEnglish: LocationData[] = [
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' }
];

export const canadianProvincesEnglish: LocationData[] = [
  { name: 'Alberta', code: 'AB' },
  { name: 'British Columbia', code: 'BC' },
  { name: 'Manitoba', code: 'MB' },
  { name: 'New Brunswick', code: 'NB' },
  { name: 'Newfoundland and Labrador', code: 'NL' },
  { name: 'Northwest Territories', code: 'NT' },
  { name: 'Nova Scotia', code: 'NS' },
  { name: 'Nunavut', code: 'NU' },
  { name: 'Ontario', code: 'ON' },
  { name: 'Prince Edward Island', code: 'PE' },
  { name: 'Quebec', code: 'QC' },
  { name: 'Saskatchewan', code: 'SK' },
  { name: 'Yukon', code: 'YT' }
];

// 全ての地域を結合したリスト
export const allNorthAmericanRegions: LocationData[] = [
  ...usStates,
  ...canadianProvinces
];

export const allNorthAmericanRegionsEnglish: LocationData[] = [
  ...usStatesEnglish,
  ...canadianProvincesEnglish
];

// 全ての地域（日本含む）を結合したリスト
export const allRegions: LocationData[] = [
  ...usStates,
  ...canadianProvinces,
  ...japanesePrefectures
];

// 英語県コードから日本語県名への変換マップ
const englishToJapanesePrefectureMap: { [key: string]: string } = {
  'Hokkaido': '北海道',
  'Aomori': '青森県',
  'Iwate': '岩手県',
  'Miyagi': '宮城県',
  'Akita': '秋田県',
  'Yamagata': '山形県',
  'Fukushima': '福島県',
  'Ibaraki': '茨城県',
  'Tochigi': '栃木県',
  'Gunma': '群馬県',
  'Saitama': '埼玉県',
  'Chiba': '千葉県',
  'Tokyo': '東京都',
  'Kanagawa': '神奈川県',
  'Niigata': '新潟県',
  'Toyama': '富山県',
  'Ishikawa': '石川県',
  'Fukui': '福井県',
  'Yamanashi': '山梨県',
  'Nagano': '長野県',
  'Gifu': '岐阜県',
  'Shizuoka': '静岡県',
  'Aichi': '愛知県',
  'Mie': '三重県',
  'Shiga': '滋賀県',
  'Kyoto': '京都府',
  'Osaka': '大阪府',
  'Hyogo': '兵庫県',
  'Nara': '奈良県',
  'Wakayama': '和歌山県',
  'Tottori': '鳥取県',
  'Shimane': '島根県',
  'Okayama': '岡山県',
  'Hiroshima': '広島県',
  'Yamaguchi': '山口県',
  'Tokushima': '徳島県',
  'Kagawa': '香川県',
  'Ehime': '愛媛県',
  'Kochi': '高知県',
  'Fukuoka': '福岡県',
  'Saga': '佐賀県',
  'Nagasaki': '長崎県',
  'Kumamoto': '熊本県',
  'Oita': '大分県',
  'Miyazaki': '宮崎県',
  'Kagoshima': '鹿児島県',
  'Okinawa': '沖縄県'
};

// 英語県コードから日本語県名への変換関数
export const convertEnglishPrefectureToJapanese = (englishCode: string): string => {
  return englishToJapanesePrefectureMap[englishCode] || englishCode;
};

// ユーティリティ関数
export const findLocationByCode = (code: string, useEnglish: boolean = false): LocationData | undefined => {
  const regions = useEnglish ? allNorthAmericanRegionsEnglish : allNorthAmericanRegions;
  return regions.find(region => region.code === code);
};

export const getStatesByCountry = (country: 'US' | 'CA' | 'JP', useEnglish: boolean = false): LocationData[] => {
  if (country === 'US') {
    return useEnglish ? usStatesEnglish : usStates;
  } else if (country === 'CA') {
    return useEnglish ? canadianProvincesEnglish : canadianProvinces;
  } else {
    return japanesePrefectures;
  }
};