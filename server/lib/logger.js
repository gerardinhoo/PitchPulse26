function safeStringify(payload) {
  try {
    return JSON.stringify(payload);
  } catch {
    return JSON.stringify({
      level: "error",
      event: "logger.serialization_failed",
      message: "Could not serialize log payload",
    });
  }
}

function log(level, event, payload = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...payload,
  };

  const line = safeStringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info(event, payload) {
    log("info", event, payload);
  },
  warn(event, payload) {
    log("warn", event, payload);
  },
  error(event, payload) {
    log("error", event, payload);
  },
};
