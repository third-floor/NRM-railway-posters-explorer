document.addEventListener('DOMContentLoaded', async () => {
    // --- Initialize Map ---
    // Centered on the UK [Lat, Lng].
    const map = L.map('map').setView([54.5, -2.5], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let allPosters = [];
    let markersLayer = L.layerGroup().addTo(map);

    // --- DOM Elements ---
    const searchInput = document.getElementById('map-search');
    const companyFilter = document.getElementById('map-company-filter');
    const elementsFilter = document.getElementById('map-elements-filter'); // New element filter
    const trainCheck = document.getElementById('map-train');
    const seasideCheck = document.getElementById('map-seaside');
    const sportsCheck = document.getElementById('map-sports');
    const countSpan = document.getElementById('marker-count');
    const detailsArea = document.getElementById('map-details-area');
    const detailsContent = document.getElementById('details-content');

    // --- Custom Icons ---
    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const blueIcon = new L.Icon.Default();

    // --- Helper Functions ---

    const getBestLocation = (p) => {
        return p.Q11_TravelDestinations_Combined || p.Q4_Location || "N/A";
    };

    const getImageUrl = (p) => {
        const rawLinks = p.image_links || "";
        const links = typeof rawLinks === 'string' ? rawLinks.split(';') : [];
        const found = links.find(l => l.toLowerCase().includes('large')) || links[0];
        return found ? found.trim() : '';
    };

    /**
     * MODIFICATION: Highlights the selected marker and all others with the same UID in red.
     * Also populates the info panel below the map.
     */
    const highlightUidGroup = (uid) => {
        // Reset all markers to default blue icon
        markersLayer.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                layer.setIcon(blueIcon);
            }
        });

        // Highlight markers with matching UID in red
        markersLayer.eachLayer(layer => {
            if (layer instanceof L.Marker && layer.options.uid === uid) {
                layer.setIcon(redIcon);
            }
        });

        // Populate the Information Panel below the map
        const relatedPosters = allPosters.filter(p => p.uid === uid);
        if (relatedPosters.length > 0) {
            detailsArea.style.display = 'block';
            let html = `<div style="margin-bottom: 15px;"><strong>Displaying all records for UID: ${uid}</strong></div>`;
            
            relatedPosters.forEach(p => {
                const img = getImageUrl(p);
                html += `
                    <div class="detail-entry">
                        ${img ? `<img src="${img}" class="detail-img" onerror="this.style.display='none'">` : ''}
                        <div>
                            <h3 style="margin-top:0; color:#003366;">${p.title || 'Untitled'}</h3>
                            <p><strong>Location:</strong> ${getBestLocation(p)}</p>
                            <p><strong>Company:</strong> ${p.Q5_RailwayCompany || 'N/A'}</p>
                            <p><strong>Description:</strong> ${p.Q1_Description || 'N/A'}</p>
                        </div>
                    </div>
                `;
            });
            detailsContent.innerHTML = html;
        }
    };

    /**
     * UPDATED: Map markers based on filters including Unified Search (Q2 & Q6).
     */
    const updateMap = () => {
        markersLayer.clearLayers();
        
        const searchVal = searchInput?.value.toLowerCase() || "";
        const companyVal = companyFilter?.value || "";
        const elementVal = elementsFilter?.value || "";
        const onlyTrains = trainCheck?.checked || false;
        const onlySeaside = seasideCheck?.checked || false;
        const onlySports = sportsCheck?.checked || false;

        let visibleCount = 0;

        allPosters.forEach(p => {
            const lat = p.Latitude;
            const lng = p.Longitude;

            if (lat !== null && lng !== null) {
                const locText = getBestLocation(p);
                const title = (p.title || "").toLowerCase();
                const transcription = (p.Q9_Transcription || "").toLowerCase();
                const objects = (p.Q2_Objects || "").toLowerCase();
                const elements = (p.Q6_ElementsChecklist || "").toLowerCase();

                // MODIFICATION: Expanded search to include Q2_Objects and Q6_ElementsChecklist
                const matchesSearch = !searchVal || 
                    title.includes(searchVal) || 
                    locText.toLowerCase().includes(searchVal) ||
                    transcription.includes(searchVal) ||
                    objects.includes(searchVal) ||
                    elements.includes(searchVal) ||
                    p.uid.toLowerCase().includes(searchVal);

                const matchesCompany = !companyVal || p.Q5_RailwayCompany === companyVal;
                
                // MODIFICATION: Dropdown now validates against both checklist fields
                const matchesElement = !elementVal || 
                    (p.Q6_ElementsChecklist && p.Q6_ElementsChecklist.includes(elementVal)) ||
                    (p.Q2_Objects && p.Q2_Objects.includes(elementVal));

                // Logic Filters for original columns
                const matchesTrain = !onlyTrains || String(p.Q3_Train_Present).toLowerCase() === 'yes';
                const matchesSeaside = !onlySeaside || String(p.Q7_Seaside_Present).toLowerCase() === 'yes';
                const matchesSports = !onlySports || String(p.Q8_Sports_Present).toLowerCase() === 'yes';

                if (matchesSearch && matchesCompany && matchesElement && matchesTrain && matchesSeaside && matchesSports) {
                    // Pass UID in options so we can find it later for highlighting
                    const marker = L.marker([lat, lng], { uid: p.uid });
                    
                    marker.bindPopup(`
                        <div style="width:200px; font-family: sans-serif;">
                            <h3 style="margin:0 0 5px 0; font-size:14px; color:#003366;">${p.title || 'Untitled'}</h3>
                            <p style="margin:0; font-size:12px;"><b>Location:</b> ${locText}</p>
                            <p style="margin:5px 0; font-size:11px; color:#666;">Click marker to highlight all related stops.</p>
                        </div>
                    `);

                    marker.on('click', () => {
                        highlightUidGroup(p.uid);
                    });

                    markersLayer.addLayer(marker);
                    visibleCount++;
                }
            }
        });

        if (countSpan) {
            countSpan.textContent = `Showing: ${visibleCount} locations`;
        }
    };

    /**
     * UPDATED: Collects unique items from both Q2_Objects and Q6_ElementsChecklist.
     */
    const populateDropdowns = (data) => {
        const companies = new Set();
        const elements = new Set();
        
        data.forEach(p => {
            if (p.Q5_RailwayCompany && p.Q5_RailwayCompany !== "N/A") {
                companies.add(p.Q5_RailwayCompany);
            }
            // MODIFICATION: Collect unique items from both Q2 and Q6 for the dropdown
            [p.Q6_ElementsChecklist, p.Q2_Objects].forEach(field => {
                if (field && field !== "N/A") {
                    field.split(';').forEach(e => elements.add(e.trim()));
                }
            });
        });

        if (companyFilter) {
            companyFilter.innerHTML = '<option value="">— All Companies —</option>';
            [...companies].sort().forEach(co => {
                companyFilter.appendChild(new Option(co, co));
            });
        }

        if (elementsFilter) {
            elementsFilter.innerHTML = '<option value="">— All Elements —</option>';
            [...elements].sort().forEach(el => {
                elementsFilter.appendChild(new Option(el, el));
            });
        }
    };

    // --- Initialization ---

    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("Could not load data.json");
        
        allPosters = await response.json();
        
        populateDropdowns(allPosters);
        updateMap();

        // Add Listeners
        const controls = [searchInput, companyFilter, elementsFilter, trainCheck, seasideCheck, sportsCheck];
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
