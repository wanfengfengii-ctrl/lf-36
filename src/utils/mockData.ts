import type { Scheme, Fragment } from '../types';
import { generateId, generateSchemeId } from './geometry';

function createMockFragment(
  schemeId: string,
  fragmentNo: number,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: number = 0
): Fragment {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${color}" stroke="#8B7355" stroke-width="3"/>
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="#A0826D" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="${w / 2}" y="${h / 2 - 10}" text-anchor="middle" font-family="serif" font-size="28" fill="#3E2723" font-weight="bold">#${fragmentNo}</text>
  <text x="${w / 2}" y="${h / 2 + 24}" text-anchor="middle" font-family="serif" font-size="14" fill="#5D4037">古地图碎片</text>
  <path d="M 20 ${h - 30} Q ${w / 4} ${h - 50} ${w / 2} ${h - 35} T ${w - 20} ${h - 40}" fill="none" stroke="#6D4C41" stroke-width="2" opacity="0.5"/>
  <path d="M 30 40 L ${w - 30} 60" fill="none" stroke="#8D6E63" stroke-width="1" opacity="0.3"/>
  <circle cx="${w * 0.3}" cy="${h * 0.3}" r="8" fill="#D7CCC8" opacity="0.6"/>
  <circle cx="${w * 0.7}" cy="${h * 0.6}" r="12" fill="#D7CCC8" opacity="0.4"/>
</svg>`.trim();
  const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));

  return {
    id: generateId(),
    schemeId,
    fragmentNo,
    imageSrc: src,
    originalWidth: w,
    originalHeight: h,
    x,
    y,
    rotation,
    opacity: 1,
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
    locked: false,
    aligned: false,
    zIndex: fragmentNo,
  };
}

export function createMockScheme(): Scheme {
  const schemeId = generateSchemeId();
  const now = Date.now();

  const fragments: Fragment[] = [
    createMockFragment(schemeId, 1, '#E8DCC4', -250, -150, 300, 250, -3),
    createMockFragment(schemeId, 2, '#F0E6D0', 80, -160, 320, 240, 2),
    createMockFragment(schemeId, 3, '#E5D8BE', -240, 130, 280, 220, 1),
    createMockFragment(schemeId, 4, '#EBD9C0', 90, 140, 310, 230, -2),
    createMockFragment(schemeId, 5, '#F2E4CC', -80, 0, 200, 180, 0),
  ];

  const fragmentMap: Record<string, Fragment> = {};
  const fragmentOrder: string[] = [];
  fragments.forEach((f) => {
    fragmentMap[f.id] = f;
    fragmentOrder.push(f.id);
  });

  return {
    id: schemeId,
    name: '敦煌残卷拼接方案 #001',
    createdAt: now,
    updatedAt: now,
    fragmentMap,
    fragmentOrder,
  };
}

export function createEmptyScheme(name?: string): Scheme {
  const now = Date.now();
  return {
    id: generateSchemeId(),
    name: name || `新建方案 ${new Date(now).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
    createdAt: now,
    updatedAt: now,
    fragmentMap: {},
    fragmentOrder: [],
  };
}
