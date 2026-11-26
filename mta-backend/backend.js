import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import esMain from 'es-main';

const app = express();

const STOP_IDS = {
  line23Downtown: '222S', // 125 St (2/3) southbound
  line45Downtown: '621S'  // 125 St (4/5/6) southbound
};

const MTA_123456_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs';

const UMBRELLA_LAT = 40.8116;
const UMBRELLA_LON = -73.9536;

app.use(cors({
  origin: [
    'https://gehpark.github.io',
    'http://gehpark.github.io',
    'http://localhost:8000',
    'https://localhost:8000',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ]
}));

async function fetchMTAData() {
  const response = await fetch(MTA_123456_URL);
  if (!response.ok) {
    throw new Error(`MTA feed request failed with status ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(buffer)
  );
}

function parse125DowntownArrivals(feed) {
  const now = Math.floor(Date.now() / 1000);
  const arrivals = {
    line23Downtown: [],
    line45Downtown: []
  };

  feed.entity.forEach(entity => {
    if (!entity.tripUpdate) return;

    const trip = entity.tripUpdate.trip;
    const routeId = trip.routeId;
    const stopTimeUpdates = entity.tripUpdate.stopTimeUpdate || [];

    if (!['2', '3', '4', '5'].includes(routeId)) return;

    stopTimeUpdates.forEach(stopTime => {
      const stopId = stopTime.stopId;
      const is23 = stopId === STOP_IDS.line23Downtown && ['2', '3'].includes(routeId);
      const is45 = stopId === STOP_IDS.line45Downtown && ['4', '5'].includes(routeId);

      if (!is23 && !is45) return;

      const arrivalTime = stopTime.arrival?.time || stopTime.departure?.time;
      if (!arrivalTime) return;

      const timestamp = Number(arrivalTime);
      const minutesUntilArrival = Math.floor((timestamp - now) / 60);

      if (minutesUntilArrival >= 0 && minutesUntilArrival <= 30) {
        const item = {
          minutes: minutesUntilArrival,
          arrivalTime: new Date(timestamp * 1000),
          tripId: trip.tripId,
          routeId,
          stopId
        };

        if (is23) {
          arrivals.line23Downtown.push(item);
        } else if (is45) {
          arrivals.line45Downtown.push(item);
        }
      }
    });
  });

  arrivals.line23Downtown.sort((a, b) => a.minutes - b.minutes);
  arrivals.line45Downtown.sort((a, b) => a.minutes - b.minutes);

  arrivals.line23Downtown = arrivals.line23Downtown.slice(0, 4);
  arrivals.line45Downtown = arrivals.line45Downtown.slice(0, 4);

  return arrivals;
}

function determineUmbrellaEmoji(codes) {
  if (codes.some(c => [95, 96, 99].includes(c))) {
    return '⛈️';
  }
  if (codes.some(c => (c >= 71 && c <= 77) || c === 85 || c === 86)) {
    return '❄️';
  }
  if (codes.some(c => (c >= 51 && c <= 67) || (c >= 80 && c <= 82))) {
    return '☔';
  }

  const currentCode = codes[0] ?? 0;
  if (currentCode === 0 || currentCode === 1) {
    return '☀️';
  }
  if (currentCode === 2) {
    return '⛅';
  }
  return '☁️';
}

app.get('/api/trains', async (req, res) => {
  try {
    const feed = await fetchMTAData();
    const data = parse125DowntownArrivals(feed);
    res.json({
      success: true,
      data,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching/parsing train arrivals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/umbrella', async (req, res) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${UMBRELLA_LAT}&longitude=${UMBRELLA_LON}&hourly=weather_code&timezone=America%2FNew_York&forecast_days=1`;
    const response = await fetch(url);
    const data = await response.json();

    const nyHourString = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false
    });
    const currentHour = parseInt(nyHourString, 10) % 24;
    const remainingCodes = data.hourly.weather_code.slice(currentHour);

    res.json({
      emoji: determineUmbrellaEmoji(remainingCodes),
      checkedHours: remainingCodes.length
    });
  } catch (error) {
    console.error('Error fetching weather for /umbrella:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

const PORT = process.env.PORT || 3000;
if (esMain(import.meta)) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

