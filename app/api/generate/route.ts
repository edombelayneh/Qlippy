import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt } = body;

    const response = await fetch('http://127.0.0.1:11434/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in generate API route:', error);
    return NextResponse.json(
      { error: 'Failed to generate response. Make sure the local LLM server is running.' },
      { status: 500 }
    );
  }
} 