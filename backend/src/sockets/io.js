import { rooms } from './rooms.js';

let io = null;
export const setIO = (instance) => { io = instance; };
export const getIO = () => io;

// All emit helpers are no-ops when Socket.IO isn't running (tests, scripts).
export const emitToUser = (userId, event, payload) =>
  io?.to(rooms.user(userId)).emit(event, payload);

export const emitToHelper = (helperId, event, payload) =>
  io?.to(rooms.helper(helperId)).emit(event, payload);

export const emitToAdmins = (event, payload) =>
  io?.to(rooms.admins).emit(event, payload);

/** One emit to several rooms: a socket that is in more than one of them still gets it once. */
export function emitRequestEvent({ userIds = [], requestId }, event, payload) {
  if (!io) return;
  io.to([...new Set(userIds)].map(rooms.user).concat(rooms.request(requestId))).emit(event, payload);
}

export const joinOffers = (helperId, requestId) =>
  io?.in(rooms.helper(helperId)).socketsJoin(rooms.offers(requestId));

/** Tells everyone who was offered the request that it is gone, then empties the room. */
export function closeOffers(requestId, reason, exceptHelperId) {
  if (!io) return;
  const room = rooms.offers(requestId);
  if (exceptHelperId) io.in(rooms.helper(exceptHelperId)).socketsLeave(room); // the winner
  io.to(room).emit('request:unavailable', { requestId, reason });
  io.in(room).socketsLeave(room);
}

/** One emit to several users' rooms; a user with several tabs gets it once per tab. */
export function emitToUsers(userIds, event, payload) {
  if (!io) return;
  io.to([...new Set(userIds)].map(rooms.user)).emit(event, payload);
}