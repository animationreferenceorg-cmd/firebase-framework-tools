// SEO & localization translations for key pages
export const translations = {
  es: {
    tags: {
      title: (name: string, count: number) => `${name} - Referencias de Animación | ${count} Clips`,
      description: (tag: string, count: number) =>
        `Explora ${count} clips de animación de referencia sobre ${tag}. Estudia el timing, espaciado y postura de movimientos reales de ${tag}. Gratis para animadores y desarrolladores.`,
      breadcrumbHome: 'Inicio',
      breadcrumbTags: 'Etiquetas',
      h1: (name: string) => `${name} - Referencias de Animación`,
      description_long: (tag: string, count: number) =>
        `${count} clips de referencia de animación seleccionados sobre ${tag} para animadores, desarrolladores de juegos y diseñadores de movimiento. Abre cualquier clip para reproducción fotograma a fotograma y estudia el timing, espaciado y postura de ${tag}.`,
      relatedTags: 'Etiquetas de Animación Relacionadas',
      previousPage: '← Página Anterior',
      nextPage: 'Siguiente →',
      pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
      searchPlaceholder: 'Buscar categorías y etiquetas...',
      studyTogether: 'a menudo se estudian junto con',
    },
  },
  'pt-BR': {
    tags: {
      title: (name: string, count: number) => `${name} - Referência de Animação | ${count} Clipes`,
      description: (tag: string, count: number) =>
        `Explore ${count} clipes de animação de referência sobre ${tag}. Estude timing, espaçamento e postura de movimentos reais de ${tag}. Gratuito para animadores e desenvolvedores.`,
      breadcrumbHome: 'Início',
      breadcrumbTags: 'Etiquetas',
      h1: (name: string) => `${name} - Referência de Animação`,
    },
  },
  fr: {
    tags: {
      title: (name: string, count: number) => `${name} - Références d'Animation | ${count} Clips`,
      description: (tag: string, count: number) =>
        `Explorez ${count} clips de référence d'animation sur ${tag}. Étudiez le timing, l'espacement et la posture de mouvements réels de ${tag}. Gratuit pour les animateurs et développeurs.`,
      breadcrumbHome: 'Accueil',
      breadcrumbTags: 'Étiquettes',
      h1: (name: string) => `${name} - Référence d'Animation`,
    },
  },
  de: {
    tags: {
      title: (name: string, count: number) => `${name} - Animations-Referenzen | ${count} Clips`,
      description: (tag: string, count: number) =>
        `Erkunden Sie ${count} Animations-Referenz-Clips zu ${tag}. Studieren Sie Timing, Abstände und Positionen echter ${tag}-Bewegungen. Kostenlos für Animatoren und Entwickler.`,
      breadcrumbHome: 'Startseite',
      breadcrumbTags: 'Schlagwörter',
      h1: (name: string) => `${name} - Animations-Referenz`,
    },
  },
  ja: {
    tags: {
      title: (name: string, count: number) => `${name} - アニメーション リファレンス | ${count}クリップ`,
      description: (tag: string, count: number) =>
        `${tag}に関する${count}個のアニメーション参照クリップを探索します。実際の${tag}の動きのタイミング、スペーシング、ポーズを学習します。アニメーターと開発者向けは無料です。`,
      breadcrumbHome: 'ホーム',
      breadcrumbTags: 'タグ',
      h1: (name: string) => `${name} - アニメーション リファレンス`,
    },
  },
  ko: {
    tags: {
      title: (name: string, count: number) => `${name} - 애니메이션 레퍼런스 | ${count}개 클립`,
      description: (tag: string, count: number) =>
        `${tag}에 대한 ${count}개의 애니메이션 레퍼런스 클립을 탐색하세요. 실제 ${tag} 동작의 타이밍, 간격 및 포즈를 학습합니다. 애니메이터 및 개발자는 무료입니다.`,
      breadcrumbHome: '홈',
      breadcrumbTags: '태그',
      h1: (name: string) => `${name} - 애니메이션 레퍼런스`,
    },
  },
};

export type SupportedLocale = keyof typeof translations;

export function getTranslation(locale: SupportedLocale, key: string): any {
  const parts = key.split('.');
  let current: any = translations[locale] || translations['es'];

  for (const part of parts) {
    current = current?.[part];
  }

  return current || key;
}

// Locale-to-language-name mapping for hreflang
export const localeToLanguage: Record<string, string> = {
  es: 'es',
  'es-MX': 'es-MX',
  'es-AR': 'es-AR',
  'pt-BR': 'pt-BR',
  'pt': 'pt',
  fr: 'fr',
  de: 'de',
  ja: 'ja',
  ko: 'ko',
  en: 'en',
};

export const defaultLocale = 'en';
export const supportedLocales: SupportedLocale[] = ['es', 'pt-BR', 'fr', 'de', 'ja', 'ko'];
