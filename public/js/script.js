// Ensure Socket.IO is loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // Ensure socket.io and Leaflet are available
    if (!io || !L) {
        console.error('Socket.IO or Leaflet not loaded');
        return;
    }

    // Initialize socket connection
    const socket = io();

    // Initialize the map
    const map = L.map("map").setView([0, 0], 16);

    // Add a tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap Contributors"
    }).addTo(map);

    const markers = {}; // Object to store markers by ID

    // Function to create or update marker
    function upsertMarker(id, latitude, longitude) {
        try {
            // Validate coordinates
            if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                console.warn('Invalid coordinates received', { id, latitude, longitude });
                return;
            }

            if (markers[id]) {
                // If the marker exists, update its position
                markers[id].setLatLng([latitude, longitude]);
            } else {
                // If the marker doesn't exist, create a new one
                markers[id] = L.marker([latitude, longitude]).addTo(map);
            }

            // Optional: Add a popup with user ID
            if (markers[id]) {
                markers[id].bindPopup(`User: ${id}`).openPopup();
            }
        } catch (error) {
            console.error('Error updating marker:', error);
        }
    }

    // Handle receiving location data
    socket.on("receive-location", (data) => {
        const { id, latitude, longitude } = data;

        if (!id) {
            console.warn('Received location without an ID');
            return;
        }

        // Create or update marker
        upsertMarker(id, latitude, longitude);

        // Optional: Center map on the latest location
        // Comment out if you don't want the map to constantly recenter
        map.setView([latitude, longitude], 16);
    });

    // Handle user disconnection
    socket.on("user-disconnected", (id) => {
        if (markers[id]) {
            // If the marker exists, remove it from the map
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    });

    // Start geolocation tracking
    if (navigator.geolocation) {
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        // Track position
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    
                    // Validate coordinates before sending
                    if (typeof latitude === 'number' && typeof longitude === 'number') {
                        socket.emit("send-location", { latitude, longitude });
                    } else {
                        console.warn('Invalid coordinates', position.coords);
                    }
                } catch (error) {
                    console.error('Error processing geolocation:', error);
                }
            }, 
            (error) => {
                // More detailed error handling
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        console.error("User denied the request for Geolocation.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        console.error("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        console.error("The request to get user location timed out.");
                        break;
                    case error.UNKNOWN_ERROR:
                        console.error("An unknown error occurred.");
                        break;
                }
            }, 
            geoOptions
        );

        // Optional: Handle page unload to clear watch
        window.addEventListener('beforeunload', () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        });
    } else {
        console.error("Geolocation is not supported by this browser.");
    }
});