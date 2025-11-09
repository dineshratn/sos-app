/**
 * Socket.IO Server Configuration with Redis Adapter
 * Task 126: Setup Socket.IO with Redis adapter for horizontal scaling
 */
import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
export declare function setupSocketIOWithRedis(httpServer: HTTPServer, corsOrigin: string | string[]): Promise<Server>;
export declare function setupSocketIOMiddleware(io: Server): void;
//# sourceMappingURL=socket.server.d.ts.map