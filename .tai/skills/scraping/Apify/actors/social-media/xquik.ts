/**
 * Xquik X Actors
 *
 * Actor listings:
 * - https://apify.com/xquik/x-tweet-scraper
 * - https://apify.com/xquik/x-follower-scraper
 *
 * These wrappers supplement the existing Twitter integration.
 *
 * Xquik is an independent third-party service. Not affiliated with X Corp.
 * "Twitter" and "X" are trademarks of X Corp.
 */

import { Apify } from '../../index'
import type { ActorRunOptions } from '../../types'
import {
  XQUIK_FOLLOWER_SCRAPER_ACTOR,
  XQUIK_TWEET_SCRAPER_ACTOR
} from './xquik-contracts'
import type { XquikRunControl } from './xquik-contracts'
import { runXquikActor } from './xquik-runner'

export {
  XQUIK_FOLLOWER_SCRAPER_ACTOR,
  XQUIK_TWEET_SCRAPER_ACTOR
} from './xquik-contracts'
export type { XquikActorId, XquikRunControl } from './xquik-contracts'

export type XquikTweetMode =
  | 'legacy'
  | 'tweet'
  | 'tweets'
  | 'search'
  | 'profileTweets'
  | 'profileReplies'
  | 'profileMedia'
  | 'profileLikes'
  | 'listTweets'
  | 'article'
  | 'replies'
  | 'quotes'
  | 'thread'
  | 'retweeters'
  | 'favoriters'

export type XquikTweetOutputVariant = 'legacy' | 'rich' | 'raw'
export type XquikTweetFieldStyle = 'legacy' | 'camelCase' | 'snake_case'
export type XquikTweetOutputPreset = 'nested' | 'flat'
export type XquikTweetQueryType = 'Latest' | 'Top' | 'Latest + Top'
export type XquikUrl = string | { url: string }

export interface XquikTweetScraperInput extends XquikRunControl {
  mode?: XquikTweetMode
  outputVariant?: XquikTweetOutputVariant
  fieldStyle?: XquikTweetFieldStyle
  outputPreset?: XquikTweetOutputPreset
  startUrls?: XquikUrl[]
  tweetUrls?: XquikUrl[]
  profileUrls?: XquikUrl[]
  twitterHandles?: string[]
  listIds?: string[]
  tweetIds?: string[]
  articleTweetIds?: string[]
  replyTweetIds?: string[]
  quoteTweetIds?: string[]
  threadTweetIds?: string[]
  retweeterTweetIds?: string[]
  favoriterTweetIds?: string[]
  query?: string
  searchTerms?: string[]
  queryType?: XquikTweetQueryType
  includeArticles?: boolean
  includeRaw?: boolean
  includeUnavailableFields?: boolean
  includeOriginalTweet?: boolean
  respectProfileSubpages?: boolean
  includeSearchTerms?: boolean
  content?: Record<string, unknown>
  users?: Record<string, unknown>
  time?: Record<string, unknown>
  geo?: Record<string, unknown>
  engagement?: Record<string, unknown>
  media?: Record<string, unknown>
  tweetTypes?: Record<string, unknown>
  cards?: Record<string, unknown>
  sources?: Record<string, unknown>
}

export interface XquikTweetResult extends Record<string, unknown> {
  resultType?: 'tweet' | 'user' | 'article' | 'diagnostic'
  result_type?: 'tweet' | 'user' | 'article' | 'diagnostic'
  id?: string
  text?: string
  url?: string
  tweetUrl?: string
  tweet_url?: string
  createdAt?: string
  created_at?: string
  authorUsername?: string
  author_username?: string
  sourceTarget?: string
  source_target?: string
  sourceTweetId?: string
  source_tweet_id?: string
}

export type XquikFollowerRelation =
  | 'followers'
  | 'following'
  | 'verified_followers'
  | 'list_members'
  | 'list_followers'
  | 'community_members'

export type XquikFollowerOutputMode = 'compact' | 'full' | 'raw'
export type XquikFollowerDedupeMode = 'none' | 'first' | 'merge'

export interface XquikFollowerScraperInput extends XquikRunControl {
  startUrls?: XquikUrl[]
  twitterHandles?: string[]
  userIds?: string[]
  listIds?: string[]
  communityIds?: string[]
  relation?: XquikFollowerRelation
  relations?: XquikFollowerRelation[]
  outputMode?: XquikFollowerOutputMode
  includeRaw?: boolean
  includeUnavailableFields?: boolean
  includeUnavailableUsers?: boolean
  includeTargetMetadata?: boolean
  dedupeMode?: XquikFollowerDedupeMode
  overlapMode?: boolean
  minFollowers?: number
  maxFollowers?: number
  minFollowing?: number
  maxFollowing?: number
  minStatuses?: number
  maxStatuses?: number
  minAccountAgeDays?: number
  verifiedOnly?: boolean
  verifiedType?: string
  hasWebsite?: boolean
  hasLocation?: boolean
  bioContains?: string
  locationContains?: string
  usernameContains?: string
}

export interface XquikFollowerResult extends Record<string, unknown> {
  resultType?: 'user' | 'diagnostic'
  id?: string
  username?: string
  name?: string
  url?: string
  sourceTarget?: string
  sourceRelation?: XquikFollowerRelation
  sourceTargetKeys?: string[]
  overlapCount?: number
  status?: string
  message?: string
}

/**
 * Run Xquik's X Tweet Scraper after explicit paid-run approval.
 *
 * @example
 * ```typescript
 * const posts = await scrapeXquikTweets({
 *   approved: true,
 *   mode: 'search',
 *   query: 'open source AI',
 *   maxItems: 25,
 *   outputVariant: 'rich'
 * })
 * ```
 */
export async function scrapeXquikTweets(
  input: XquikTweetScraperInput,
  options?: ActorRunOptions
): Promise<XquikTweetResult[]> {
  return runXquikActor<XquikTweetScraperInput, XquikTweetResult>(
    new Apify(),
    XQUIK_TWEET_SCRAPER_ACTOR,
    input,
    options
  )
}

/**
 * Run Xquik's X Follower Scraper after explicit paid-run approval.
 *
 * @example
 * ```typescript
 * const followers = await scrapeXquikFollowers({
 *   approved: true,
 *   twitterHandles: ['exampleuser'],
 *   relation: 'followers',
 *   maxItems: 25,
 *   maxItemsPerTarget: 25,
 *   outputMode: 'compact'
 * })
 * ```
 */
export async function scrapeXquikFollowers(
  input: XquikFollowerScraperInput,
  options?: ActorRunOptions
): Promise<XquikFollowerResult[]> {
  return runXquikActor<XquikFollowerScraperInput, XquikFollowerResult>(
    new Apify(),
    XQUIK_FOLLOWER_SCRAPER_ACTOR,
    input,
    options
  )
}
