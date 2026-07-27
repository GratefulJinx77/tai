import { describe, it, expect } from 'vitest';

import {
  assertApprovedXquikRun,
  assertXquikDataset,
  XQUIK_FOLLOWER_SCRAPER_ACTOR,
  XQUIK_TWEET_SCRAPER_ACTOR
} from '../.tai/skills/scraping/Apify/actors/social-media/xquik-contracts';
import {
  runXquikActor,
  type XquikActorClient
} from '../.tai/skills/scraping/Apify/actors/social-media/xquik-runner';

type TestInput = {
  approved: true;
  maxItems: number;
  query: string;
};

function createClient(
  rows: unknown,
  status = 'SUCCEEDED',
  datasetId: string | undefined = 'dataset-1'
): {
  client: XquikActorClient;
  calls: Array<{ actorId: string; input: Record<string, unknown> }>;
  limits: number[];
} {
  const calls: Array<{ actorId: string; input: Record<string, unknown> }> = [];
  const limits: number[] = [];
  const client: XquikActorClient = {
    async callActor(actorId, input) {
      calls.push({ actorId, input });
      return { status, defaultDatasetId: datasetId };
    },
    getDataset() {
      return {
        async listItems({ limit }) {
          limits.push(limit);
          return rows;
        }
      };
    }
  };

  return { client, calls, limits };
}

describe('Xquik Apify Actor contracts', () => {
  it('exports both Actor slugs', () => {
    expect.assertions(2);
    expect(XQUIK_TWEET_SCRAPER_ACTOR).toBe('xquik/x-tweet-scraper');
    expect(XQUIK_FOLLOWER_SCRAPER_ACTOR).toBe('xquik/x-follower-scraper');
  });

  it('accepts an approved run with positive caps', () => {
    expect.assertions(1);
    expect(() => assertApprovedXquikRun({
      approved: true,
      maxItems: 25,
      maxItemsPerTarget: 5
    })).not.toThrow();
  });

  it.each([
    [{ approved: false, maxItems: 25 }, 'Explicit approval'],
    [{ approved: true, maxItems: 0 }, 'maxItems'],
    [{ approved: true, maxItems: 1.5 }, 'maxItems'],
    [{ approved: true, maxItems: Number.MAX_SAFE_INTEGER }, 'maxItems'],
    [{ approved: true, maxItems: 25, maxItemsPerTarget: -1 }, 'maxItemsPerTarget']
  ])('rejects unsafe run control %#', (input, message) => {
    expect.assertions(1);
    expect(() => assertApprovedXquikRun(input)).toThrow(message);
  });

  it('accepts object rows within the approved cap', () => {
    expect.assertions(1);
    expect(() => assertXquikDataset([{ id: '1' }, { id: '2' }], 2)).not.toThrow();
  });

  it('rejects rows above the approved cap', () => {
    expect.assertions(1);
    expect(() => assertXquikDataset([{ id: '1' }, { id: '2' }], 1)).toThrow(
      'above the approved cap'
    );
  });

  it.each([
    [null],
    [{}],
    [[{ id: '1' }, 'invalid']]
  ])('rejects malformed dataset %#', (items) => {
    expect.assertions(1);
    expect(() => assertXquikDataset(items, 10)).toThrow();
  });

  it('runs the approved Actor without forwarding approval metadata', async () => {
    expect.assertions(4);
    const { client, calls, limits } = createClient([{ id: '1' }]);

    const rows = await runXquikActor<TestInput, Record<string, unknown>>(
      client,
      XQUIK_TWEET_SCRAPER_ACTOR,
      { approved: true, maxItems: 2, query: 'open source AI' }
    );

    expect(rows).toEqual([{ id: '1' }]);
    expect(calls).toEqual([{
      actorId: XQUIK_TWEET_SCRAPER_ACTOR,
      input: { maxItems: 2, query: 'open source AI' }
    }]);
    expect(calls[0].input).not.toHaveProperty('approved');
    expect(limits).toEqual([3]);
  });

  it('fails closed when the Actor does not succeed', async () => {
    expect.assertions(1);
    const { client } = createClient([], 'FAILED');

    await expect(runXquikActor<TestInput, Record<string, unknown>>(
      client,
      XQUIK_TWEET_SCRAPER_ACTOR,
      { approved: true, maxItems: 2, query: 'open source AI' }
    )).rejects.toThrow('failed with status FAILED');
  });

  it('fails closed when a successful run has no dataset ID', async () => {
    expect.assertions(1);
    const { client } = createClient([], 'SUCCEEDED', '');

    await expect(runXquikActor<TestInput, Record<string, unknown>>(
      client,
      XQUIK_TWEET_SCRAPER_ACTOR,
      { approved: true, maxItems: 2, query: 'open source AI' }
    )).rejects.toThrow('without a dataset ID');
  });
});
