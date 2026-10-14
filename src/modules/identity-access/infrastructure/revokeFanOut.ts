import type { Server as SocketServer } from 'socket.io';

export type RevokeFanOut = (input: { userId: string; reason: 'SUSPEND' | 'RESET' | 'PASSWORD_CHANGE' }) => void;

let revokeFanOut: RevokeFanOut = () => {};

export function setRevokeFanOut(fanOut: RevokeFanOut): void {
  revokeFanOut = fanOut;
}

export function emitRevokeFanOut(input: { userId: string; reason: 'SUSPEND' | 'RESET' | 'PASSWORD_CHANGE' }): void {
  revokeFanOut(input);
}

export function createSocketRevokeFanOut(io: SocketServer): RevokeFanOut {
  return (input) => {
    void io.fetchSockets().then((sockets) => {
      for (const socket of sockets) {
        if (socket.data.userId === input.userId) socket.disconnect(true);
      }
    });
  };
}
