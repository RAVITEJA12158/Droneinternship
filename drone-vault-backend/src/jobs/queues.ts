// Stub — BullMQ/Redis removed. Jobs run inline.
// Kept so imports don't break. Remove this file entirely in production if adding real queuing.
export const thumbnailQueue = { add: async () => ({ id: "inline" }) };
export const exportQueue = { add: async () => ({ id: "inline" }), getJob: async () => null };
