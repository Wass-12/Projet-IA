const axios = require('axios')

const BASE_URL = 'https://api.openweathermap.org/data/2.5'

/**
 * Récupère les données météo actuelles pour une position GPS
 * @returns {{ temp, feels_like, description, rain, uvi, icon }}
 */
async function getCurrentWeather(lat, lng) {
  const { data } = await axios.get(`${BASE_URL}/weather`, {
    params: {
      lat,
      lon: lng,
      appid: process.env.OPENWEATHER_API_KEY,
      units: 'metric',
      lang: 'fr'
    }
  })

  return {
    temp:        Math.round(data.main.temp),
    feels_like:  Math.round(data.main.feels_like),
    humidity:    data.main.humidity,
    description: data.weather[0].description,
    icon:        data.weather[0].icon,
    rain:        data.rain != null || data.weather[0].main === 'Rain' || data.weather[0].main === 'Drizzle',
    wind_speed:  Math.round(data.wind?.speed * 3.6), // m/s → km/h
    city:        data.name
  }
}

/**
 * Détermine la fourchette de température recommandée selon le ressenti
 * et la sensibilité thermique de l'utilisateur
 */
function getEffectiveTempRange(feelsLike, thermalSensitivity = 0) {
  // Ajustement selon sensibilité : -2 frileux = ressenti -4°, +2 chaud = ressenti +4°
  const adjusted = feelsLike + (thermalSensitivity * 2)
  return {
    tempMin: adjusted - 5,
    tempMax: adjusted + 5
  }
}

/**
 * Détermine la saison selon la date
 */
function getSeason(date = new Date()) {
  const month = date.getMonth() + 1
  if (month >= 3 && month <= 5)  return 'printemps'
  if (month >= 6 && month <= 8)  return 'ete'
  if (month >= 9 && month <= 11) return 'automne'
  return 'hiver'
}

module.exports = { getCurrentWeather, getEffectiveTempRange, getSeason }
