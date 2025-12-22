document.addEventListener('DOMContentLoaded', () => {
    const POSTERS_PER_PAGE = 12;
    let allPosters = [];
    let filteredPosters = [];
    let currentPage = 1;

    // DOM Elements
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

    const renderPosters = (posters, page) => {
        displayArea.innerHTML = '';
        const start = (page - 1) * POSTERS_PER_PAGE;
        const end = start + POSTERS_PER_PAGE;
        const pageItems = posters.slice(start, end);

        if (pageItems.length === 0) {
            displayArea.innerHTML = '<p>No posters found matching your criteria.</p>';
        }

        pageItems.forEach(p => {
            const card = document.createElement('div');
            card.className = 'poster-card';
            
            // Handle image selection (prefer large if available)
            const links = p.image_links.split(';');
            const imgSrc = links.find(l => l.includes('large')) || links[0] || '';

            card.innerHTML = `
                <img src="${imgSrc.trim()}" loading="lazy" alt="${p.title}" onerror="this.src='https://via.placeholder.com/300x400?text=Image+Not+Found'">
                <h3>${p.title}</h3>
                <p><strong>Company:</strong> ${p.Q5_RailwayCompany}</p>
                <p><strong>Location:</strong> ${p.Q4_Location}</p>
                <p><em>${p.Q1_Description.substring(0, 100)}${p.Q1_Description.length > 100 ? '...' : ''}</em></p>
            `;
            displayArea.appendChild(card);
        });

        updatePaginationUI(posters.length, page);
    };

    const updatePaginationUI = (totalItems, page) => {
        const totalPages = Math.ceil(totalItems / POSTERS_PER_PAGE) || 1;
        pageInfoSpan.textContent = `Page ${page} of ${totalPages} (${totalItems} total)`;
        prevButton.disabled = page === 1;
        nextButton.disabled = page === totalPages;
    };

    const applyFilters = () => {
        const search = searchText.value.toLowerCase();
        const company = companyFilter.value;
        const element = elementsFilter.value;

        filteredPosters = allPosters.filter(p => {
            const matchesSearch = !search || 
                p.title.toLowerCase().includes(search) || 
                p.Q9_Transcription.toLowerCase().includes(search);
            
            const matchesCompany = !company || p.Q5_RailwayCompany === company;
            
            const matchesElement = !element || 
                (p.Q6_ElementsChecklist && p.Q6_ElementsChecklist.includes(element));
            
            const matchesTrain = !filterTrain.checked || p.Q3_Train.toLowerCase() === 'yes';
            const matchesSeaside = !filterSeaside.checked || p.Q7_Seaside.toLowerCase() === 'yes';
            const matchesSports = !filterSports.checked || p.Q8_Sports.toLowerCase() === 'yes';

            return matchesSearch && matchesCompany && matchesElement && 
                   matchesTrain && matchesSeaside && matchesSports;
        });

        currentPage = 1;
        renderPosters(filteredPosters, currentPage);
    };

    const populateFilters = () => {
        const companies = new Set();
        const elements = new Set();

        allPosters.forEach(p => {
            if (p.Q5_RailwayCompany && p.Q5_RailwayCompany !== "N/A") companies.add(p.Q5_RailwayCompany);
            if (p.Q6_ElementsChecklist) {
                p.Q6_ElementsChecklist.split(';').forEach(e => elements.add(e.trim()));
            }
        });

        [...companies].sort().forEach(c => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = c;
            companyFilter.appendChild(opt);
        });

        [...elements].sort().forEach(e => {
            if(e) {
                const opt = document.createElement('option');
                opt.value = opt.textContent = e;
                elementsFilter.appendChild(opt);
            }
        });
    };

    // Events
    [searchText, companyFilter, elementsFilter, filterTrain, filterSeaside, filterSports].forEach(el => {
        el.addEventListener('input', applyFilters);
    });

    prevButton.addEventListener('click', () => { if (currentPage > 1) renderPosters(filteredPosters, --currentPage); });
    nextButton.addEventListener('click', () => { 
        if (currentPage < Math.ceil(filteredPosters.length / POSTERS_PER_PAGE)) {
            renderPosters(filteredPosters, ++currentPage);
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

    // Load Data
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            allPosters = data;
            filteredPosters = data;
            populateFilters();
            renderPosters(allPosters, 1);
        })
        .catch(err => console.error("Error loading JSON:", err));
});