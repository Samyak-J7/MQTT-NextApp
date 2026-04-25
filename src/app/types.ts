export type DeviceType = 'oms' | 'liquid_flow'

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
    oms: 'On/Off Switch',
    liquid_flow: 'Liquid Flow Sensor',
}

export enum TriggerMode {
    TTR = 'Time Trigger',
    SWITCH = 'Switch',
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
    schedules?: Schedule[]
}

export interface Schedule {
    scheduleId: string
    mode: string
    trigAt: string
    enabled: boolean
    createdAt: number
}

export interface SensorReading {
    deviceId: string
    timestamp: number
    type: DeviceType
    duration: number
    consumption?: number
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
