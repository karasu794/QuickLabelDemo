export const shouldForceAnchors = (): boolean => {
  try {
    return (process.env.NEXT_PUBLIC_TEST_FORCE_ANCHORS || '').toString() === '1'
  } catch {
    return false
  }
}


