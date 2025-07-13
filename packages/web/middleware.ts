import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Handle all API endpoints by forwarding to the backend
  if (pathname.startsWith('/api/')) {
    try {
      console.log(`🔄 Middleware: ${request.method} ${pathname}`)
      
      // Get the request body for POST, PUT, DELETE requests
      let body = null
      if (request.method !== 'GET') {
        try {
          body = await request.text()
          console.log(`📝 Request body length: ${body?.length || 0}`)
        } catch (bodyError) {
          console.error('❌ Error reading request body:', bodyError)
          body = null
        }
      }
      
      // Forward the request to the backend
      const backendUrl = `http://127.0.0.1:11434${pathname}`
      console.log(`🎯 Forwarding to: ${backendUrl}`)
      
      const backendResponse = await fetch(backendUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      })
      
      console.log(`🔍 Backend response status: ${backendResponse.status}`)
      
      // Check if the response is ok
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text()
        console.error(`❌ Backend error: ${backendResponse.status} - ${errorText}`)
        return new NextResponse(
          JSON.stringify({ error: `Backend error: ${backendResponse.status}` }),
          { status: backendResponse.status }
        )
      }
      
      // Handle streaming responses (for generate and langgraph endpoints)
      const contentType = backendResponse.headers.get('content-type') || ''
      console.log(`📄 Response content-type: ${contentType}`)
      
      if (contentType.includes('text/event-stream') || pathname === '/api/generate' || pathname === '/api/langgraph/stream') {
        console.log('🌊 Handling streaming response')
        // Get the reader from the response body
        const reader = backendResponse.body?.getReader()
        if (!reader) {
          return new NextResponse(
            JSON.stringify({ error: 'No response body' }),
            { status: 500 }
          )
        }
        
        // Create a custom readable stream that doesn't buffer
        const stream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                // Enqueue the chunk immediately without buffering
                controller.enqueue(value)
              }
            } catch (error) {
              controller.error(error)
            } finally {
              controller.close()
            }
          },
        })
        
        // Return the streaming response with proper headers
        return new NextResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
            'Transfer-Encoding': 'chunked',
          },
        })
      } else {
        console.log('📋 Handling regular JSON response')
        // Handle regular JSON responses
        const responseData = await backendResponse.text()
        console.log(`✅ Response data length: ${responseData?.length || 0}`)
        
        return new NextResponse(responseData, {
          status: backendResponse.status,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('❌ Middleware error:', error)
      return new NextResponse(
        JSON.stringify({ 
          error: 'Internal server error', 
          details: error instanceof Error ? error.message : String(error) 
        }),
        { status: 500 }
      )
    }
  }
  
  // For all other requests, continue as normal
  return NextResponse.next()
}

// Configure which routes the middleware runs on
export const config = {
  matcher: '/api/:path*',
} 