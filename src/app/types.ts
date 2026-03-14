export enum TriggerMode {
    TTR = 'Time Trigger',
    SWITCH = 'Switch',
    SRS = 'Sunrise',
    SST = 'Sunset',
}

export interface FormData {
    key: string;
    devId: string;
    city: string;
    relays: number[];
    hh: number;
    mm: number;
    mode: string;
}

export interface MqttMessagePayload {
    key: string;
    devId: string;
    relays: number[];
    mode: string;
    trig_at: string
}

export interface User {
    userId: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: number;
}

export interface Device {
    userId: string;
    deviceId: string;
    name: string;
    location?: string;
    description?: string;
    createdAt: number;
    lastSeen?: number;
    schedules?: Schedule[];
}

export interface Schedule {
    scheduleId: string;
    mode: string;
    trigAt: string;
    relays: number[];
    enabled: boolean;
    createdAt: number;
}

export interface SensorReading {
    deviceId: string;
    timestamp: number;
    volume: number;
    temperature?: number;
    humidity?: number;
    [key: string]: unknown;
}

export interface DeviceStats {
    deviceId: string;
    name: string;
    isOnline: boolean;
    lastSeen?: number;
    readingCount: number;
    latestReading?: SensorReading;
}
