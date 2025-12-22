document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration and State ---
    const POSTERS_PER_PAGE = 12; // Increased to 12 for better grid alignment
    let allPosters = []; 
    let filteredPosters = []; 
    let currentPage = 1;

    // --- DOM Elements ---
    const displayArea = document.getElementById('poster-display-area');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const pageInfoSpan = document.getElementById('page-info');
    const companyFilter = document.getElementById('company-filter');
    const elementsFilter = document.getElementById('elements-filter');
    const searchText = document.getElementById('search-text');
    const filterTrain = document.getElementById('filter-train');
    const filterSeaside = document.getElementById('filter-seaside');
    const filterSports = document.getElementById('filter-sports');
    const resetButton = document.getElementById('reset-button');

    // --- Helper Functions ---

    const getImageUrl = (poster) => {
        const rawLinks = poster.image_links || "";
        const links = typeof rawLinks === 'string' ? rawLinks.split(';') : [];
        // Prioritize "large" images, fall back to first link, then placeholder
        const found = links.find(l => l.toLowerCase().includes('large')) || links[0];
        return found ? found.trim() : 'https://via.placeholder.com/300x400?text=No+Image+Available';
    };

    const renderPosters = (posters, page) => {
        displayArea.innerHTML = '';
        const start = (page - 1) * POSTERS_PER_PAGE;
        const end = start + POSTERS_PER_PAGE;
        const pageItems = posters.slice(start, end);

        if (pageItems.length === 0) {
            displayArea.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px;">No posters match your current filters.</p>';
            updatePaginationUI(0, 1);
            return;
        }

        pageItems.forEach(p => {
            const card = document.createElement('div');
            card.className = 'poster-card';
            
            card.innerHTML = `
                <img src="${getImageUrl(p)}" alt="${p.title || 'Railway Poster'}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=Error+Loading+Image'">
                <div class="poster-content">
                    <h3>${p.title || 'Untitled Poster'}</h3>
                    <p><strong>Company:</strong> ${p.Q5_RailwayCompany || 'N/A'}</p>
                    <p><strong>Location:</strong> ${p.Q4_Location || 'N/A'}</p>
                    <p class="description">${(p.Q1_Description || 'No description available.').substring(0, 120)}...</p>
                    <div class="tag-container">
                        <span class="tag">ID: ${p.id}</span>
                    </div>
                </div>
            `;
            displayArea.appendChild(card);
        });

        updatePaginationUI(posters.length, page);
    };

    const updatePaginationUI = (totalItems, page) => {
        const totalPages = Math.ceil(totalItems / POSTERS_PER_PAGE) || 1;
        pageInfoSpan.textContent = `Page ${page} of ${totalPages} (${totalItems} posters)`;
        prevButton.disabled = (page === 1);
        nextButton.disabled = (page === totalPages || totalItems === 0);
    };

    const applyFilters = () => {
        const searchVal = searchText.value.toLowerCase();
        const companyVal = companyFilter.value;
        const elementVal = elementsFilter.value;

        filteredPosters = allPosters.filter(p => {
            // Text Search (checks title, location, and transcription)
            const matchesSearch = !searchVal || 
                (p.title || "").toLowerCase().includes(searchVal) || 
                (p.Q4_Location || "").toLowerCase().includes(searchVal) ||
                (p.Q9_Transcription || "").toLowerCase().includes(searchVal);

            // Dropdown Filters
            const matchesCompany = !companyVal || p.Q5_RailwayCompany === companyVal;
            const matchesElement = !elementVal || (p.Q6_ElementsChecklist && p.Q6_ElementsChecklist.includes(elementVal));

            // Checkbox Filters (handling 'yes'/'no' strings from CSV)
            const matchesTrain = !filterTrain.checked || (p.Q3_Train && p.Q3_Train.toLowerCase() === 'yes');
            const matchesSeaside = !filterSeaside.checked || (p.Q7_Seaside && p.Q7_Seaside.toLowerCase() === 'yes');
            const matchesSports = !filterSports.checked || (p.Q8_Sports && p.Q8_Sports.toLowerCase() === 'yes');

            return matchesSearch && matchesCompany && matchesElement && matchesTrain && matchesSeaside && matchesSports;
        });

        currentPage = 1;
        renderPosters(filteredPosters, currentPage);
    };

    const populateFilters = (data) => {
        const companies = new Set();
        const elements = new Set();

        data.forEach(p => {
            if (p.Q5_RailwayCompany && p.Q5_RailwayCompany !== "N/A") companies.add(p.Q5_RailwayCompany);
            if (p.Q6_ElementsChecklist) {
                p.Q6_ElementsChecklist.split(';').forEach(e => {
                    const clean = e.trim();
                    if (clean) elements.add(clean);
                });
            }
        });

        // Add to Company Dropdown
        [...companies].sort().forEach(c => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = c;
            companyFilter.appendChild(opt);
        });

        // Add to Elements Dropdown
        [...elements].sort().forEach(e => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = e;
            elementsFilter.appendChild(opt);
        });
    };

    // --- Event Listeners ---

    [searchText, companyFilter, elementsFilter, filterTrain, filterSeaside, filterSports].forEach(el => {
        el.addEventListener('change', applyFilters);
        if (el.type === 'text') el.addEventListener('input', applyFilters);
    });

    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPosters(filteredPosters, currentPage);
            window.scrollTo(0, 0);
        }
    });

    nextButton.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredPosters.length / POSTERS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderPosters(filteredPosters, currentPage);
            window.scrollTo(0, 0);
        }
    });

    resetButton.addEventListener('click', () => {
        searchText.value = '';
        companyFilter.value = '';
        elementsFilter.value = '';
        filterTrain.checked = false;
        filterSeaside.checked = false;
        filterSports.checked = false;
        applyFilters();
    });

    // --- Initialization ---

    const init = async () => {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            allPosters = await response.json();
            populateFilters(allPosters);
            
            filteredPosters = allPosters;
            renderPosters(filteredPosters, currentPage);

        } catch (error) {
            console.error('Failed to load data:', error);
            displayArea.innerHTML = `<p style="color:red; text-align:center;">Error loading data.json. Ensure the file is in the same folder as this script.</p>`;
        }
    };

    init();
});
