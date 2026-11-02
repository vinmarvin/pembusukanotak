// src/systems/EventBus.js
// Lightweight pub/sub event bus for decoupled communication across scenes and systems.

class EventBusImpl {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn, context = null) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push({ fn, context });
    return () => this.off(event, fn, context);
  }

  once(event, fn, context = null) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      fn.apply(context, args);
    }, context);
    return unsubscribe;
  }

  off(event, fn = null, context = null) {
    if (!this._listeners.has(event)) return;
    if (!fn) {
      this._listeners.delete(event);
      return;
    }
    const filtered = this._listeners.get(event).filter(
      (entry) => !(entry.fn === fn && (!context || entry.context === context))
    );
    if (filtered.length > 0) {
      this._listeners.set(event, filtered);
    } else {
      this._listeners.delete(event);
    }
  }

  emit(event, ...args) {
    if (!this._listeners.has(event)) return;
    const entries = [...this._listeners.get(event)];
    for (const { fn, context } of entries) {
      try {
        fn.apply(context, args);
      } catch (err) {
        console.error(`[EventBus] Error in listener for event "${event}":`, err);
      }
    }
  }

  clear() {
    this._listeners.clear();
  }
}

export const EventBus = new EventBusImpl();

