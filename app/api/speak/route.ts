import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, stop = false } = await request.json();

    const response = await fetch('http://127.0.0.1:11434/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, stop }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in speak API route:', error);
    return NextResponse.json(
      { error: 'Failed to process speech request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch('http://127.0.0.1:11434/speak/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in speak status API route:', error);
    return NextResponse.json(
      { is_speaking: false },
      { status: 500 }
    );
  }
} 