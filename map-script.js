document.addEventListener('DOMContentLoaded', async () => {
    // --- Initialize Map ---
    // Centered on UK. Zoom level 6 is good for showing the whole country.
    const map = L.map('map').setView([54.5, -2.5], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let allPosters = [];
    let markers = L.layerGroup().addTo(map);

    // --- DOM Elements ---
    const searchInput = document.getElementById('map-search');
    const companyFilter = document.getElementById('map-company-filter');
    const trainCheck = document.getElementById('map-train');
    const seasideCheck = document.getElementById('map-seaside');
    const sportsCheck = document.getElementById('map-sports');
    const countSpan = document.getElementById('marker-count');

    // --- Core Logic ---

    const updateMap = () => {
        markers.clearLayers();
        
        const searchVal = searchInput.value.toLowerCase();
        const companyVal = companyFilter.value;
        const onlyTrains = trainCheck.checked;
        const onlySeaside = seasideCheck.checked;
        const onlySports = sportsCheck.checked;

        let visibleCount = 0;

        allPosters.forEach(p => {
            // FIX: Ensure coordinates are treated as numbers (crucial for negative Longitude in West UK)
            const lat = parseFloat(p.Latitude);
            const lng = parseFloat(p.Longitude);

            // Only proceed if we have valid coordinates
            if (!isNaN(lat) && !isNaN(lng)) {
                
                // 1. Search Filter (Title, Location, or Transcription)
                const matchesSearch = !searchVal || 
                    (p.title || "").toLowerCase().includes(searchVal) || 
                    (p.Q4_Location || "").toLowerCase().includes(searchVal) ||
                    (p.Q9_Transcription || "").toLowerCase().includes(searchVal);

                // 2. Company Filter
                const matchesCompany = !companyVal || p.Q5_RailwayCompany === companyVal;

                // 3. Category Filters (Resilient check for 'yes' or 'no' strings)
                const isTrain = (p.Q3_Train || "").toLowerCase() === 'yes';
                const isSeaside = (p.Q7_Seaside || "").toLowerCase() === 'yes';
                const isSports = (p.Q8_Sports || "").toLowerCase() === 'yes';

                const matchesTrain = !onlyTrains || isTrain;
                const matchesSeaside = !onlySeaside || isSeaside;
                const matchesSports = !onlySports || isSports;

                // Combine all logic
                if (matchesSearch && matchesCompany && matchesTrain && matchesSeaside && matchesSports) {
                    
                    // Handle image selection for the popup
                    const rawLinks = p.image_links || "";
                    const links = typeof rawLinks === 'string' ? rawLinks.split(';') : [];
                    const imgSrc = links.find(l => l.includes('large')) || links[0] || '';

                    const marker = L.marker([lat, lng]);
                    
                    // Construct the Popup Content
                    marker.bindPopup(`
                        <div style="width:220px; font-family: sans-serif;">
                            <h3 style="margin:0 0 5px 0; font-size:14px; color:#003366;">${p.title || 'Untitled'}</h3>
                            <p style="margin:0 0 10px 0; font-size:12px;"><b>Location:</b> ${p.Q4_Location}</p>
                            <img src="${imgSrc.trim()}" 
                                 loading="lazy" 
                                 style="width:100%; border-radius:4px; border:1px solid #ddd;"
                                 onerror="this.src='https://via.placeholder.com/200x150?text=Preview+Not+Available'">
                            <div style="margin-top:8px; font-size:11px; color:#666;">
                                <b>Company:</b> ${p.Q5_RailwayCompany}<br>
                                <b>ID:</b> ${p.id}
                            </div>
                        </div>
                    `);

                    markers.addLayer(marker);
                    visibleCount++;
                }
            }
        });

        countSpan.textContent = `Showing: ${visibleCount} locations`;
    };

    const populateCompanyDropdown = (data) => {
        const companies = new Set();
        data.forEach(p => {
            if (p.Q5_RailwayCompany && p.Q5_RailwayCompany !== "N/A") {
                companies.add(p.Q5_RailwayCompany);
            }
        });

        [...companies].sort().forEach(co => {
            const opt = document.createElement('option');
            opt.value = co;
            opt.textContent = co;
            companyFilter.appendChild(opt);
        });
    };

    // --- Initialization ---

    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("Could not load data.json");
        
        allPosters = await response.json();
        
        // Initial setup
        populateCompanyDropdown(allPosters);
        updateMap();

        // Listeners for all inputs
        searchInput.addEventListener('input', updateMap);
        companyFilter.addEventListener('change', updateMap);
        trainCheck.addEventListener('change', updateMap);
        seasideCheck.addEventListener('change', updateMap);
        sportsCheck.addEventListener('change', updateMap);

    } catch (err) {
        console.error("Map initialization error:", err);
        countSpan.textContent = "Error loading map data.";
    }
});
