import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    // Create a new ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
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

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No reader available');
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            // Convert the Uint8Array to text
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(Boolean);

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.error) {
                  throw new Error(data.error);
                }
                controller.enqueue(data.token);
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 