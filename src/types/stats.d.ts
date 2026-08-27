export interface Stats {
  wld: Wld
  accuracy: Accuracy
  device?: DeviceInfo
}

export interface DeviceInfo {
  platform: "phone" | "pc"
  icon: "mdi-cellphone" | "mdi-monitor"
  summary: string
  details: string
  rawClient: string
}

export interface Wld {
  wins: number
  loses: number
  draws: number
  games: number
}

export interface Accuracy {
  avg: number
  wld: Wld
}
