// PostgreSQL accepts UUIDs independently of their version or variant bits.
export function isStationId(value: string): boolean {
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
}
