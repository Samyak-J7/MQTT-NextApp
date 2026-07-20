// Free, keyless city-name → lat/lon lookup for sunrise/sunset schedules.
// https://open-meteo.com/en/docs/geocoding-api
export interface GeocodeResult {
    label: string
    lat: number
    lon: number
}

export async function searchCity(query: string): Promise<GeocodeResult[]> {
    if (!query.trim()) return []

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    const res = await fetch(url)
    if (!res.ok) return []

    const data = await res.json()
    const results: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number }> = data.results ?? []

    return results.map(r => ({
        label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
        lat: r.latitude,
        lon: r.longitude,
    }))
}
