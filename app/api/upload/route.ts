import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { requireApproved } from '@/lib/session';
import { setPhoto } from '@/lib/queries/members';
import { randomToken } from '@/lib/crypto';

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};

/**
 * Avatar upload, straight to local disk.
 *
 * DEPLOYMENT NOTE: this writes to public/uploads, which works on a VPS or any
 * host with a persistent disk. It does NOT work on Vercel or similar
 * serverless hosts, where the filesystem is ephemeral and resets on every
 * deploy. If you deploy there, swap the writeFile call for an S3 / R2 /
 * Cloudinary upload. Nothing else in this file changes.
 */
export async function POST(request: Request) {
  const me = await requireApproved();

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }

  // Trust the sniffed type, not the filename. An attacker controls the name.
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: 'Use a JPEG, PNG, or WebP image.' }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That image is larger than 3 MB.' }, { status: 400 });
  }

  const dir = join(process.cwd(), 'public', 'uploads', 'avatars');
  await mkdir(dir, { recursive: true });

  // Random filename: predictable names let people guess at other members' files.
  const name = `${me.id}-${randomToken(8)}.${ext}`;
  await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));

  const url = `/uploads/avatars/${name}`;
  await setPhoto(me.id, url);

  return NextResponse.json({ url });
}
