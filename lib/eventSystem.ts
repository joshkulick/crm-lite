// Global event listeners for real-time updates
export const eventListeners = new Map<string, (data: unknown) => void>();

// Function to broadcast claim events to all connected clients
export function broadcastClaimEvent(companyId: number, claimedByUsername: string, companyName: string) {
  const eventData = {
    type: 'company_claimed',
    company_id: companyId,
    claimed_by_username: claimedByUsername,
    company_name: companyName,
    timestamp: new Date().toISOString()
  };

  // Broadcast to all connected clients
  eventListeners.forEach((listener) => {
    try {
      listener(eventData);
    } catch (error) {
      console.error('Error broadcasting to listener:', error);
    }
  });
} 