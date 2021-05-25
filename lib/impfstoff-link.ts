import fetch from 'node-fetch'
const DoctoLiburls = new Map([
  ["arena", 'https://bit.ly/3oOdoIv'],
  ["tempelhof", 'https://bit.ly/3wsyqip'],
  ["messe", 'https://bit.ly/3oKTcrd'],
  ["velodrom", 'https://bit.ly/2TigbhH'],
  ["tegel", 'https://bit.ly/2Sjhj3W'],
  ["erika", 'https://bit.ly/3vhMvPM'],
]);

export interface ImpfstoffLinkStats {
  percent: number
  last: number
  count: number
}

export interface ImpfstoffAvl {
  date: string
  substitution?: string
  slots: []
}

export interface ImpfstoffLinkResponse {
  total: number
  reason: string
  message: string
  number_future_vaccinations: number
  availabilities: ImpfstoffAvl[]
}

export async function fetchImpfstoffLink(place: string): Promise<ImpfstoffLinkResponse> {
  const link = DoctoLiburls.get(place)
  const request = await(fetch(link!))
  const response = await request.json()

  return response
}
