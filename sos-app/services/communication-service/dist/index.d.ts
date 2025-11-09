/**
 * Communication Service Entry Point
 * Real-time messaging and communication service for SOS App
 */
import { Server } from 'socket.io';
declare const app: import("express-serve-static-core").Express;
declare const httpServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare let io: Server;
export { app, io, httpServer };
//# sourceMappingURL=index.d.ts.map