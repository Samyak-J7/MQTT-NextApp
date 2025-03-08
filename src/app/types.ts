export enum TriggerMode {
  TTR = 'Time Trigger',
  SWITCH = 'Switch',
  SRS = 'Sunrise',
  SST = 'Sunset',
}

export interface MQTTFormData {
  key: string;
  devId: string;
  city: string;
  relays: number[];
  hh: number;
  mm: number;
  mode: string;
}
