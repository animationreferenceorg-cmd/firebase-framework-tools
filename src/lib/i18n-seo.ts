/**
 * International SEO locales & client-side local currency estimation helpers.
 * Covers the top global animation markets: EN, ES, JA, PT, FR, KO, ZH.
 */

export const BASE_URL = 'https://animationreference.org';

export type SeoLocale = 'ja' | 'pt' | 'fr' | 'ko' | 'zh';

export interface LocaleSeoConfig {
  code: SeoLocale;
  ogLocale: string;
  nativeName: string;
  countryHint: string;
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  subtitle: string;
  browseCta: string;
  categoriesCta: string;
  proCta: string;
  proBannerTitle: string;
  proBannerDesc: string;
  featuredHeading: string;
  trustBadge: string;
}

export const SEO_LOCALES: Record<SeoLocale, LocaleSeoConfig> = {
  ja: {
    code: 'ja',
    ogLocale: 'ja_JP',
    nativeName: '日本語',
    countryHint: 'Japan',
    title: '無料アニメーションリファレンス | コマ送り再生・ポートフォリオ',
    description:
      '数千本のアニメーション参考動画・歩行サイクル・戦闘アクション・演技リファレンスをコマ送りで研究。Maya・Blender・2D/3Dアニメーターのための無料リファレンスライブラリ。',
    keywords: [
      'アニメーション リファレンス',
      'アニメーション 参考動画',
      '作画 参考',
      '歩行サイクル リファレンス',
      '3DCG アニメーション 参考',
      'コマ送り 再生',
    ],
    h1: '無料アニメーションリファレンス',
    subtitle:
      '数千本のモーション参考クリップをタグ別に整理。ボディメカニクス、演技、戦闘、歩行サイクルをコマ送りで研究できます。',
    browseCta: 'すべてのタグを見る',
    categoriesCta: 'カテゴリーから探す',
    proCta: 'Pro 初月 $1 で試す',
    proBannerTitle: '世界中のアニメーターに選ばれています',
    proBannerDesc:
      'Proプラン（初月$1・約¥150）で無制限リファレンス視聴、24FPS MP4ダウンロード、非公開ボード、プレイブラスト比較を解放。JCB・Visa・Mastercard・Apple Pay対応。',
    featuredHeading: '注目のリファレンスクリップ',
    trustBadge: 'Stripe安全決済・日本円カード対応・いつでも解約可能',
  },
  pt: {
    code: 'pt',
    ogLocale: 'pt_BR',
    nativeName: 'Português',
    countryHint: 'Brazil / Portugal',
    title: 'Referências de Animação Grátis | Player Quadro a Quadro',
    description:
      'Estude milhares de vídeos de referência para animação 2D e 3D quadro a quadro. Ciclos de caminhada, combate, atuação, mecânica corporal e portfólio para animadores.',
    keywords: [
      'referência de animação',
      'referências de animação grátis',
      'ciclo de caminhada referência',
      'animação 3d referência',
      'player quadro a quadro',
    ],
    h1: 'Referências de Animação Grátis',
    subtitle:
      'Milhares de clipes de referência organizados por categoria. Estude mecânica corporal, atuação, combate e locomoção quadro a quadro.',
    browseCta: 'Explorar Todas as Tags',
    categoriesCta: 'Explorar Categorias',
    proCta: 'Testar Pro por $1 no 1º mês',
    proBannerTitle: 'Desbloqueie a biblioteca completa com o Pro',
    proBannerDesc:
      'Comece por apenas $1 (~R$5,50) no primeiro mês. Referências ilimitadas, downloads MP4 24 FPS, quadros privados para projetos sob NDA e comparação de playblast.',
    featuredHeading: 'Clipes em Destaque',
    trustBadge: 'Pagamento seguro via Stripe · Cartões internacionais · Cancele quando quiser',
  },
  fr: {
    code: 'fr',
    ogLocale: 'fr_FR',
    nativeName: 'Français',
    countryHint: 'France / Canada',
    title: 'Références d’Animation Gratuites | Lecteur Image par Image',
    description:
      'Étudiez des milliers de vidéos de référence d’animation 2D et 3D image par image. Cycles de marche, combat, acting, mécanique corporelle et portfolios d’animateurs.',
    keywords: [
      'référence animation',
      'vidéo référence animation 3d',
      'cycle de marche référence',
      'lecteur image par image',
      'acting animation référence',
    ],
    h1: 'Références d’Animation Gratuites',
    subtitle:
      'Des milliers de clips de référence classés par thème. Analysez la mécanique corporelle, l’acting, le combat et la locomotion image par image.',
    browseCta: 'Explorer Tous les Tags',
    categoriesCta: 'Parcourir les Catégories',
    proCta: 'Essayer Pro à 1 $ le 1er mois',
    proBannerTitle: 'Passez au niveau studio avec Pro',
    proBannerDesc:
      '1 $ (~0,92 €) le premier mois. Références illimitées, téléchargements MP4 24 ips, tableaux privés pour projets NDA et comparaison de playblast.',
    featuredHeading: 'Extraits en Vedette',
    trustBadge: 'Paiement sécurisé Stripe · Cartes européennes & Apple Pay · Sans engagement',
  },
  ko: {
    code: 'ko',
    ogLocale: 'ko_KR',
    nativeName: '한국어',
    countryHint: 'South Korea',
    title: '무료 애니메이션 레퍼런스 | 프레임 단위 재생 및 포트폴리오',
    description:
      '수천 개의 2D/3D 애니메이션 모션 레퍼런스를 프레임 단위로 분석하세요. 걷기 사이클, 액션, 연기, 바디 메카닉 및 애니메이터 포트폴리오.',
    keywords: [
      '애니메이션 레퍼런스',
      '애니메이션 참고 영상',
      '걷기 사이클 레퍼런스',
      '3D 애니메이션 레퍼런스',
      '프레임 단위 재생기',
    ],
    h1: '무료 애니메이션 레퍼런스',
    subtitle:
      '수천 개의 모션 레퍼런스 클립을 태그별로 탐색하세요. 바디 메카닉, 연기, 전투 액션을 프레임 단위로 정밀하게 연구할 수 있습니다.',
    browseCta: '모든 태그 보기',
    categoriesCta: '카테고리 탐색',
    proCta: '첫 달 $1로 Pro 시작하기',
    proBannerTitle: '실무 애니메이터를 위한 Pro 워크스페이스',
    proBannerDesc:
      '첫 달 $1(약 ₩1,380)로 무제한 레퍼런스 시청, 24FPS MP4 다운로드, 비공개 보드, 플레이블라스트 비교 기능을 이용하세요.',
    featuredHeading: '추천 레퍼런스 클립',
    trustBadge: 'Stripe 보안 결제 · 해외 결제 카드 지원 · 언제든 해지 가능',
  },
  zh: {
    code: 'zh',
    ogLocale: 'zh_CN',
    nativeName: '中文',
    countryHint: 'China / Taiwan / Singapore',
    title: '免费动画参考素材库 | 逐帧播放与动画师作品集',
    description:
      '逐帧学习数千个2D/3D动画运动参考视频。涵盖走路循环、打斗动作、角色表演、肢体力学及动画师作品集。',
    keywords: [
      '动画参考',
      '动画参考视频',
      '走路循环参考',
      '3D动画参考',
      '逐帧播放器',
      '角色表演参考',
    ],
    h1: '免费动画参考素材库',
    subtitle:
      '数千个按标签整理的动画参考片段。免费逐帧研究肢体力学、角色表演、打斗动作与生物运动规律。',
    browseCta: '浏览全部标签',
    categoriesCta: '按分类浏览',
    proCta: '首月 $1 体验 Pro',
    proBannerTitle: '升级 Pro 解锁完整专业动画工作流',
    proBannerDesc:
      '首月仅需 $1（约 ¥7.2）。无限观看参考库、24FPS MP4 下载、私密保密项目参考板及拍屏对比功能。',
    featuredHeading: '精选参考片段',
    trustBadge: 'Stripe 安全支付 · 支持国际信用卡与 Apple Pay · 随时取消',
  },
};

export const HREFLANG_LANGUAGES: Record<string, string> = {
  'x-default': BASE_URL,
  en: BASE_URL,
  es: `${BASE_URL}/es`,
  ja: `${BASE_URL}/lang/ja`,
  pt: `${BASE_URL}/lang/pt`,
  fr: `${BASE_URL}/lang/fr`,
  ko: `${BASE_URL}/lang/ko`,
  zh: `${BASE_URL}/lang/zh`,
};

/**
 * Approximate local currency display for international trust on pricing surfaces.
 * Stripe bills in USD and automatically converts in 135+ local currencies on the buyer's card.
 */
interface LocalCurrencyHint {
  currency: string;
  rateFromUsd: number;
  locale: string;
}

const LOCALE_CURRENCY_MAP: Record<string, LocalCurrencyHint> = {
  'ja': { currency: 'JPY', rateFromUsd: 152, locale: 'ja-JP' },
  'pt-br': { currency: 'BRL', rateFromUsd: 5.7, locale: 'pt-BR' },
  'pt': { currency: 'EUR', rateFromUsd: 0.92, locale: 'pt-PT' },
  'es-mx': { currency: 'MXN', rateFromUsd: 19.8, locale: 'es-MX' },
  'es-ar': { currency: 'USD', rateFromUsd: 1, locale: 'es-AR' },
  'es-co': { currency: 'COP', rateFromUsd: 4200, locale: 'es-CO' },
  'es': { currency: 'EUR', rateFromUsd: 0.92, locale: 'es-ES' },
  'fr-ca': { currency: 'CAD', rateFromUsd: 1.38, locale: 'fr-CA' },
  'fr': { currency: 'EUR', rateFromUsd: 0.92, locale: 'fr-FR' },
  'de': { currency: 'EUR', rateFromUsd: 0.92, locale: 'de-DE' },
  'it': { currency: 'EUR', rateFromUsd: 0.92, locale: 'it-IT' },
  'nl': { currency: 'EUR', rateFromUsd: 0.92, locale: 'nl-NL' },
  'ko': { currency: 'KRW', rateFromUsd: 1380, locale: 'ko-KR' },
  'zh': { currency: 'CNY', rateFromUsd: 7.2, locale: 'zh-CN' },
  'en-gb': { currency: 'GBP', rateFromUsd: 0.78, locale: 'en-GB' },
  'en-ca': { currency: 'CAD', rateFromUsd: 1.38, locale: 'en-CA' },
  'en-au': { currency: 'AUD', rateFromUsd: 1.52, locale: 'en-AU' },
  'en-in': { currency: 'INR', rateFromUsd: 84, locale: 'en-IN' },
  'en-ph': { currency: 'PHP', rateFromUsd: 58, locale: 'en-PH' },
};

export function formatLocalCurrencyEstimate(usdCents: number, browserLocale?: string): string | null {
  if (!browserLocale) return null;
  const norm = browserLocale.toLowerCase();
  if (norm === 'en-us' || norm === 'en') return null;

  const langOnly = norm.split('-')[0];
  const hint = LOCALE_CURRENCY_MAP[norm] || LOCALE_CURRENCY_MAP[langOnly];
  if (!hint || hint.currency === 'USD') return null;

  const amount = (usdCents / 100) * hint.rateFromUsd;
  try {
    const formatted = new Intl.NumberFormat(hint.locale, {
      style: 'currency',
      currency: hint.currency,
      maximumFractionDigits: hint.rateFromUsd >= 50 ? 0 : 2,
    }).format(amount);
    return `≈ ${formatted}`;
  } catch {
    return null;
  }
}
