import type { TerrainLayout } from '../terrain/types';

export function serializeLayoutToURL(layout: TerrainLayout): string {
  const data = {
    w: layout.widthInches,
    h: layout.heightInches,
    d: layout.deploymentDepthInches,
    p: layout.pieces.map((piece) => ({
      i: piece.id,
      t: piece.templateId,
      n: piece.name,
      c: piece.color,
      tr: piece.traits,
      x: piece.x,
      y: piece.y,
      r: piece.rotation,
      s: piece.shape,
      cr: piece.collisionRadius,
    })),
  };

  const json = JSON.stringify(data);
  const encoded = btoa(json);
  return `#layout=${encodeURIComponent(encoded)}`;
}

export function deserializeLayoutFromURL(hash: string): TerrainLayout | null {
  if (!hash.startsWith('#layout=')) return null;

  try {
    const encoded = decodeURIComponent(hash.slice(8));
    const json = atob(encoded);
    const data = JSON.parse(json);

    return {
      widthInches: data.w,
      heightInches: data.h,
      deploymentDepthInches: data.d,
      targetPieceCount: data.p.length,
      quarterTargets: [0, 0, 0, 0],
      pieces: data.p.map((piece: any) => ({
        id: piece.i,
        templateId: piece.t,
        name: piece.n,
        color: piece.c,
        traits: piece.tr,
        x: piece.x,
        y: piece.y,
        rotation: piece.r,
        shape: piece.s,
        collisionRadius: piece.cr,
      })),
    };
  } catch {
    return null;
  }
}
