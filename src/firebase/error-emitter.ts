
import { EventEmitter } from 'events';

// Create a new file, e.g., src/lib/error-emitter.ts
class ErrorEmitter extends EventEmitter {}
export const errorEmitter = new ErrorEmitter();
