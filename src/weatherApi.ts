// ─── Weather API Service ─────────────────────────────────────────────────────
// Uses OpenWeatherMap free tier to fetch real weather for F1 circuit locations.
// Falls back to intelligent simulation when no API key is provided.

// Map of F1 circuits to their GPS coordinates
export const TRACK_COORDINATES: Record<string, { lat: number; lon: number; city: string; country: string }> = {
  'Circuit de Monaco': { lat: 43.7347, lon: 7.4206, city: 'Monaco', country: 'MC' },
  'Silverstone': { lat: 52.0786, lon: -1.0169, city: 'Silverstone', country: 'GB' },
  'Monza': { lat: 45.6156, lon: 9.2811, city: 'Monza', country: 'IT' },
  'Spa-Francorchamps': { lat: 50.4372, lon: 5.9714, city: 'Spa', country: 'BE' },
  'Suzuka': { lat: 34.8431, lon: 136.5406, city: 'Suzuka', country: 'JP' },
  'Interlagos': { lat: -23.7036, lon: -46.6997, city: 'São Paulo', country: 'BR' },
  'COTA': { lat: 30.1328, lon: -97.6411, city: 'Austin', country: 'US' },
  'Yas Marina': { lat: 24.4672, lon: 54.6031, city: 'Abu Dhabi', country: 'AE' },
  'Bahrain': { lat: 26.0325, lon: 50.5106, city: 'Sakhir', country: 'BH' },
  'Jeddah': { lat: 21.6319, lon: 39.1044, city: 'Jeddah', country: 'SA' },
  'Melbourne': { lat: -37.8497, lon: 144.9680, city: 'Melbourne', country: 'AU' },
  'Barcelona': { lat: 41.5700, lon: 2.2611, city: 'Barcelona', country: 'ES' },
  'Singapore': { lat: 1.2914, lon: 103.8640, city: 'Singapore', country: 'SG' },
  'Zandvoort': { lat: 52.3888, lon: 4.5409, city: 'Zandvoort', country: 'NL' },
  'Hungaroring': { lat: 47.5789, lon: 19.2486, city: 'Budapest', country: 'HU' },
};

export interface WeatherData {
  airTemp: number;          // °C
  trackTemp: number;        // estimated from air temp + conditions
  humidity: number;         // %
  windSpeed: number;        // m/s
  windDirection: number;    // degrees
  rainChance: number;       // % (derived from clouds + weather condition)
  condition: 'sunny' | 'cloudy' | 'light-rain' | 'heavy-rain';
  description: string;      // human-readable description
  city: string;
  country: string;
  lastUpdated: string;      // ISO timestamp
  isLive: boolean;          // true = from API, false = simulated fallback
  pressure: number;         // hPa
  visibility: number;       // meters
  gripFactor: number;       // 0-1 - computed grip level affecting lap times
  straightSpeedDelta: number; // km/h adjustment from wind
}

// ─── API Key Management ──────────────────────────────────────────────────────
// Users can set their own OpenWeatherMap API key (free tier = 1000 calls/day)
let _apiKey: string = '';

export function setWeatherApiKey(key: string) {
  _apiKey = key.trim();
  // Persist in localStorage
  try { localStorage.setItem('racemind_weather_api_key', _apiKey); } catch {}
}

export function getWeatherApiKey(): string {
  if (_apiKey) return _apiKey;
  try {
    const stored = localStorage.getItem('racemind_weather_api_key');
    if (stored) { _apiKey = stored; return _apiKey; }
  } catch {}
  return '';
}

export function hasWeatherApiKey(): boolean {
  return getWeatherApiKey().length > 10;
}

// ─── Grip & Physics Calculations ─────────────────────────────────────────────

/**
 * Compute grip factor from weather conditions.
 * 1.0 = perfect grip (dry, warm track)
 * Lower = less grip (rain, cold, humidity)
 */
function computeGripFactor(
  airTemp: number,
  humidity: number,
  rainChance: number,
  condition: string,
): number {
  let grip = 1.0;

  // Temperature effect: optimal F1 tire temp window is ~25-35°C air
  if (airTemp < 15) grip -= 0.08;
  else if (airTemp < 20) grip -= 0.04;
  else if (airTemp > 40) grip -= 0.03;

  // Humidity effect: high humidity reduces mechanical grip
  if (humidity > 80) grip -= 0.06;
  else if (humidity > 60) grip -= 0.03;

  // Rain effect: biggest factor
  if (condition === 'heavy-rain') grip -= 0.35;
  else if (condition === 'light-rain') grip -= 0.20;
  else if (rainChance > 60) grip -= 0.05; // damp track

  return Math.max(0.45, Math.min(1.0, grip));
}

/**
 * Compute straight-line speed adjustment from wind.
 * Headwinds slow the car, tailwinds speed it up (simplified model).
 */
function computeWindEffect(windSpeed: number): number {
  // Simplified: wind causes drag variations up to ±5 km/h at high speeds
  // In practice this maps to ~0.1-0.4s per lap
  return windSpeed > 10 ? -(windSpeed - 10) * 0.3 : windSpeed * 0.1;
}

// ─── Live Weather Fetch ──────────────────────────────────────────────────────

/**
 * Fetch live weather data for a given F1 circuit from OpenWeatherMap.
 * Falls back gracefully if the API key is missing or request fails.
 */
export async function fetchTrackWeather(
  trackName: string,
): Promise<WeatherData | null> {
  const apiKey = getWeatherApiKey();
  const coords = TRACK_COORDINATES[trackName];
  if (!coords) {
    console.warn(`[Weather] Unknown track: ${trackName}. Using Monaco.`);
  }

  const { lat, lon, city, country } = coords || TRACK_COORDINATES['Circuit de Monaco'];

  // If no API key, return simulated weather
  if (!apiKey) {
    return generateSimulatedWeather(trackName);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Weather] API error: ${response.status} ${response.statusText}`);
      return generateSimulatedWeather(trackName);
    }

    const data = await response.json();

    // Extract weather data
    const airTemp = Math.round(data.main.temp);
    const humidity = data.main.humidity;
    const windSpeed = data.wind?.speed || 0;
    const windDirection = data.wind?.deg || 0;
    const clouds = data.clouds?.all || 0;
    const weatherId = data.weather?.[0]?.id || 800;
    const weatherDesc = data.weather?.[0]?.description || 'clear sky';
    const pressure = data.main?.pressure || 1013;
    const visibility = data.visibility || 10000;

    // Estimate track temperature (track is typically 15-25°C hotter than air in sun, less in rain)
    const trackTempBonus = weatherId < 700 ? 8 : weatherId < 800 ? 12 : clouds > 60 ? 15 : 20;
    const trackTemp = Math.round(airTemp + trackTempBonus);

    // Calculate rain chance from weather condition codes + cloud coverage
    let rainChance = 0;
    if (weatherId >= 200 && weatherId < 300) rainChance = 95;
    else if (weatherId >= 300 && weatherId < 400) rainChance = 70;
    else if (weatherId >= 500 && weatherId < 600) rainChance = 90;
    else if (weatherId >= 600 && weatherId < 700) rainChance = 40;
    else if (weatherId >= 700 && weatherId < 800) rainChance = 30;
    else rainChance = Math.min(60, Math.round(clouds * 0.6));

    // Map to our weather condition
    let condition: WeatherData['condition'];
    if (rainChance > 80) condition = 'heavy-rain';
    else if (rainChance > 50) condition = 'light-rain';
    else if (clouds > 50) condition = 'cloudy';
    else condition = 'sunny';

    const gripFactor = computeGripFactor(airTemp, humidity, rainChance, condition);
    const straightSpeedDelta = computeWindEffect(windSpeed);

    return {
      airTemp,
      trackTemp,
      humidity,
      windSpeed,
      windDirection,
      rainChance,
      condition,
      description: weatherDesc,
      city,
      country,
      lastUpdated: new Date().toISOString(),
      isLive: true,
      pressure,
      visibility,
      gripFactor,
      straightSpeedDelta,
    };
  } catch (error) {
    console.error('[Weather] Fetch failed:', error);
    return generateSimulatedWeather(trackName);
  }
}

// ─── Simulated Weather (Fallback) ────────────────────────────────────────────

/**
 * Generate realistic simulated weather based on track location & time of year.
 * Used when no API key is available — still physics-accurate for demonstration.
 */
export function generateSimulatedWeather(trackName: string): WeatherData {
  const coords = TRACK_COORDINATES[trackName] || TRACK_COORDINATES['Circuit de Monaco'];
  const { lat, city, country } = coords;

  // Base temperatures from latitude (rough climate model)
  const month = new Date().getMonth(); // 0-11
  const isNorthernHemisphere = lat > 0;
  const isSummer = isNorthernHemisphere ? (month >= 4 && month <= 9) : (month <= 3 || month >= 10);

  let baseTemp = 25;
  if (Math.abs(lat) > 45) baseTemp = isSummer ? 22 : 12;       // High latitude
  else if (Math.abs(lat) > 30) baseTemp = isSummer ? 30 : 18;  // Mid latitude
  else if (Math.abs(lat) > 15) baseTemp = isSummer ? 35 : 28;  // Subtropical
  else baseTemp = 32;                                            // Tropical

  const airTemp = Math.round(baseTemp + (Math.random() - 0.5) * 6);

  // Humidity from geography
  let humidity: number;
  if (['Singapore', 'Interlagos', 'Melbourne'].includes(trackName)) {
    humidity = Math.round(65 + Math.random() * 25); // Humid climates
  } else if (['Bahrain', 'Jeddah', 'Yas Marina'].includes(trackName)) {
    humidity = Math.round(25 + Math.random() * 20); // Arid
  } else {
    humidity = Math.round(40 + Math.random() * 30);
  }

  const windSpeed = parseFloat((Math.random() * 8 + 1).toFixed(1));
  const windDirection = Math.round(Math.random() * 360);

  // Rain probability varies by track reputation
  let rainBase = 15;
  if (['Spa-Francorchamps', 'Silverstone', 'Interlagos', 'Singapore'].includes(trackName)) {
    rainBase = 35; // Notoriously rainy tracks
  } else if (['Bahrain', 'Jeddah', 'Yas Marina'].includes(trackName)) {
    rainBase = 5;  // Almost never rains
  }
  const rainChance = Math.round(Math.max(0, Math.min(100, rainBase + (Math.random() - 0.4) * 30)));

  let condition: WeatherData['condition'];
  if (rainChance > 80) condition = 'heavy-rain';
  else if (rainChance > 50) condition = 'light-rain';
  else if (rainChance > 30 || humidity > 60) condition = 'cloudy';
  else condition = 'sunny';

  const trackTempBonus = condition === 'heavy-rain' ? 8 : condition === 'light-rain' ? 12 : condition === 'cloudy' ? 15 : 22;
  const trackTemp = Math.round(airTemp + trackTempBonus);

  const descriptions: Record<string, string[]> = {
    'sunny': ['clear sky', 'few clouds', 'sunshine'],
    'cloudy': ['scattered clouds', 'overcast clouds', 'broken clouds'],
    'light-rain': ['light rain', 'drizzle', 'light shower'],
    'heavy-rain': ['heavy rain', 'thunderstorm', 'heavy shower'],
  };
  const descOptions = descriptions[condition] || ['clear sky'];
  const description = descOptions[Math.floor(Math.random() * descOptions.length)];

  const gripFactor = computeGripFactor(airTemp, humidity, rainChance, condition);
  const straightSpeedDelta = computeWindEffect(windSpeed);

  return {
    airTemp,
    trackTemp,
    humidity,
    windSpeed,
    windDirection,
    rainChance,
    condition,
    description,
    city,
    country,
    lastUpdated: new Date().toISOString(),
    isLive: false,
    pressure: Math.round(1013 + (Math.random() - 0.5) * 20),
    visibility: condition.includes('rain') ? Math.round(3000 + Math.random() * 5000) : 10000,
    gripFactor,
    straightSpeedDelta,
  };
}

/** Get all available track names for the dropdown */
export function getAvailableTracks(): string[] {
  return Object.keys(TRACK_COORDINATES);
}

/** Check if the weather API is reachable with current key */
export async function testWeatherApiKey(key: string): Promise<boolean> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=43.73&lon=7.42&appid=${key}&units=metric`;
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}
