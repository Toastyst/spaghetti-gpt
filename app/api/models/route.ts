import { NextResponse } from 'next/server';
import {
  chatModels,
  getCapabilities,
} from '@/lib/ai/models';

export async function GET() {
  try {
    const capabilities = await getCapabilities();

    return NextResponse.json({
      models: chatModels,
      capabilities,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to load models' },
      { status: 500 }
    );
  }
}
