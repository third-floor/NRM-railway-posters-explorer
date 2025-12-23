document.addEventListener('DOMContentLoaded', () => {
    const POSTERS_PER_PAGE = 12; 
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

    // --- Modal Creation ---
    // Dynamically inject the modal structure into the body
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'poster-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <div id="modal-body"></div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => { modal.style.display = "none"; };
    modal.querySelector('.close-modal').onclick = closeModal;
    window.onclick = (event) => { if (event.target == modal) closeModal(); };

    // --- Helper Functions ---

    const getBestLocation = (p) => {
        return p.Q11_TravelDestinations_Combined || p.Q4_Location || "N/A";
    };

    const getImageUrl = (poster) => {
        const rawLinks = poster.image_links || "";
        const links = typeof rawLinks === 'string' ? rawLinks.split(';') : [];
        const found = links.find(l => l.toLowerCase().includes('large')) || links[0];
        return found ? found.trim() : 'https://via.placeholder.com/300x400?text=No+Image';
    };

    /**
     * MODIFICATION: Show a popup containing info for the clicked poster 
     * AND all other entries sharing the same UID.
     */
    const showPosterDetails = (uid) => {
        const related = allPosters.filter(p => p.uid === uid);
        const primary = related[0];
        const modalBody = document.getElementById('modal-body');
        
        // Generate a list of all locations associated with this UID
        const locationsHtml = related
            .map(p => `<li>${getBestLocation(p)}</li>`)
            .join('');

        modalBody.innerHTML = `
            <div class="modal-grid">
                <div class="modal-image-column">
                    <img src="${getImageUrl(primary)}" style="width:100%; border-radius:8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                </div>
                <div class="modal-info-column">
                    <h2 style="margin-top:0;">${primary.title || 'Untitled'}</h2>
                    <p><strong>Railway Company:</strong> ${primary.Q5_RailwayCompany || 'N/A'}</p>
                    <p><strong>Primary Description:</strong> ${primary.Q1_Description || 'No description available.'}</p>
                    <hr>
                    <p><strong>All Associated Locations for this Item (UID: ${uid}):</strong></p>
                    <ul>${locationsHtml}</ul>
                    <p><strong>Visual Elements:</strong> ${primary.Q6_ElementsChecklist || 'N/A'}</p>
                    <p><strong>Date:</strong> ${primary.date || 'N/A'}</p>
                </div>
            </div>
        `;
        modal.style.display = "block";
    };

    /**
     * MODIFICATION: Render posters but de-duplicate by UID so only one card 
     * appears for items with multiple location entries.
     */
    const renderPosters = (posters, page) => {
        if (!displayArea) return;
        displayArea.innerHTML = '';

        // Filter to unique UIDs for the gallery view
        const seenUids = new Set();
        const uniquePosters = posters.filter(p => {
            if (seenUids.has(p.uid)) return false;
            seenUids.add(p.uid);
            return true;
        });

        const start = (page - 1) * POSTERS_PER_PAGE;
        const pageItems = uniquePosters.slice(start, start + POSTERS_PER_PAGE);

        if (pageItems.length === 0) {
            displayArea.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No posters found matching criteria.</p>';
            updatePaginationUI(0, 1);
            return;
        }

        pageItems.forEach(p => {
            const card = document.createElement('div');
            card.className = 'poster-card';
            card.innerHTML = `
                <img src="${getImageUrl(p)}" alt="Poster" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=Image+Unavailable'">
                <div class="poster-content">
                    <h3>${p.title || 'Untitled'}</h3>
                    <p><strong>Company:</strong> ${p.Q5_RailwayCompany || 'N/A'}</p>
                    <p><strong>ID:</strong> ${p.uid}</p>
                </div>
            `;
            // Add click event for the detail popup
            card.addEventListener('click', () => showPosterDetails(p.uid));
            displayArea.appendChild(card);
        });
        updatePaginationUI(uniquePosters.length, page);
    };

    const updatePaginationUI = (totalItems, page) => {
        const totalPages = Math.ceil(totalItems / POSTERS_PER_PAGE) || 1;
        if (pageInfoSpan) pageInfoSpan.textContent = `Page ${page} of ${totalPages} (${totalItems} unique items)`;
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
            
            // MODIFICATION: Added Q2 and Q6 to text search
            const objects = (p.Q2_Objects || "").toLowerCase();
            const elements = (p.Q6_ElementsChecklist || "").toLowerCase();

            const matchesSearch = !searchVal || 
                title.includes(searchVal) || 
                loc.includes(searchVal) || 
                transcription.includes(searchVal) ||
                objects.includes(searchVal) || 
                elements.includes(searchVal) ||
                p.uid.toLowerCase().includes(searchVal);

            const matchesCompany = !companyVal || p.Q5_RailwayCompany === companyVal;
            
            // MODIFICATION: Dropdown now checks both Q2 and Q6 fields
            const matchesElement = !elementVal || 
                (p.Q6_ElementsChecklist && p.Q6_ElementsChecklist.includes(elementVal)) ||
                (p.Q2_Objects && p.Q2_Objects.includes(elementVal));
            
            const matchesTrain = !filterTrain?.checked || String(p.Q3_Train_Present).toLowerCase() === 'yes';
            const matchesSeaside = !filterSeaside?.checked || String(p.Q7_Seaside_Present).toLowerCase() === 'yes';
            const matchesSports = !filterSports?.checked || String(p.Q8_Sports_Present).toLowerCase() === 'yes';

            return matchesSearch && matchesCompany && matchesElement && matchesTrain && matchesSeaside && matchesSports;
        });

        currentPage = 1;
        renderPosters(filteredPosters, currentPage);
    };

    const populateFilterDropdowns = (data) => {
        const companies = new Set();
        const elements = new Set();
        data.forEach(p => {
            if (p.Q5_RailwayCompany && p.Q5_RailwayCompany !== "N/A") companies.add(p.Q5_RailwayCompany);
            
            // MODIFICATION: Collect unique items from both Q2 and Q6 for the dropdown
            [p.Q6_ElementsChecklist, p.Q2_Objects].forEach(field => {
                if (field && field !== "N/A") {
                    field.split(';').forEach(e => {
                        const clean = e.trim();
                        if (clean) elements.add(clean);
                    });
                }
            });
        });

        if (companyFilter) {
            companyFilter.innerHTML = '<option value="">— All Companies —</option>';
            [...companies].sort().forEach(c => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = c;
                companyFilter.appendChild(opt);
            });
        }
        if (elementsFilter) {
            elementsFilter.innerHTML = '<option value="">— All Elements —</option>';
            [...elements].sort().forEach(e => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = e;
                elementsFilter.appendChild(opt);
            });
        }
    };

    // --- Listeners ---

    const activeFilters = [searchText, companyFilter, elementsFilter, filterTrain, filterSeaside, filterSports].filter(el => el !== null);
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

    if (prevButton) prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPosters(filteredPosters, currentPage);
            window.scrollTo(0, 0);
        }
    });

    if (nextButton) nextButton.addEventListener('click', () => {
        // Calculate total pages based on unique posters
        const uniqueCount = new Set(filteredPosters.map(p => p.uid)).size;
        const totalPages = Math.ceil(uniqueCount / POSTERS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderPosters(filteredPosters, currentPage);
            window.scrollTo(0, 0);
        }
    });

    // --- Initialization ---

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
            if (displayArea) displayArea.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
        }
    };

    init();
});

