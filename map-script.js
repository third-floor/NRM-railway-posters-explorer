document.addEventListener('DOMContentLoaded', async () => {
    // --- Initialize Map ---
    // Centered on the UK [Lat, Lng].
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

    // --- Helper Functions ---

    /**
     * UPDATED: Specifically uses the new combined field from the Python script
     */
    const getBestLocation = (p) => {
        return p.Q11_TravelDestinations_Combined || p.Q4_Location || "N/A";
    };

    /**
     * Extracts the best image URL for the popup
     */
    const getImageUrl = (p) => {
        const rawLinks = p.image_links || "";
        const links = typeof rawLinks === 'string' ? rawLinks.split(';') : [];
        const found = links.find(l => l.toLowerCase().includes('large')) || links[0];
        return found ? found.trim() : '';
    };

    /**
     * Updates the map markers based on current filter state
     */
    const updateMap = () => {
        markers.clearLayers();
        
        const searchVal = searchInput?.value.toLowerCase() || "";
        const companyVal = companyFilter?.value || "";
        const onlyTrains = trainCheck?.checked || false;
        const onlySeaside = seasideCheck?.checked || false;
        const onlySports = sportsCheck?.checked || false;

        let visibleCount = 0;

        allPosters.forEach(p => {
            // Lat/Lng are now numbers or null (thanks to Python fix)
            const lat = p.Latitude;
            const lng = p.Longitude;

            // Only plot if coordinates are valid numbers
            if (lat !== null && lng !== null) {
                
                const locText = getBestLocation(p);
                const title = (p.title || "").toLowerCase();
                const transcription = (p.Q9_Transcription || "").toLowerCase();

                // 1. Search Filter
                const matchesSearch = !searchVal || 
                    title.includes(searchVal) || 
                    locText.toLowerCase().includes(searchVal) ||
                    transcription.includes(searchVal);

                // 2. Company Filter
                const matchesCompany = !companyVal || p.Q5_RailwayCompany === companyVal;

                // 3. UPDATED Logic Filters to match new Python column names (_Present)
                const matchesTrain = !onlyTrains || String(p.Q3_Train_Present).toLowerCase() === 'yes';
                const matchesSeaside = !onlySeaside || String(p.Q7_Seaside_Present).toLowerCase() === 'yes';
                const matchesSports = !onlySports || String(p.Q8_Sports_Present).toLowerCase() === 'yes';

                if (matchesSearch && matchesCompany && matchesTrain && matchesSeaside && matchesSports) {
                    const imgSrc = getImageUrl(p);
                    const marker = L.marker([lat, lng]);
                    
                    // Construct Popup
                    marker.bindPopup(`
                        <div style="width:220px; font-family: sans-serif;">
                            <h3 style="margin:0 0 5px 0; font-size:14px; color:#003366;">${p.title || 'Untitled'}</h3>
                            <p style="margin:0 0 10px 0; font-size:12px;"><b>Location:</b> ${locText}</p>
                            ${imgSrc ? `<img src="${imgSrc}" style="width:100%; border-radius:4px; margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
                            <div style="font-size:11px; color:#666;">
                                <b>Company:</b> ${p.Q5_RailwayCompany || 'N/A'}<br>
                                <b>ID:</b> ${p.uid || 'N/A'}
                            </div>
                            <a href="index.html" style="display:block; margin-top:10px; font-size:11px; color:#003366; text-decoration:none;">← Search in Gallery</a>
                        </div>
                    `);

                    markers.addLayer(marker);
                    visibleCount++;
                }
            }
        });

        if (countSpan) {
            countSpan.textContent = `Showing: ${visibleCount} locations`;
        }
    };

    /**
     * Populates the Company dropdown from the dataset
     */
    const populateCompanyDropdown = (data) => {
        if (!companyFilter) return;
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
        
        populateCompanyDropdown(allPosters);
        updateMap();

        // Add Listeners
        const controls = [searchInput, companyFilter, trainCheck, seasideCheck, sportsCheck];
        controls.forEach(el => {
            if (el) {
                el.addEventListener('input', updateMap);
                el.addEventListener('change', updateMap);
            }
        });

    } catch (err) {
        console.error("Map initialization error:", err);
        if (countSpan) countSpan.textContent = "Error loading map data.";
    }
});
