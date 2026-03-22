/**
 * Recursively converts Prisma Decimal objects to plain numbers
 * so data can be passed from Server Components to Client Components.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      value !== null &&
      typeof value === "object" &&
      typeof value.toNumber === "function"
        ? value.toNumber()
        : value
    )
  ) as T;
}
