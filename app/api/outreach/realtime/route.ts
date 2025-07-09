import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { eventListeners } from '../claim-company/route';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JWTPayload {
  userId: number;
  username: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Create a unique connection ID
    const connectionId = `${decoded.userId}-${Date.now()}-${Math.random()}`;

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialMessage = `data: ${JSON.stringify({
          type: 'connected',
          connection_id: connectionId,
          user_id: decoded.userId,
          username: decoded.username
        })}\n\n`;
        
        controller.enqueue(new TextEncoder().encode(initialMessage));

        // Create event listener for this connection
        const eventListener = (data: unknown) => {
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));
          } catch (error) {
            console.error('Error sending SSE message:', error);
          }
        };

        // Add this connection to the event listeners
        eventListeners.set(connectionId, eventListener);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          eventListeners.delete(connectionId);
          controller.close();
        });

                 // Keep connection alive with periodic heartbeats
         const heartbeatInterval = setInterval(() => {
           try {
             const heartbeatMessage = `data: ${JSON.stringify({
               type: 'heartbeat',
               timestamp: new Date().toISOString()
             })}\n\n`;
             controller.enqueue(new TextEncoder().encode(heartbeatMessage));
           } catch {
             clearInterval(heartbeatInterval);
             eventListeners.delete(connectionId);
             controller.close();
           }
         }, 30000); // Send heartbeat every 30 seconds

        // Clean up interval when connection closes
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 