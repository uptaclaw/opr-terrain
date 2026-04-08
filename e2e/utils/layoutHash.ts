export const encodeLayoutHash = (layout: unknown) =>
  Buffer.from(JSON.stringify(layout), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
