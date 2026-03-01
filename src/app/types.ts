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
