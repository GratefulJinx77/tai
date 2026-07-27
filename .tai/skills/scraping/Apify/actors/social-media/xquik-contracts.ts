export const XQUIK_TWEET_SCRAPER_ACTOR = 'xquik/x-tweet-scraper'
export const XQUIK_FOLLOWER_SCRAPER_ACTOR = 'xquik/x-follower-scraper'
export type XquikActorId =
  | typeof XQUIK_TWEET_SCRAPER_ACTOR
  | typeof XQUIK_FOLLOWER_SCRAPER_ACTOR

export interface XquikRunControl {
  approved: true
  maxItems: number
  maxItemsPerTarget?: number
}

type UntrustedRunControl = {
  approved?: unknown
  maxItems?: unknown
  maxItemsPerTarget?: unknown
}

function assertPositiveInteger(value: unknown, field: string): asserts value is number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value >= Number.MAX_SAFE_INTEGER
  ) {
    throw new TypeError(`${field} must be a positive safe integer below Number.MAX_SAFE_INTEGER`)
  }
}

export function assertApprovedXquikRun(
  input: UntrustedRunControl
): asserts input is XquikRunControl {
  if (input.approved !== true) {
    throw new Error('Explicit approval is required before starting a paid Actor run')
  }

  assertPositiveInteger(input.maxItems, 'maxItems')

  if (input.maxItemsPerTarget !== undefined) {
    assertPositiveInteger(input.maxItemsPerTarget, 'maxItemsPerTarget')
  }
}

export function assertXquikDataset(
  items: unknown,
  maxItems: number
): asserts items is Record<string, unknown>[] {
  assertPositiveInteger(maxItems, 'maxItems')

  if (!Array.isArray(items)) {
    throw new TypeError('Actor dataset must be an array')
  }

  if (items.length > maxItems) {
    throw new RangeError(`Actor returned ${items.length} rows above the approved cap of ${maxItems}`)
  }

  const hasInvalidRow = items.some((item) => (
    item === null || typeof item !== 'object' || Array.isArray(item)
  ))

  if (hasInvalidRow) {
    throw new TypeError('Actor dataset rows must be objects')
  }
}
