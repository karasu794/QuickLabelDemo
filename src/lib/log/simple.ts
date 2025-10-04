// STAB: simple logger (no PII masking)
type Fields = Record<string, unknown>;

function fmt(msg: string, fields?: Fields) {
  if (!fields || Object.keys(fields).length === 0) return msg;
  return `${msg} :: ${JSON.stringify(fields)}`;
}

export const log = {
  info: (msg: string, f?: Fields) => console.log(fmt(msg, f)),
  warn: (msg: string, f?: Fields) => console.warn(fmt(msg, f)),
  error: (msg: string, f?: Fields) => console.error(fmt(msg, f)),
  debug: (msg: string, f?: Fields) =>
    (process.env.DEBUG ? console.debug(fmt(msg, f)) : undefined),
};


