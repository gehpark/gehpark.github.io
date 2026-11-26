const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from your GitHub Pages site
app.use(cors({
  origin: 'https://gehpark.github.io'
}));

// Coordinates for ZIP code 10027 (Morningside Heights / West Harlem, NY)
const LAT = 40.8116;
const LON = -73.9536;

app.get('/umbrella', async (req, res) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=weather_code&timezone=America%2FNew_York&forecast_days=1`;
    const response = await fetch(url);
    const data = await response.json();

    // Get current hour in New York time (0-23)
    const nyHourString = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false
    });
    const currentHour = parseInt(nyHourString, 10) % 24;

    // Slice weather codes from the current hour through the end of today (hour 23)
    const remainingCodes = data.hourly.weather_code.slice(currentHour);

    const emoji = determineEmoji(remainingCodes);
    res.json({ emoji, checkedHours: remainingCodes.length });
  } catch (error) {
    console.error('Weather fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

function determineEmoji(codes) {
  // Priority 1: Thunderstorm (WMO codes 95, 96, 99)
  if (codes.some(c => [95, 96, 99].includes(c))) {
    return '⛈️';
  }

  // Priority 2: Snow / Freezing Precipitation (WMO codes 71-77, 85-86)
  if (codes.some(c => (c >= 71 && c <= 77) || c === 85 || c === 86)) {
    return '❄️';
  }

  // Priority 3: Rain / Drizzle / Showers (WMO codes 51-67, 80-82)
  if (codes.some(c => (c >= 51 && c <= 67) || (c >= 80 && c <= 82))) {
    return '☔';
  }

  // Fallback: Check current hour's sky condition (codes[0])
  const currentCode = codes[0] ?? 0;

  // Clear / Mainly clear (0, 1)
  if (currentCode === 0 || currentCode === 1) {
    return '☀️';
  }

  // Partly cloudy (2)
  if (currentCode === 2) {
    return '⛅';
  }

  // Overcast / Fog (3, 45, 48)
  return '☁️';
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
