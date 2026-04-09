import { startCommand, stopCommand } from './command.js';

export const mayhemMode = {
  id: 'mayhem',
  start(context) {
    startCommand({ ...context, variant: 'mayhem' });
  },
  stop() {
    stopCommand();
  },
};
