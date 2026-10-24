import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Blog from '@/models/Blog';

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|jpg|png|webp|gif|avif));base64,([\s\S]+)$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new NextResponse('Not found', { status: 404 });
  }

  await connectDB();
  const blog = await Blog.findById(id, 'imageUrl').lean<{ imageUrl?: string } | null>();
  const imageUrl = blog?.imageUrl || '';

  const match = DATA_URL_PATTERN.exec(imageUrl);
  if (!match) {
    // Regular URLs are linked directly by the pages; redirect just in case.
    if (/^(https?:)?\/\//.test(imageUrl) || imageUrl.startsWith('/')) {
      return NextResponse.redirect(new URL(imageUrl, request.url));
    }
    return new NextResponse('Not found', { status: 404 });
  }

  const [, contentType, base64] = match;
  const body = Buffer.from(base64, 'base64');

  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType === 'image/jpg' ? 'image/jpeg' : contentType,
      'Content-Length': String(body.length),
      'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
