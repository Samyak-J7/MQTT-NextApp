import {NextRequest, NextResponse} from 'next/server'
import SunCalc from 'suncalc'

const geoCache = new Map<
    string,
    {
        latitude: number
        longitude: number
        timezone: string
        name: string
        expires: number
    }
>()

const CACHE_TTL = 1000 * 60 * 60 * 24 * 30 // 30 days

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const cityRaw = req.nextUrl.searchParams.get('city')

        if (!cityRaw) {
            return NextResponse.json({time: Date.now()}, {status: 200})
        }

        const city = cityRaw.toLowerCase().trim()
        let geo = geoCache.get(city)

        if (!geo || geo.expires < Date.now()) {
            const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
            )

            const geoData = await geoRes.json()

            if (!geoData?.results?.length) {
                return NextResponse.json({error: 'City not found'}, {status: 404})
            }

            const {latitude, longitude, name, timezone} = geoData.results[0]

            geo = {
                latitude,
                longitude,
                timezone,
                name,
                expires: Date.now() + CACHE_TTL
            }

            geoCache.set(city, geo)
        }

        const times = SunCalc.getTimes(new Date(), geo.latitude, geo.longitude)

        const sunriseDate = new Date(
            times.sunrise.toLocaleString("en-US", {timeZone: geo.timezone})
        )

        const sunsetDate = new Date(
            times.sunset.toLocaleString("en-US", {timeZone: geo.timezone})
        )

        const sunrise = [sunriseDate.getHours(), sunriseDate.getMinutes()]
        const sunset = [sunsetDate.getHours(), sunsetDate.getMinutes()]

        return NextResponse.json({
            time: Date.now(),
            city: geo.name,
            sunrise,
            sunset
        }, {status: 200})

    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({error: 'Request failed'}, {status: 500})
    }
}
