document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration and State ---
    const POSTERS_PER_PAGE = 9;
    let allPosters = []; // Holds the full dataset
    let filteredPosters = []; // Holds the posters matching current filters
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

    // Safely splits a semicolon-separated string into a trimmed array
    const splitData = (str) => (str || "").split(';').map(s => s.trim()).filter(s => s);

    /**
     * Determines the optimal image URL based on the user's requirements.
     * Logic: Use the first link that includes "large", otherwise use the first link.
     * @param {string} linksString - The raw string from the 'image_links' column.
     * @returns {string} The selected image URL.
     */
    const getPosterImageUrl = (linksString) => {
        if (!linksString) return ''; // Return empty if no links provided

        const links = splitData(linksString);
        if (links.length === 0) return '';

        // 1. Look for the first link containing "large" (case-insensitive)
        const largeLink = links.find(link => link.toLowerCase().includes('large'));

        // 2. Return the large link if found, otherwise return the first link
        return largeLink || links[0];
    };

    // --- Core Logic: Display & Pagination ---

    /**
     * Renders the current page's posters to the DOM.
     * @param {Array} data - The array of posters to display.
     * @param {number} page - The current page number (1-indexed).
     */
    const renderPosters = (data, page) => {
        displayArea.innerHTML = '';
        const startIndex = (page - 1) * POSTERS_PER_PAGE;
        const endIndex = startIndex + POSTERS_PER_PAGE;
        const postersToShow = data.slice(startIndex, endIndex);

        postersToShow.forEach(poster => {
            const card = document.createElement('div');
            card.className = 'poster-card';
            
            // Get the appropriate image link using the new function
            const imageUrl = getPosterImageUrl(poster.image_links);
            const imageAltText = `Poster image: ${poster.Q1_Description}`;
            
            card.innerHTML = `
                ${imageUrl ? `<img src="${imageUrl}" alt="${imageAltText}" loading="lazy">` : `<p>Image link unavailable.</p>`}
                <h3>${poster.Q1_Description}</h3>
                <p><strong>Company:</strong> ${poster.Q5_RailwayCompany}</p>
                <p><strong>Location:</strong> ${poster.Q4_Location.split(';').slice(-1)[0] || 'N/A'}</p>
                <p><strong>Keywords:</strong> ${poster.Q6_ElementsChecklist.replace(/;/g, ', ')}</p>
                <p class="transcription-snippet"><strong>Text:</strong> ${poster.Q9_Transcription.substring(0, 80)}...</p>
            `;
            displayArea.appendChild(card);
        });

        updatePaginationControls(data.length);
    };

    /**
     * Updates the text and disabled state of the pagination buttons.
     * @param {number} totalPosters - The total number of posters currently filtered.
     */
    const updatePaginationControls = (totalPosters) => {
        const totalPages = Math.ceil(totalPosters / POSTERS_PER_PAGE);
        pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages || 1}`;

        prevButton.disabled = (currentPage === 1);
        nextButton.disabled = (currentPage >= totalPages);
    };

    // --- Filter and Search Logic ---

    /**
     * Applies all current filters and search terms to the full dataset.
     */
    const applyFilters = () => {
        let results = allPosters;

        // 1. Transcription Search (Q9)
        const searchTerm = searchText.value.toLowerCase().trim();
        if (searchTerm) {
            results = results.filter(poster => 
                (poster.Q9_Transcription || "").toLowerCase().includes(searchTerm)
            );
        }

        // 2. Railway Company Filter (Q5)
        const company = companyFilter.value;
        if (company) {
            results = results.filter(poster => 
                splitData(poster.Q5_RailwayCompany).includes(company)
            );
        }
        
        // 3. Visual Element Filter (Q6)
        const element = elementsFilter.value;
        if (element) {
            results = results.filter(poster => 
                splitData(poster.Q6_ElementsChecklist).includes(element)
            );
        }

        // 4. Checkbox Filters (Q3, Q7, Q8)
        if (filterTrain.checked) {
            results = results.filter(poster => poster.Q3_Train === 'yes');
        }
        if (filterSeaside.checked) {
            results = results.filter(poster => poster.Q7_Seaside === 'yes');
        }
        if (filterSports.checked) {
            results = results.filter(poster => poster.Q8_Sports === 'yes');
        }

        filteredPosters = results;
        currentPage = 1; // Reset to the first page on filter change
        renderPosters(filteredPosters, currentPage);
    };

    // --- Filter Setup: Populating Select Menus ---

    /**
     * Extracts unique values from a specified field and populates a select element.
     * @param {string} fieldName - The field in the data object (e.g., 'Q5_RailwayCompany').
     * @param {HTMLElement} selectElement - The dropdown element to populate.
     */
    const populateFilter = (fieldName, selectElement) => {
        const uniqueValues = new Set();
        allPosters.forEach(poster => {
            splitData(poster[fieldName]).forEach(value => {
                if (value && value !== 'N/A') {
                    uniqueValues.add(value);
                }
            });
        });

        // Clear existing options, keeping the default one
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }

        Array.from(uniqueValues).sort().forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            selectElement.appendChild(option);
        });
    };

    // --- Event Listeners ---
    
    // Listen to changes on all filter controls to trigger a refresh
    [
        companyFilter, 
        elementsFilter, 
        searchText, 
        filterTrain, 
        filterSeaside, 
        filterSports
    ].forEach(el => el.addEventListener('change', applyFilters));
    
    // Search input needs 'keyup' for real-time filtering
    searchText.addEventListener('keyup', applyFilters);

    // Pagination listeners
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPosters(filteredPosters, currentPage);
        }
    });

    nextButton.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredPosters.length / POSTERS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderPosters(filteredPosters, currentPage);
        }
    });

    // Reset button listener
    resetButton.addEventListener('click', () => {
        searchText.value = '';
        companyFilter.value = '';
        elementsFilter.value = '';
        filterTrain.checked = false;
        filterSeaside.checked = false;
        filterSports.checked = false;
        applyFilters(); // Re-apply all filters (which are now empty/reset)
    });


    // --- Initialization: Fetch Data and Setup ---

    const init = async () => {
        try {
            // Load your JSON data file
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allPosters = await response.json();
            
            // 1. Populate the filter dropdowns
            populateFilter('Q5_RailwayCompany', companyFilter);
            populateFilter('Q6_ElementsChecklist', elementsFilter);
            
            // 2. Initial render
            filteredPosters = allPosters;
            renderPosters(filteredPosters, currentPage);

        } catch (error) {
            console.error('Failed to load or process poster data:', error);
            displayArea.innerHTML = '<p>Error loading data. Please check `data.json` and the console for details.</p>';
        }
    };

    init();
});
