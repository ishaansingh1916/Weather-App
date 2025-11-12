// ---------- Helper utilities ----------
async function geocodeCity(city){
  // search returns results array; we ask for 1 result
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error('City not found');
  return data.results[0]; // contains name, latitude, longitude, country
}

async function fetchCurrentWeather(lat, lon){
  // timezone=auto attempts to return local times
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather request failed');
  return res.json();
}

function weatherCodeToText(code){
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Moderate showers',
    95: 'Thunderstorm'
  };
  return map[code] || 'Weather code: ' + code;
}

// ---------- DOM references ----------
const cityTitle = document.getElementById('cityTitle');
const cityMeta = document.getElementById('cityMeta');
const tempBig = document.getElementById('tempBig');
const descriptionEl = document.getElementById('description');
const tempBox = document.getElementById('tempBox');
const windBox = document.getElementById('windBox');
const timeBox = document.getElementById('timeBox');
const citySearch = document.getElementById('citySearch');
const searchBtn = document.getElementById('searchBtn');
const otherTableBody = document.querySelector('#otherTable tbody');
const howTo = document.getElementById('howTo');
const howBtn = document.getElementById('howBtn');

// Toggle dropdown
howBtn.addEventListener('click', (e)=>{
  howTo.classList.toggle('open');
});
// Close dropdown when clicking outside
document.addEventListener('click', (e)=>{
  if (!howTo.contains(e.target)) howTo.classList.remove('open');
});

// Preset cities to show in other cities table
const presetCities = [
  { name: 'Bengaluru' },
  { name: 'Kolkata' },
  { name: 'Hyderabad' },
  { name: 'Pune' },
  { name: 'Ahmedabad' }
];

// Immediately populate other cities table (async)
async function populateOtherCities(){
  otherTableBody.innerHTML = '<tr><td colspan="3" style="color:var(--muted)">Loading...</td></tr>';
  const rows = [];
  for (const c of presetCities){
    try{
      const geo = await geocodeCity(c.name);
      const weatherResp = await fetchCurrentWeather(geo.latitude, geo.longitude);
      const w = weatherResp.current_weather;
      rows.push(`<tr><td>${geo.name}, ${geo.country}</td><td>${w.temperature.toFixed(1)}</td><td>${w.windspeed.toFixed(1)}</td></tr>`);
    }catch(err){
      rows.push(`<tr><td>${c.name}</td><td colspan="2" style="color:var(--muted)">Could not load</td></tr>`);
    }
  }
  otherTableBody.innerHTML = rows.join('');
}

// Search logic (city string)
async function showCityWeather(city){
  try{
    cityTitle.textContent = 'Loading...';
    cityMeta.textContent = `Searching for "${city}"...`;
    tempBig.textContent = '— °C';
    descriptionEl.textContent = '—';
    tempBox.textContent = 'Temp —';
    windBox.textContent = 'Wind —';
    timeBox.textContent = 'Time —';

    const geo = await geocodeCity(city);
    const weatherResp = await fetchCurrentWeather(geo.latitude, geo.longitude);

    const current = weatherResp.current_weather;
    const desc = weatherCodeToText(current.weathercode);

    cityTitle.textContent = `${geo.name}, ${geo.country || ''}`;
    cityMeta.textContent = `Coordinates: ${geo.latitude.toFixed(3)}, ${geo.longitude.toFixed(3)}`;
    tempBig.textContent = `${current.temperature.toFixed(1)} °C`;
    descriptionEl.textContent = desc;
    tempBox.textContent = `Temp: ${current.temperature.toFixed(1)} °C`;
    windBox.textContent = `${current.windspeed.toFixed(1)} km/h`;
    timeBox.textContent = (current.time || new Date().toISOString()).replace('T',' ').replace('Z','');

  } catch (err){
    console.error(err);
    cityTitle.textContent = 'City not found';
    cityMeta.textContent = err.message || 'Could not fetch weather';
    tempBig.textContent = '— °C';
    descriptionEl.textContent = '—';
    tempBox.textContent = 'Temp —';
    windBox.textContent = 'Wind —';
    timeBox.textContent = 'Time —';
  }
}

// Search button handler
searchBtn.addEventListener('click', () => {
  const city = citySearch.value.trim();
  if (!city) {
    cityMeta.textContent = 'Please type a city name.';
    return;
  }
  showCityWeather(city);
});

// Enter key on input
citySearch.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

// Preset city links in How To Use menu
document.querySelectorAll('.city-option').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    howTo.classList.remove('open');
    const city = a.dataset.city;
    citySearch.value = city;
    showCityWeather(city);
  });
});

// Use geolocation (browser)
document.getElementById('useMyLocation').addEventListener('click', ()=>{
  if (!navigator.geolocation) {
    alert('Geolocation not supported in this browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos)=>{
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    try {
      const weatherResp = await fetchCurrentWeather(lat, lon);
      const cur = weatherResp.current_weather;
      cityTitle.textContent = `Your location`;
      cityMeta.textContent = `Coordinates: ${lat.toFixed(3)}, ${lon.toFixed(3)}`;
      tempBig.textContent = `${cur.temperature.toFixed(1)} °C`;
      descriptionEl.textContent = weatherCodeToText(cur.weathercode);
      tempBox.textContent = `Temp: ${cur.temperature.toFixed(1)} °C`;
      windBox.textContent = `${cur.windspeed.toFixed(1)} km/h`;
      timeBox.textContent = (cur.time || new Date().toISOString()).replace('T',' ').replace('Z','');
    } catch (err){
      alert('Unable to fetch weather for your location.');
    }
  }, (err)=>{
    alert('Permission denied or position unavailable.');
  });
});

// Initialize
(function init(){
  showCityWeather('Bengaluru'); // load a default
  populateOtherCities();
})();
