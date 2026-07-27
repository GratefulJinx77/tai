import type { ActorRunOptions } from '../../types'
import {
  assertApprovedXquikRun,
  assertXquikDataset
} from './xquik-contracts'
import type { XquikActorId, XquikRunControl } from './xquik-contracts'

interface XquikActorRun {
  status: string
  defaultDatasetId?: string
}

interface XquikDatasetClient {
  listItems(options: { limit: number }): Promise<unknown>
}

export interface XquikActorClient {
  callActor(
    actorId: string,
    input: Record<string, unknown>,
    options?: ActorRunOptions
  ): Promise<XquikActorRun>
  getDataset(datasetId: string): XquikDatasetClient
}

export async function runXquikActor<
  TInput extends XquikRunControl,
  TResult extends Record<string, unknown>
>(
  client: XquikActorClient,
  actorId: XquikActorId,
  input: TInput,
  options?: ActorRunOptions
): Promise<TResult[]> {
  assertApprovedXquikRun(input)

  const actorInput = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== 'approved')
  )
  const finalRun = await client.callActor(actorId, actorInput, options)

  if (finalRun.status !== 'SUCCEEDED') {
    throw new Error(`${actorId} failed with status ${finalRun.status}`)
  }

  if (
    typeof finalRun.defaultDatasetId !== 'string' ||
    finalRun.defaultDatasetId.trim().length === 0
  ) {
    throw new Error(`${actorId} succeeded without a dataset ID`)
  }

  const dataset = client.getDataset(finalRun.defaultDatasetId)
  const items = await dataset.listItems({ limit: input.maxItems + 1 })
  assertXquikDataset(items, input.maxItems)

  return items as TResult[]
}
