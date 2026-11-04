// Kimlik: ruhsat belgesi + gösterge paneli. Kâğıt zemin, grafit mürekkep, tek vurgu amber (ibre/uyarı lambası).
export const palette = {
  light: {
    background: '#F2EEE5',
    card: '#FBF9F4',
    ink: '#23262B',
    muted: '#6E6A62',
    line: '#DDD6C8',
    amber: '#C9821B',
    amberSoft: '#F3E2C4',
    onAmber: '#1B1408',
    sage: '#5E7D63',
    rust: '#A6452E',
    guilloche: '#E3D9C6',
    odometer: '#23262B',
    onOdometer: '#F2EEE5',
  },
  dark: {
    background: '#15171A',
    card: '#1E2125',
    ink: '#ECE7DD',
    muted: '#9C978D',
    line: '#2F3338',
    amber: '#E0A040',
    amberSoft: '#3A2F1E',
    onAmber: '#1B1408',
    sage: '#8DB394',
    rust: '#D9785F',
    guilloche: '#2A2D31',
    odometer: '#ECE7DD',
    onOdometer: '#15171A',
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };

export const fonts = {
  display: 'SairaSemiCondensed_700Bold',
  displayMedium: 'SairaSemiCondensed_600SemiBold',
  body: 'Onest_400Regular',
  bodyMedium: 'Onest_500Medium',
  bodySemi: 'Onest_600SemiBold',
  mono: 'AzeretMono_600SemiBold',
} as const;

export const radius = { card: 16, field: 12, pill: 999 } as const;
