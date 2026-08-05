/**
 * iOS PWA startup images (apple-touch-startup-image).
 * Media queries must match device CSS points + -webkit-device-pixel-ratio exactly.
 * Portrait-only — rally locks orientation.
 */
export type IosSplash = {
  /** File under /splash/ */
  file: string;
  /** Physical px */
  width: number;
  height: number;
  deviceWidth: number;
  deviceHeight: number;
  dpr: number;
};

export const IOS_SPLASHES: readonly IosSplash[] = [
  // iPhone SE (2nd/3rd), 8
  { file: "750x1334.png", width: 750, height: 1334, deviceWidth: 375, deviceHeight: 667, dpr: 2 },
  // iPhone 8 Plus
  { file: "1242x2208.png", width: 1242, height: 2208, deviceWidth: 414, deviceHeight: 736, dpr: 3 },
  // iPhone X / XS / 11 Pro / 12–13 mini
  { file: "1125x2436.png", width: 1125, height: 2436, deviceWidth: 375, deviceHeight: 812, dpr: 3 },
  // iPhone XR / 11
  { file: "828x1792.png", width: 828, height: 1792, deviceWidth: 414, deviceHeight: 896, dpr: 2 },
  // iPhone XS Max / 11 Pro Max
  { file: "1242x2688.png", width: 1242, height: 2688, deviceWidth: 414, deviceHeight: 896, dpr: 3 },
  // iPhone 12/13/14
  { file: "1170x2532.png", width: 1170, height: 2532, deviceWidth: 390, deviceHeight: 844, dpr: 3 },
  // iPhone 12/13/14 Pro Max, 14 Plus
  { file: "1284x2778.png", width: 1284, height: 2778, deviceWidth: 428, deviceHeight: 926, dpr: 3 },
  // iPhone 14 Pro / 15 / 15 Pro / 16
  { file: "1179x2556.png", width: 1179, height: 2556, deviceWidth: 393, deviceHeight: 852, dpr: 3 },
  // iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  { file: "1290x2796.png", width: 1290, height: 2796, deviceWidth: 430, deviceHeight: 932, dpr: 3 },
  // iPhone 16 Pro
  { file: "1206x2622.png", width: 1206, height: 2622, deviceWidth: 402, deviceHeight: 874, dpr: 3 },
  // iPhone 16 Pro Max
  { file: "1320x2868.png", width: 1320, height: 2868, deviceWidth: 440, deviceHeight: 956, dpr: 3 },
] as const;

export function iosSplashMedia(s: IosSplash): string {
  // `screen and` improves match reliability on Safari / iOS PWAs.
  return (
    `screen and (device-width: ${s.deviceWidth}px) and (device-height: ${s.deviceHeight}px) ` +
    `and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`
  );
}

export function iosSplashMetadata() {
  return IOS_SPLASHES.map((s) => ({
    url: `/splash/${s.file}`,
    media: iosSplashMedia(s),
  }));
}
