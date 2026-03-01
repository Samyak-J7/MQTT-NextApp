import {NextRequest, NextResponse} from 'next/server'
import SunCalc from 'suncalc'

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const city = req.nextUrl.searchParams.get('city')
        if (!city) {
            return NextResponse.json({time: Date.now()}, {status: 200})
        }

        const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        )
        const geoData = await geoRes.json()

        if (!geoData?.results?.length) {
            return NextResponse.json({error: 'City not found'}, {status: 404})
        }

        const {latitude, longitude, name, timezone} = geoData.results[0]
        const times = SunCalc.getTimes(new Date(), latitude, longitude)
        const sunriseDate = new Date(times.sunrise.toLocaleString("en-US", {timeZone: timezone}))
        const sunsetDate = new Date(times.sunset.toLocaleString("en-US", {timeZone: timezone}))

        const sunrise = [sunriseDate.getHours(), sunriseDate.getMinutes()]
        const sunset = [sunsetDate.getHours(), sunsetDate.getMinutes()]

        return NextResponse.json({
            city: name,
            sunrise,
            sunset
        }, {status: 200})

    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({error: 'Request failed'}, {status: 500})
    }
}
