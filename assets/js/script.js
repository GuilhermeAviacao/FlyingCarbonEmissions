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
 * https://www.movable-type.co.uk/scripts/latlong.html
 * 
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

// Get canvas element and context for drawing
// Canvas API reference: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

/**
 * Convert geographic coordinates to canvas pixel coordinates
 * Reference: Equirectangular projection - https://en.wikipedia.org/wiki/Equirectangular_projection
 * @param {object} param0 - {lat, lon} coordinates
 * @return {object} {x, y} pixel coordinates on canvas
 */
function convertLatLonToCanvas({ lat, lon }) {
    const x = ((lon + 180) * (canvas.width / 360));
    const y = ((90 - lat) * (canvas.height / 180));
    
    return { x, y };
}

/**
 * Draw a dot on the canvas at specified coordinates
 * Canvas drawing reference: 
 * https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes
 * 
 * @param {object} param0 - {x, y} coordinates on canvas
 * @param {string} color - Color of the dot
 */
function drawDot({ x, y }, color) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

/**
 * Draw a line between two points on the canvas
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
 * Draw a text label at specified coordinates
 * Text drawing reference:
 * https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_text
 * 
 * @param {object} param0 - {x, y} coordinates on canvas
 * @param {string} label - Text to display
 * @param {string} color - Color of the text
 */

function drawLabel({ x, y }, label, color) {
    ctx.font = "14px Arial";
    ctx.fillStyle = color;
    ctx.fillText(label, x + 8, y - 8);
}

/**
 * Load the world map image
 * Image source: Natural Earth / NASA Blue Marble adapted to equirectangular projection
 * Original source: https://visibleearth.nasa.gov/collection/1484/blue-marble
 * License: Public domain (NASA imagery)
 */

const mapImage = new Image();
mapImage.src = 'assets/images/1280px-Equirectangular_projection_SW.jpg';

// Handle image loading
mapImage.onload = function() {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
};

/**
 * Draw the distance label at the midpoint of the route line
 * @param {object} p1 - {x, y} start point
 * @param {object} p2 - {x, y} end point
 * @param {number} distance - Distance in kilometers
 */

function drawDistanceLabel(p1, p2, distance) {
    // Calculate midpoint of the line
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    ctx.font = "14px Arial";
    const text = `${distance} km`;
    const textWidth = ctx.measureText(text).width;

    // Draw background rectangle for better readability
    ctx.fillStyle = "yellow";
    ctx.fillRect(midX - textWidth / 2 - 5, midY - 10, textWidth + 10, 20);

    // Draw text
    ctx.fillStyle = "black";
    ctx.fillText(text, midX - textWidth / 2, midY + 5);
}



/**
 * Display the route on the map canvas
 */

function displayMap() {
    const departureCode = document.getElementById("departure-airport").value;
    const arrivalCode = document.getElementById("arrival-airport").value;
    
    if (departureCode && arrivalCode) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // filling with blue color before plotting on the map
        ctx.fillStyle = "#e8f4f8";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
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
        drawLabel(depCanvasCoords, departureCode, "green");
        drawDot(arrCanvasCoords, "red");
        drawLabel(arrCanvasCoords, arrivalCode, "red");
        
        // Calculate and display distance
        const distanceKm = Math.round(calculateDistance(departureCoords, arrivalCoords));
        document.getElementById("aircraft-info").textContent = 
            `Distance: ${distanceKm} km`;
        
        // Add distance label on the route
        drawDistanceLabel(depCanvasCoords, arrCanvasCoords, distanceKm);
    }
}

// Update event listener to call displayMap
document.getElementById("calculate-button").addEventListener("click", displayMap);