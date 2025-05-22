// Coordinates of each airport by IATA code
// Data source: Airport coordinates from https://ourairports.com/data/
const airportCoordinates = {
    ATL: {lat: 33.6407, lon: -84.4277},
    GRU: {lat: -23.4356, lon: -46.4731},
    DEN: {lat: 39.8561, lon: -104.6737},
    JNB: {lat: -26.1369, lon: 28.246},
    LAX: {lat: 33.9416, lon: -118.4085},
    PEK: {lat: 40.0799, lon: 116.6031},
    DXB: {lat: 25.2532, lon: 55.3657},
    LHR: {lat: 51.4700, lon: -0.4543},
    SYD: {lat: -33.9399, lon: 151.1753},
    CDG: {lat: 49.0097, lon: 2.5479}
};

// Updated aircraft categories with seating capacity, max range, and fuel burn formulas
// Data source: Aircraft manufacturers' specifications and industry averages
const aircraftCategories = {
    "Piston": { 
        seats: 9, 
        maxRange: 1000, 
        fuelBurn: dist => 40 + 0.16 * dist,
        description: "Small private aircraft"
    },
    "Turboprop": { 
        seats: 70, 
        maxRange: 2000, 
        fuelBurn: dist => 300 + 0.85 * dist,
        description: "Regional aircraft for short routes"
    },
    "Regional Jet": { 
        seats: 100, 
        maxRange: 3500, 
        fuelBurn: dist => 1000 + 0.8 * dist,
        description: "Small commercial jets"
    },
    "Narrow-body Jet": { 
        seats: 180, 
        maxRange: 6000, 
        fuelBurn: dist => 4500 + 8.52 * dist,
        description: "Standard commercial aircraft (Boeing 737, Airbus A320)"
    },
    "Wide-body Jet": { 
        seats: 250, 
        maxRange: 17000, 
        fuelBurn: dist => 6000 + 9.00 * dist,
        description: "Long-haul aircraft (Boeing 777, Airbus A330)"
    }
};

/**
 * Convertion of degrees to radians
 * @param {number} deg - Angle in degrees
 * @return {number} Angle in radians
 */
function toRadians(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Calculate the great-circle distance between two airports using Haversine formula
 * Reference: Haversine formula implementation adapted from
 * https://www.movable-type.co.uk/scripts/latlong.html * 
 * @param {object} coord1 - {lat, lon} of first airport
 * @param {object} coord2 - {lat, lon} of second airport
 * @return {number} Distance in kilometers
 */
function calculateDistance(coord1, coord2) {
    const R = 6371.2; // Earth radius in kilometers
    const dLat = toRadians(coord2.lat - coord1.lat);
    const dLon = toRadians(coord2.lon - coord1.lon);
    const lat1 = toRadians(coord1.lat);
    const lat2 = toRadians(coord2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return (R * c); // Distance in kilometers
}

/**
 * Convert geographic coordinates to canvas pixel coordinates
 * Reference: Equirectangular projection
 * @param {object} coordinates - {lat, lon} coordinates
 * @return {object} {x, y} pixel coordinates on canvas
 */
function convertLatLonToCanvas({ lat, lon }) {
    const x = ((lon + 180) * (canvas.width / 360));
    const y = ((90 - lat) * (canvas.height / 180));
    
    return { x, y };
}

/**
 * Calculate CO2 emissions based on fuel burn
 * Conversion factor: 1 kg of jet fuel produces approximately 3.16 kg of CO2
 * Reference: ICAO environmental standards
 * 
 * @param {number} fuelBurn - Fuel consumption in kg
 * @return {number} CO2 emissions in kg
 */
function calculateCO2Emissions(fuelBurn) {
    return fuelBurn * 3.16; // CO2 emissions in kg
}

/**
 * Calculate per passenger fuel burn and CO2 emissions
 * @param {number} fuelBurn - Total fuel burn in kg
 * @param {number} co2Emissions - Total CO2 emissions in kg
 * @param {number} seats - Number of seats in aircraft
 * @return {object} Per passenger fuel burn and CO2 emissions
 */
function calculatePerPassenger(fuelBurn, co2Emissions, seats) {
    const fuelBurnPerPassenger = fuelBurn / seats;
    const co2PerPassenger = co2Emissions / seats;
    
    return { fuelBurnPerPassenger, co2PerPassenger };
}

// Get canvas element and context for drawing
// Canvas API reference: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

/**
 * Load the world map image
 * Image source: Natural Earth / NASA Blue Marble adapted to equirectangular projection
 * License: Public domain (NASA imagery)
 */
const mapImage = new Image();
mapImage.src = 'assets/images/1280px-Equirectangular_projection_SW.jpg';

mapImage.onload = function() {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
};

/**
 * Draw airport code label with background next to each point
 * @param {object} coordinates - {x, y} coordinates on canvas
 * @param {string} label - Text to display
 * @param {string} color - Color of the text
 */
function drawLabel({ x, y }, label, color) {
    ctx.font = "14px Arial";
    const textWidth = ctx.measureText(label).width;
    const padding = 4;
    const textHeight = 16;

    // Draw white background for label
    ctx.fillStyle = "white";
    ctx.fillRect(x + 8 - padding, y - 8 - textHeight, textWidth + padding * 2, textHeight + padding);

    // Draw label text
    ctx.fillStyle = color;
    ctx.fillText(label, x + 8, y - 8);
}

/**
 * Draw line between two points on canvas
 * @param {object} p1 - {x, y} start point
 * @param {object} p2 - {x, y} end point
 */
function drawLine(p1, p2) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * Draw a dot on the canvas at specified coordinates
 * Canvas drawing reference: 
 * @param {object} coordinates - {x, y} coordinates on canvas
 * @param {string} color - Color of the dot
 */
function drawDot({ x, y }, color) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

/**
 * Draw the distance label at the midpoint of the route line
 * @param {object} p1 - {x, y} start point
 * @param {object} p2 - {x, y} end point
 * @param {number} distance - Distance in kilometers
 */
function drawDistanceLabel(p1, p2, distance) {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    const padding = 5;
    ctx.font = "14px Arial";
    const text = `${distance} km`;
    const textWidth = ctx.measureText(text).width;
    const textHeight = 16;

    // Draw background rectangle for distance label
    ctx.fillStyle = "yellow";
    ctx.fillRect(midX - textWidth / 2 - padding, midY - textHeight / 2 - padding, textWidth + padding * 2, textHeight + padding);

    // Draw the distance text
    ctx.fillStyle = "black";
    ctx.fillText(text, midX - textWidth / 2, midY + textHeight / 4);
}

/**
 * Create aircraft information card HTML
 * @param {string} aircraftName - Name of the aircraft
 * @param {object} aircraftData - Aircraft specifications
 * @param {number} fuelBurn - Calculated fuel burn for the route
 * @return {string} HTML string for aircraft card
 */
function createAircraftCard(aircraftName, aircraftData, fuelBurn) {
    return `
        <div class="aircraft-card">
            <h4>Suitable aircraft: ${aircraftName} - ${aircraftData.description}</h4>
            
            <div class="aircraft-specs-grid">
                <div class="spec-metric">
                    <div class="spec-number">${aircraftData.seats.toLocaleString()}</div>
                    <div class="spec-label">Seats</div>
                </div>
                <div class="spec-metric">
                    <div class="spec-number">${aircraftData.maxRange.toLocaleString()}</div>
                    <div class="spec-label">Max Range (km)</div>
                </div>
                <div class="spec-metric">
                    <div class="spec-number">${Math.round(fuelBurn).toLocaleString()}</div>
                    <div class="spec-label">Total Fuel Burn (kg)</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create emissions data card HTML
 * @param {number} co2Emissions - Total CO2 emissions
 * @param {object} perPassenger - Per passenger calculations
 * @return {string} HTML string for emissions card
 */
function createEmissionsCard(co2Emissions, perPassenger) {
    return `
        <div class="emissions-card">
            <h4>Emissions Data</h4>
            <div class="emissions-grid">
                <div class="emission-metric">
                    <div class="emission-number">${Math.round(co2Emissions).toLocaleString()} kg</div>
                    <div class="emission-label">Total CO₂ Emissions</div>
                </div>
                <div class="emission-metric">
                    <div class="emission-number">${perPassenger.fuelBurnPerPassenger.toFixed(1)} kg</div>
                    <div class="emission-label">Fuel per Passenger</div>
                </div>
                <div class="emission-metric">
                    <div class="emission-number">${perPassenger.co2PerPassenger.toFixed(1)} kg</div>
                    <div class="emission-label">CO₂ per Passenger</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Display aircraft suitability and emissions analysis with separated cards
 * @param {number} distance - Flight distance in kilometers
 * @param {string} departureCode - Departure airport code
 * @param {string} arrivalCode - Arrival airport code
 */
function displayAircraftSuitability(distance, departureCode, arrivalCode) {
    // Add distance information in the same row as Flight Analysis title
    let resultsHTML = `<h3>Flight Analysis: ${departureCode} → ${arrivalCode} - ${distance.toLocaleString()} km</h3>`;

    let hasSuitableAircraft = false;
    let idealAircraft = null;
    let idealAircraftData = null;

    // Find the most suitable (smallest) aircraft that can handle the route
    for (const [category, data] of Object.entries(aircraftCategories)) {
        if (distance <= data.maxRange) {
            if (!idealAircraft) {
                idealAircraft = category;
                idealAircraftData = data;
                hasSuitableAircraft = true;
            }
        }
    }

    if (hasSuitableAircraft && idealAircraftData) {
        const fuelBurn = idealAircraftData.fuelBurn(distance);
        const co2Emissions = calculateCO2Emissions(fuelBurn);
        const perPassenger = calculatePerPassenger(fuelBurn, co2Emissions, idealAircraftData.seats);

        // Create aircraft and emissions cards using separate functions
        resultsHTML += createAircraftCard(idealAircraft, idealAircraftData, fuelBurn);
        resultsHTML += createEmissionsCard(co2Emissions, perPassenger);
    } else {
        resultsHTML += `
            <div class="no-aircraft-warning">
                <h4>⚠️ Route Not Feasible</h4>
                <p>No aircraft in our database has sufficient range to fly this route directly.</p>
                <p>This route would require refueling stops or alternative transportation methods.</p>
            </div>
        `;
    }

    // Display the results
    document.getElementById("aircraft-info").innerHTML = resultsHTML;
    
    // Show results container
    const resultsContainer = document.querySelector(".results-container");
    resultsContainer.classList.add("show");
}

/**
 * Main function to display route map and calculate emissions
 * Handles user input validation and orchestrates the display
 */
function displayMap() {
    const departureCode = document.getElementById("departure-airport").value;
    const arrivalCode = document.getElementById("arrival-airport").value;
    const errorDiv = document.getElementById("error-message");
    const resultsContainer = document.querySelector(".results-container");

    // Clear previous error message and aircraft info
    errorDiv.textContent = "";
    errorDiv.style.display = "none";
    document.getElementById("aircraft-info").textContent = "";
    resultsContainer.classList.remove("show");

    // Input validation
    if (!departureCode || !arrivalCode) {
        errorDiv.textContent = "Please select both departure and arrival airports.";
        errorDiv.style.display = "block";
        return;
    }

    // Check if the departure and arrival airports are the same
    if (departureCode === arrivalCode) {
        errorDiv.textContent = "Error: Departure and arrival airports cannot be the same.";
        errorDiv.style.display = "block";
        return;
    }

    // Proceed with calculations if validation passes
    if (departureCode && arrivalCode) {
        const departureCoords = airportCoordinates[departureCode];
        const arrivalCoords = airportCoordinates[arrivalCode];

        // Clear canvas and draw the map image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

       // Convert geographic coordinates to canvas coordinates
        const depCanvasCoords = convertLatLonToCanvas(departureCoords);
        const arrCanvasCoords = convertLatLonToCanvas(arrivalCoords);

        // Draw the route elements
        drawLine(depCanvasCoords, arrCanvasCoords);
        drawDot(depCanvasCoords, "green");
        drawLabel(depCanvasCoords, `Origin: ${departureCode}`, "green");
        drawDot(arrCanvasCoords, "red");
        drawLabel(arrCanvasCoords, `Destination: ${arrivalCode}`, "red");

        // Calculate and display distance
        const distanceKm = Math.round(calculateDistance(departureCoords, arrivalCoords));
        drawDistanceLabel(depCanvasCoords, arrCanvasCoords, distanceKm);

        // Analyze aircraft suitability and calculate emissions
        displayAircraftSuitability(distanceKm, departureCode, arrivalCode);
    }
}

// Update event listener to call displayMap
document.getElementById("calculate-button").addEventListener("click", displayMap);