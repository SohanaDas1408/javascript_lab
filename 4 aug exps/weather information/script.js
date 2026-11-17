const locationData = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "Ziro", "Pasighat"],
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
    "Chandigarh": ["Chandigarh"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba"],
    "Delhi": ["New Delhi"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
    "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Solan", "Mandi"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Chhatrapati Sambhajinagar"],
    "Manipur": ["Imphal", "Churachandpur", "Thoubal"],
    "Meghalaya": ["Shillong", "Tura", "Nongpoh"],
    "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Puri", "Sambalpur"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
    "Sikkim": ["Gangtok", "Namchi", "Pelling"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
    "Tripura": ["Agartala", "Dharmanagar", "Udaipur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Noida", "Prayagraj"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Nainital", "Rishikesh"],
    "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Asansol"]
};

// DOM Elements
const stateSelect = document.getElementById('state-select');
const citySelect = document.getElementById('city-select');
const getWeatherBtn = document.getElementById('get-weather-btn');
const weatherDisplay = document.getElementById('weather-display');
const weatherContent = document.getElementById('weather-content');
const loader = document.getElementById('loader');

// Initialize States dropdown
function initStates() {
    const states = Object.keys(locationData).sort();
    
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });
}

// Handle State selection change
stateSelect.addEventListener('change', (e) => {
    const selectedState = e.target.value;
    
    // Clear and disable city select if no state is selected
    citySelect.innerHTML = '<option value="" disabled selected>Choose a city...</option>';
    
    if (selectedState) {
        const cities = locationData[selectedState].sort();
        
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
        
        citySelect.disabled = false;
        getWeatherBtn.disabled = true; // reset button until city is chosen
    } else {
        citySelect.disabled = true;
        getWeatherBtn.disabled = true;
    }
});

// Handle City selection change
citySelect.addEventListener('change', (e) => {
    if (e.target.value) {
        getWeatherBtn.disabled = false;
    } else {
        getWeatherBtn.disabled = true;
    }
});

// Fetch weather data (Using Open-Meteo free API)
async function fetchWeather(city) {
    try {
        // Show loader state
        weatherDisplay.classList.remove('hidden');
        weatherContent.innerHTML = '';
        loader.classList.remove('hidden');

        // 1. Geocoding API to get Latitude and Longitude for the City
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City location not found.');
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // 2. Fetch current weather data using coordinates
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&timezone=auto`);
        const weatherData = await weatherResponse.json();
        
        const current = weatherData.current;

        // Hide loader
        loader.classList.add('hidden');
        
        // Render Weather Information
        weatherContent.innerHTML = `
            <div class="weather-city">${name}, ${country}</div>
            <div class="weather-temp">${Math.round(current.temperature_2m)}°C</div>
            <div class="weather-desc">Feels like ${Math.round(current.apparent_temperature)}°C</div>
            
            <div class="weather-details">
                <div class="detail-item">
                    <span class="detail-label">Humidity</span>
                    <span class="detail-value">${current.relative_humidity_2m}%</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Wind Speed</span>
                    <span class="detail-value">${current.wind_speed_10m} km/h</span>
                </div>
            </div>
        `;

    } catch (error) {
        // Handle errors gracefully
        loader.classList.add('hidden');
        weatherContent.innerHTML = `
            <div style="color: #ff5252; padding: 20px;">
                <p>Failed to load weather data.</p>
                <p style="font-size: 0.8rem; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

// Button Click Event
getWeatherBtn.addEventListener('click', () => {
    const selectedCity = citySelect.value;
    if (selectedCity) {
        fetchWeather(selectedCity);
    }
});

// Initialize app
initStates();
