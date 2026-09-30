import { rooms } from './rooms.js';

let io = null;
export const setIO = (instance) => { io = instance; };
export const getIO = () => io;

// Emit helpers used by services. All are no-ops if Socket.IO isn't running,
// so services and test scripts can call them safely.
export const emitToUser = (userId, event, payload) =>
  io?.to(rooms.user(userId)).emit(event, payload);

export const emitToHelper = (helperId, event, payload) =>
  io?.to(rooms.helper(helperId)).emit(event, payload);

export const emitToRequest = (requestId, event, payload) =>
  io?.to(rooms.request(requestId)).emit(event, payload);

export const emitToAdmins = (event, payload) =>
  io?.to(rooms.admins).emit(event, payload);