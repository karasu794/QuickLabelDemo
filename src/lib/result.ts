export type Ok<T> = { ok: true; value: T }
export type Err<E = unknown> = { ok: false; error: E }
export type Result<T, E = unknown> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> { return { ok: true, value } }
export function err<E = unknown>(error: E): Err<E> { return { ok: false, error } }
export function isOk<T, E>(r: Result<T, E>): r is Ok<T> { return r.ok }


