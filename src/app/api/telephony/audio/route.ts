import { NextResponse } from 'next/server';
import { telecomService } from '@/services/telecom.service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const urlParam = searchParams.get('url');

    if (!urlParam) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    const response = await telecomService.getAudioStreamResponse(urlParam);

    if (!response.ok) {
      return new NextResponse('Failed to fetch audio from provider', { status: response.status });
    }

    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'audio/wav');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    return new NextResponse(response.body, { headers });

  } catch (error: any) {
    console.error('Audio Proxy Error:', error);
    return new NextResponse('Failed to proxy audio', { status: 500 });
  }
}
