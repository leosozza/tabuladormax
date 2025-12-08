import { useQuery } from "@tanstack/react-query";

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  precipitationProbability: number;
  isDay: boolean;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
}

export interface WeatherResponse {
  current: WeatherData;
  hourly: HourlyForecast[];
  willRainSoon: boolean;
  rainAlertHour: string | null;
}

// Weather codes from WMO
export const WEATHER_CODES: Record<number, { icon: string; description: string }> = {
  0: { icon: "☀️", description: "Céu limpo" },
  1: { icon: "🌤️", description: "Predominantemente limpo" },
  2: { icon: "⛅", description: "Parcialmente nublado" },
  3: { icon: "☁️", description: "Nublado" },
  45: { icon: "🌫️", description: "Neblina" },
  48: { icon: "🌫️", description: "Neblina com geada" },
  51: { icon: "🌧️", description: "Garoa leve" },
  53: { icon: "🌧️", description: "Garoa moderada" },
  55: { icon: "🌧️", description: "Garoa intensa" },
  56: { icon: "🌧️", description: "Garoa congelante leve" },
  57: { icon: "🌧️", description: "Garoa congelante intensa" },
  61: { icon: "🌧️", description: "Chuva leve" },
  63: { icon: "🌧️", description: "Chuva moderada" },
  65: { icon: "🌧️", description: "Chuva forte" },
  66: { icon: "🌧️", description: "Chuva congelante leve" },
  67: { icon: "🌧️", description: "Chuva congelante intensa" },
  71: { icon: "🌨️", description: "Neve leve" },
  73: { icon: "🌨️", description: "Neve moderada" },
  75: { icon: "🌨️", description: "Neve intensa" },
  77: { icon: "🌨️", description: "Grãos de neve" },
  80: { icon: "🌦️", description: "Pancadas de chuva leves" },
  81: { icon: "🌦️", description: "Pancadas de chuva moderadas" },
  82: { icon: "🌦️", description: "Pancadas de chuva intensas" },
  85: { icon: "🌨️", description: "Pancadas de neve leves" },
  86: { icon: "🌨️", description: "Pancadas de neve intensas" },
  95: { icon: "⛈️", description: "Tempestade" },
  96: { icon: "⛈️", description: "Tempestade com granizo leve" },
  99: { icon: "⛈️", description: "Tempestade com granizo" },
};

export function getWeatherInfo(code: number) {
  return WEATHER_CODES[code] || { icon: "❓", description: "Desconhecido" };
}

export function isRainyWeatherCode(code: number): boolean {
  return code >= 51 && code <= 99;
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,precipitation_probability,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    forecast_hours: "12",
    timezone: "America/Sao_Paulo",
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  
  if (!response.ok) {
    throw new Error("Erro ao buscar dados de clima");
  }

  const data = await response.json();

  const current: WeatherData = {
    temperature: Math.round(data.current.temperature_2m),
    weatherCode: data.current.weather_code,
    windSpeed: Math.round(data.current.wind_speed_10m),
    humidity: data.current.relative_humidity_2m,
    precipitationProbability: data.current.precipitation_probability || 0,
    isDay: data.current.is_day === 1,
  };

  // Parse hourly data
  const hourly: HourlyForecast[] = data.hourly.time
    .slice(0, 12)
    .map((time: string, index: number) => ({
      time,
      temperature: Math.round(data.hourly.temperature_2m[index]),
      weatherCode: data.hourly.weather_code[index],
      precipitationProbability: data.hourly.precipitation_probability[index] || 0,
    }));

  // Check if it will rain in the next 6 hours
  const next6Hours = hourly.slice(0, 6);
  const rainHour = next6Hours.find(
    (h) => h.precipitationProbability > 50 || isRainyWeatherCode(h.weatherCode)
  );

  return {
    current,
    hourly,
    willRainSoon: !!rainHour,
    rainAlertHour: rainHour
      ? new Date(rainHour.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : null,
  };
}

export function useWeather(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ["weather", lat, lng],
    queryFn: () => fetchWeather(lat!, lng!),
    enabled: lat !== null && lng !== null,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchInterval: 10 * 60 * 1000, // Atualizar a cada 10 minutos
    retry: 2,
  });
}
