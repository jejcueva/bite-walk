import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export const size = {
  width: 1200,
  height: 600,
};

export const contentType = 'image/png';

export default async function TwitterImage() {
  const logoPath = path.join(
    process.cwd(),
    '..',
    '..',
    'assets',
    'images',
    'LOGO.png',
  );

  const logo = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        <img
          src={logoSrc}
          width={400}
          height={400}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    size,
  );
}

