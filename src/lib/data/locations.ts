// src/lib/data/locations.ts

export interface LocationData {
  name: string;
  code: string;
}

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

// ユーティリティ関数
export const findLocationByCode = (code: string, useEnglish: boolean = false): LocationData | undefined => {
  const regions = useEnglish ? allNorthAmericanRegionsEnglish : allNorthAmericanRegions;
  return regions.find(region => region.code === code);
};

export const getStatesByCountry = (country: 'US' | 'CA', useEnglish: boolean = false): LocationData[] => {
  if (country === 'US') {
    return useEnglish ? usStatesEnglish : usStates;
  } else {
    return useEnglish ? canadianProvincesEnglish : canadianProvinces;
  }
};