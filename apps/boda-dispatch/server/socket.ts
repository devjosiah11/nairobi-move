import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer;

export function initializeSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || 'https://boda-dispatch.up.railway.app']
        : ['http://localhost:5174', 'http://localhost:3002'],
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });

    // Admin can subscribe to rider updates
    socket.on('subscribe:riders', () => {
      socket.join('riders');
      console.log(`Socket ${socket.id} subscribed to rider updates`);
    });

    // Admin can subscribe to SOS alerts
    socket.on('subscribe:sos', () => {
      socket.join('sos');
      console.log(`Socket ${socket.id} subscribed to SOS alerts`);
    });

    // Admin can subscribe to trip updates
    socket.on('subscribe:trips', () => {
      socket.join('trips');
      console.log(`Socket ${socket.id} subscribed to trip updates`);
    });
  });

  return io;
}

export function emitRiderUpdate(event: string, data: any): void {
  if (io) {
    io.to('riders').emit(event, data);
    console.log(`[Socket] Emitted rider update: ${event}`, data);
  }
}

export function emitSOSAlert(event: string, data: any): void {
  if (io) {
    io.to('sos').emit(event, data);
    console.log(`[Socket] Emitted SOS alert: ${event}`, data);
  }
}

export function emitTripUpdate(event: string, data: any): void {
  if (io) {
    io.to('trips').emit(event, data);
    console.log(`[Socket] Emitted trip update: ${event}`, data);
  }
}

export function emitToAll(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
    console.log(`[Socket] Emitted to all: ${event}`, data);
  }
}
