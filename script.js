document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration and State ---
    const POSTERS_PER_PAGE = 12; 
    let allPosters = []; 
    let filteredPosters = []; 
    let currentPage = 1;

    // --- DOM Elements ---
    const displayArea = document.getElementById('poster-display-area');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const pageInfoSpan = document.getElementById('page-info');
    
    // Filters
    const companyFilter = document.getElementById('company-filter');
    const elementsFilter = document.getElementById('elements-filter');
    const searchText = document.getElementById('search-text');
    const filterTrain = document.getElementById('filter-train');
    const filterSeaside = document.getElementById('filter-seaside');
    const filterSports = document.getElementById('filter-sports');
    const resetButton = document.getElementById('reset-button');

    // --- Helper Functions ---

    /**
     * Resiliently picks a location from available columns
     */
    const getBestLocation = (p) => {
        return p.Q11_TravelDestinations_Combined || 
               p.Q4_Location || 
               "N/A";
    };

    const getImageUrl = (poster) => {
        const rawLinks = poster.image_links || "";
        const links = typeof rawLinks === 'string' ? rawLinks.split(';') : [];
        const found = links.find(l => l.toLowerCase().includes('large')) || links[0];
        return found ? found.trim() : 'https://via.placeholder.com/300x400?text=No+Image';
    };

    const renderPosters = (posters, page) => {
        if (!displayArea) return;
        displayArea.innerHTML = '';
        
        const start = (page - 1) * POSTERS_PER_PAGE;
        const pageItems = posters.slice(start, start + POSTERS_PER_PAGE);

        if (pageItems.length === 0) {
            displayArea.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No posters found matching those criteria.</p>';
            updatePaginationUI(0, 1);
            return;
        }

        pageItems.forEach(p => {
            const card = document.createElement('div');
            card.className = 'poster-card';
            
            card.innerHTML = `
                <img src="${getImageUrl(p)}" alt="Poster" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=Image+Unavailable'">
                <div class="poster-content">
                    <h3>${p.title || 'Untitled Poster'}</h3>
                    <p><strong>Company:</strong> ${p.Q5_RailwayCompany || 'N/A'}</p>
                    <p><strong>Location:</strong> ${getBestLocation(p)}</p>
                    <p class="description">${(p.Q1_Description || '').substring(0, 100)}...</p>
                </div>
            `;
            displayArea.appendChild(card);
        });

        updatePaginationUI(posters.length, page);
    };

    const updatePaginationUI = (totalItems, page) => {
        const totalPages = Math.ceil(totalItems / POSTERS_PER_PAGE) || 1;
        if (pageInfoSpan) pageInfoSpan.textContent = `Page ${page} of ${totalPages} (${totalItems} total)`;
        if (prevButton) prevButton.disabled = (page === 1);
        if (nextButton) nextButton.disabled = (page === totalPages || totalItems === 0);
    };

    const applyFilters = () => {
        const searchVal = searchText?.value.toLowerCase() || "";
        const companyVal = companyFilter?.value || "";
        const elementVal = elementsFilter?.value || "";

        filteredPosters = allPosters.filter(p => {
            const loc = getBestLocation(p).toLowerCase();
            const title = (p.title || "").toLowerCase();
            const transcription = (p.Q9_Transcription || "").toLowerCase();

            const matchesSearch = !searchVal || 
                                 title.includes(searchVal) || 
                                 loc.includes(searchVal) || 
                                 transcription.includes(searchVal);

            const matchesCompany = !companyVal || p.Q5_RailwayCompany === companyVal;
            
            const matchesElement = !elementVal || (p.Q6_ElementsChecklist && p.Q6_ElementsChecklist.includes(elementVal));

            const matchesTrain = !filterTrain?.checked || String(p.Q3_Train_Present).toLowerCase() === 'yes';
            const matchesSeaside = !filterSeaside?.checked || String(p.Q7_Seaside_Present).toLowerCase() === 'yes';
            const matchesSports = !filterSports?.checked || String(p.Q8_Sports_Present).toLowerCase() === 'yes';

            return matchesSearch && matchesCompany && matchesElement && matchesTrain && matchesSeaside && matchesSports;
        });

        currentPage = 1;
        renderPosters(filteredPosters, currentPage);
    };

    const populateFilterDropdowns = (data) => {
        if (!companyFilter && !elementsFilter) return;

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

        if (companyFilter) {
            [...companies].sort().forEach(c => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = c;
                companyFilter.appendChild(opt);
            });
        }

        if (elementsFilter) {
            [...elements].sort().forEach(e => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = e;
                elementsFilter.appendChild(opt);
            });
        }
    };

    // --- Setup Listeners ---

    // We filter out null elements so addEventListener doesn't crash
    const activeFilters = [
        searchText, companyFilter, elementsFilter, 
        filterTrain, filterSeaside, filterSports
    ].filter(el => el !== null);

    activeFilters.forEach(el => {
        el.addEventListener('input', applyFilters);
        el.addEventListener('change', applyFilters);
    });

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            activeFilters.forEach(el => {
                if (el.type === 'checkbox') el.checked = false;
                else el.value = '';
            });
            applyFilters();
        });
    }

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPosters(filteredPosters, currentPage);
                window.scrollTo(0, 0);
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredPosters.length / POSTERS_PER_PAGE);
            if (currentPage < totalPages) {
                currentPage++;
                renderPosters(filteredPosters, currentPage);
                window.scrollTo(0, 0);
            }
        });
    }

    // --- Initialize ---

    const init = async () => {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            allPosters = await response.json();
            populateFilterDropdowns(allPosters);
            
            filteredPosters = allPosters;
            renderPosters(filteredPosters, currentPage);

        } catch (error) {
            console.error('Failed to load data:', error);
            if (displayArea) {
                displayArea.innerHTML = `<p style="color:red; text-align:center;">Error loading data.json.</p>`;
            }
        }
    };

    init();
});

