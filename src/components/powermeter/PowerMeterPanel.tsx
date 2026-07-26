'use client'
import { SensorReading, ConsumptionBucket } from '@/app/types'
import { LiveHero } from './LiveHero'
import { EnergyTrend } from './EnergyTrend'
import { TrendChart, PMRange } from './TrendChart'
import { Insights } from './Insights'
import { AdvancedDetails } from './AdvancedDetails'

export type { PMRange } from './TrendChart'

export function PowerMeterPanel({
    deviceId, location, latestReading, liveReadings, last24hReadings, readings, buckets,
    range, onRangeChange, loading, summaryBuckets, todayHourlyBuckets,
}: {
    deviceId: string
    location?: string
    latestReading: SensorReading | null
    liveReadings: SensorReading[]
    last24hReadings: SensorReading[]
    readings: SensorReading[]
    buckets: ConsumptionBucket[]
    range: PMRange
    onRangeChange: (r: PMRange) => void
    loading: boolean
    summaryBuckets: ConsumptionBucket[]
    todayHourlyBuckets: ConsumptionBucket[]
}) {
    const todayKwh = summaryBuckets.length > 0 ? summaryBuckets[summaryBuckets.length - 1].consumption : 0
    const yesterdayKwh = summaryBuckets.length > 1 ? summaryBuckets[summaryBuckets.length - 2].consumption : null
    const monthKwh = summaryBuckets.reduce((s, b) => s + b.consumption, 0)

    return (
        <>
            <LiveHero latestReading={latestReading} liveReadings={liveReadings} location={location} todayKwh={todayKwh} />
            <TrendChart range={range} onRangeChange={onRangeChange} readings={readings} buckets={buckets} loading={loading} />
            <EnergyTrend todayBuckets={todayHourlyBuckets} monthBuckets={summaryBuckets} />
            <Insights
                last24hReadings={last24hReadings}
                todayKwh={todayKwh}
                yesterdayKwh={yesterdayKwh}
                monthKwh={monthKwh}
                deviceId={deviceId}
            />
            <AdvancedDetails range={range} readings={readings} buckets={buckets} />
        </>
    )
}
