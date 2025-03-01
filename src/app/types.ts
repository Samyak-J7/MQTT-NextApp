export enum TriggerMode {
  SWITCH = 'Switch',
  SRS = 'Sunrise',
  SST = 'Sunset',
}

export interface MQTTFormData {
  key: string;
  devId: string;
  city: string;
  relays: number[];
}
