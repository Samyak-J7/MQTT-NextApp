export type DeviceType = 'oms' | 'liquid_flow' | 'power_meter'

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
    oms: 'On/Off Switch',
    liquid_flow: 'Liquid Flow Sensor',
    power_meter: 'Power / Energy Meter',
}

export enum TriggerMode {
    TTR = 'Time Trigger',
    SRS = 'Sunrise',
    SST = 'Sunset',
}

export interface User {
    userId: string
    email: string
    name: string
    passwordHash: string
    accountId: string
    role: 'owner' | 'admin' | 'member'
    createdAt: number
}

export interface Device {
    accountId: string
    deviceId: string
    name: string
    type: DeviceType
    location?: string
    description?: string
    addedBy: string
    createdAt: number
    lastSeen?: number
    defaultDuration?: number   // ms — OMS switch default ON duration
    schedules?: Schedule[]
}

export interface Schedule {
    scheduleId: string
    mode: string        // TTR | SRS | SST
    trigAt: string       // HHMM, used by TTR only
    duration: number      // minutes the device stays ON before auto-off
    lat?: number          // required for SRS/SST
    lon?: number          // required for SRS/SST
    enabled: boolean
    createdAt: number
}

export interface SensorReading {
    deviceId: string
    timestamp: number
    type: DeviceType
    // oms / liquid_flow
    duration?: number
    consumption?: number
    // power_meter
    volt?: number
    ampr?: number
    watt?: number
    unit?: number   // kWh
    frqc?: number
    pf?: number
}

export interface AuditLog {
    accountId: string
    ts: string
    userId: string
    userEmail: string
    action: string
    resource: string
    details?: string
}

export interface DeviceStats {
    deviceId: string
    name: string
    type: DeviceType
    isOnline: boolean
    lastSeen?: number
    readingCount: number
    latestReading?: SensorReading
}
