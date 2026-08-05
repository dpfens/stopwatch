import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class ActionService<Payload, Result> {
  private handlers = new Map<string, (payload: Payload) => Result>();
  
  set(action: string, handler: (payload: Payload) => Result) { this.handlers.set(action, handler); }
  execute(action: string, payload: Payload): Result | undefined { return this.handlers.get(action)?.(payload); }
  has(action: string): boolean { return this.handlers.has(action); }
  delete(action: string): boolean { return this.handlers.delete(action); }
  size(): number { return this.handlers.size; }
  clear() { this.handlers.clear(); }
}