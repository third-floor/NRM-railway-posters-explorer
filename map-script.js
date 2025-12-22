document.addEventListener('DOMContentLoaded', async () => {
    // Initialize map centered on the UK
    const map = L.map('map').setView([54.5, -2.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    let allPosters = [];
    let markers = L.layerGroup().addTo(map);

    const searchInput = document.getElementById('map-search');
    const companyFilter = document.getElementById('map-company-filter');
    const countSpan = document.getElementById('marker-count');

    try {
        const response = await fetch('data.json');
        allPosters = await response.json();

        // Populate Company Dropdown
        const companies = [...new Set(allPosters.map(p => p.Q5_RailwayCompany))].sort();
        companies.forEach(co => {
            if(co && co !== "N/A") {
                const opt = document.createElement('option');
                opt.value = co; opt.textContent = co;
                companyFilter.appendChild(opt);
            }
        });

        const updateMap = () => {
            markers.clearLayers();
            const search = searchInput.value.toLowerCase();
            const company = companyFilter.value;
            let count = 0;

            allPosters.forEach(p => {
                // Only plot if we have valid coordinates
                if (p.Latitude && p.Longitude && p.Latitude !== "N/A") {
                    const matchesSearch = p.Q4_Location.toLowerCase().includes(search) || p.title.toLowerCase().includes(search);
                    const matchesCompany = !company || p.Q5_RailwayCompany === company;

                    if (matchesSearch && matchesCompany) {
                        const imgUrl = p.image_links.split(';')[0].trim();
                        const marker = L.marker([p.Latitude, p.Longitude]);
                        marker.bindPopup(`
                            <div style="width:200px">
                                <strong>${p.title}</strong><br>
                                <small>${p.Q4_Location}</small><br>
                                <img src="${imgUrl}" loading="lazy" style="width:100%; margin-top:10px; border-radius:4px;">
                                <br><small>Company: ${p.Q5_RailwayCompany}</small>
                            </div>
                        `);
                        markers.addLayer(marker);
                        count++;
                    }
                }
            });
            countSpan.textContent = `Showing: ${count} locations`;
        };

        searchInput.addEventListener('input', updateMap);
        companyFilter.addEventListener('change', updateMap);
        updateMap(); // Initial run

    } catch (err) {
        console.error("Error loading map data:", err);
    }
});