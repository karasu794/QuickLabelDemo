export type AdminLike = { role?: string | null; is_admin?: boolean | null }

export const isAdmin = (p?: AdminLike | null): boolean => {
  return !!p && (p.role === 'admin' || p.is_admin === true)
}


