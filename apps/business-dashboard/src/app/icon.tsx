import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default async function Icon() {
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
          width={512}
          height={512}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    size,
  );
}

