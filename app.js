// NTU Housing Finder and Comparer - JavaScript logic

// App State
let hallsData = [];
let filteredHalls = [];
let comparedHalls = [];

// AI Assistant State
let chatHistory = [];
let geminiApiKey = localStorage.getItem('gemini_api_key') || '';
let geminiModel = localStorage.getItem('gemini_model') || 'gemini-3.1-flash-lite';


// DOM Elements
const hallsGrid = document.getElementById('halls-grid');
const searchInput = document.getElementById('search-input');
const hallsCount = document.getElementById('halls-count');
const displayedHallsCount = document.getElementById('displayed-halls-count');
const sortBySelect = document.getElementById('sort-by');
const themeToggle = document.getElementById('theme-toggle');

// Filter Elements
const priceRange = document.getElementById('price-range');
const priceMaxLabel = document.getElementById('price-max-label');
const resetFiltersBtn = document.getElementById('reset-filters');
const filterGym = document.getElementById('filter-gym');
const filterLift = document.getElementById('filter-lift');
const filterPantry = document.getElementById('filter-pantry');
const distNsRange = document.getElementById('dist-ns-range');
const distNsVal = document.getElementById('dist-ns-val');
const distSsRange = document.getElementById('dist-ss-range');
const distSsVal = document.getElementById('dist-ss-val');

// Comparison Drawer Elements
const comparisonDrawer = document.getElementById('comparison-drawer');
const drawerSlots = document.getElementById('drawer-slots');
const compareBadge = document.getElementById('compare-badge');
const clearCompareBtn = document.getElementById('clear-compare-btn');
const openComparisonBtn = document.getElementById('open-comparison-btn');
const navCompareBtn = document.getElementById('nav-compare-btn');
const comparisonStatus = document.getElementById('comparison-status');

// Modals
const comparisonModal = document.getElementById('comparison-modal');
const closeCompareBtn = document.getElementById('close-compare-btn');
const comparisonTableContent = document.getElementById('comparison-table-content');

const detailModal = document.getElementById('detail-modal');
const closeDetailBtn = document.getElementById('close-detail-btn');

// Initialize the Application
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Theme Configuration
    initTheme();
    
    // 2. Fetch Halls Data
    try {
        const response = await fetch('halls.json');
        hallsData = await response.json();
        
        // Populate stats & initialize filters
        hallsCount.textContent = hallsData.length;
        initRanges();
        
        // 3. Render and Apply Filters
        applyFiltersAndSort();
        
    } catch (error) {
        console.error('Error loading NTU Halls data:', error);
        hallsGrid.innerHTML = `
            <div class="glass-container" style="padding: 3rem; grid-column: 1/-1; text-align: center; color: var(--text-secondary);">
                <i data-lucide="alert-triangle" style="width: 48px; height: 48px; color: var(--primary); margin-bottom: 1rem;"></i>
                <h3>Unable to load Housing Data</h3>
                <p>Please make sure halls.json is generated in the root repository folder.</p>
            </div>
        `;
        lucide.createIcons();
    }
    
    // 4. Setup Event Listeners
    setupEventListeners();
    
    // 5. Initialize Chatbot
    initChatbot();
});

// Setup Ranges and Sliders
function initRanges() {
    // Price range slider initialization
    let maxPrice = 0;
    let minPrice = 9999;
    
    hallsData.forEach(hall => {
        hall.renting_rates.forEach(rate => {
            const price = parseInt(rate.ay26_27_rate);
            if (price) {
                if (price > maxPrice) maxPrice = price;
                if (price < minPrice) minPrice = price;
            }
        });
    });
    
    if (maxPrice > 0) {
        priceRange.min = minPrice;
        priceRange.max = maxPrice;
        priceRange.value = maxPrice;
        priceMaxLabel.textContent = `$${maxPrice}`;
        document.getElementById('price-min-label').textContent = `$${minPrice}`;
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Filters & Sorting Input
    searchInput.addEventListener('input', applyFiltersAndSort);
    sortBySelect.addEventListener('change', applyFiltersAndSort);
    priceRange.addEventListener('input', (e) => {
        priceMaxLabel.textContent = `$${e.target.value}`;
        applyFiltersAndSort();
    });
    
    // Checkboxes
    document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', applyFiltersAndSort);
    });
    
    // Distance Sliders
    distNsRange.addEventListener('input', (e) => {
        distNsVal.textContent = e.target.value === '1500' ? 'Any' : `${e.target.value}m`;
        applyFiltersAndSort();
    });
    
    distSsRange.addEventListener('input', (e) => {
        distSsVal.textContent = e.target.value === '1500' ? 'Any' : `${e.target.value}m`;
        applyFiltersAndSort();
    });
    
    // Reset Filters Button
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        priceRange.value = priceRange.max;
        priceMaxLabel.textContent = `$${priceRange.max}`;
        
        // Reset check boxes
        document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.name === 'room_type' || checkbox.name === 'aircon' || checkbox.name === 'bathroom') {
                checkbox.checked = true;
            } else {
                checkbox.checked = false;
            }
        });
        
        distNsRange.value = 1500;
        distNsVal.textContent = 'Any';
        distSsRange.value = 1500;
        distSsVal.textContent = 'Any';
        
        sortBySelect.value = 'name';
        
        applyFiltersAndSort();
    });
    
    // Comparison Buttons
    navCompareBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (comparedHalls.length >= 2) {
            openComparisonModal();
        } else {
            comparisonStatus.textContent = 'Select at least 2 halls using the Compare checkboxes to open the comparison table (maximum 3).';
            document.getElementById('explore').scrollIntoView({ behavior: 'smooth' });
            const checkbox = document.querySelector('.compare-chk');
            if (checkbox) checkbox.focus({ preventScroll: true });
        }
    });
    clearCompareBtn.addEventListener('click', clearComparison);
    openComparisonBtn.addEventListener('click', openComparisonModal);
    closeCompareBtn.addEventListener('click', () => {
        comparisonModal.classList.remove('active');
    });
    
    // Detail Modal closing
    closeDetailBtn.addEventListener('click', () => {
        detailModal.classList.remove('active');
    });
    
    // Modal Backdrops
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            comparisonModal.classList.remove('active');
            detailModal.classList.remove('active');
        }
    });
    [comparisonModal, detailModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Tab functionality in Detail Modal
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all tabs
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const moon = themeToggle.querySelector('.dark-icon');
    const sun = themeToggle.querySelector('.light-icon');
    if (theme === 'dark') {
        moon.style.display = 'none';
        sun.style.display = 'block';
    } else {
        moon.style.display = 'block';
        sun.style.display = 'none';
    }
}

// Filter and Sort Logic
function applyFiltersAndSort() {
    const query = searchInput.value.toLowerCase().trim();
    const maxRent = parseInt(priceRange.value);
    
    // Get checked filters
    const selectedRoomTypes = Array.from(document.querySelectorAll('input[name="room_type"]:checked')).map(el => el.value);
    const selectedAircon = Array.from(document.querySelectorAll('input[name="aircon"]:checked')).map(el => el.value);
    const selectedBathrooms = Array.from(document.querySelectorAll('input[name="bathroom"]:checked')).map(el => el.value);
    
    const maxNsDist = parseInt(distNsRange.value);
    const maxSsDist = parseInt(distSsRange.value);
    
    const reqGym = filterGym.checked;
    const reqLift = filterLift.checked;
    const reqPantry = filterPantry.checked;
    
    filteredHalls = hallsData.filter(hall => {
        // 1. Search Query filter
        const matchQuery = !query || 
            hall.name.toLowerCase().includes(query) || 
            hall.description.toLowerCase().includes(query) ||
            hall.address.toLowerCase().includes(query) ||
            hall.near_canteen.toLowerCase().includes(query) ||
            hall.closest_school.toLowerCase().includes(query);
            
        if (!matchQuery) return false;
        
        // 2. Budget filter (minimum AY2026/27 price must be <= selected max budget)
        const prices = hall.renting_rates.map(r => parseInt(r.ay26_27_rate)).filter(p => !isNaN(p));
        const minRate = prices.length ? Math.min(...prices) : Infinity;
        if (minRate > maxRent) return false;
        
        // 3. Room Configurations match (Double or Single availability in rates)
        const hasSingle = hall.renting_rates.some(r => r.room_type.toLowerCase().includes('single'));
        const hasDouble = hall.renting_rates.some(r => r.room_type.toLowerCase().includes('double'));
        
        const matchRoomType = (selectedRoomTypes.includes('single') && hasSingle) || 
                              (selectedRoomTypes.includes('double') && hasDouble);
        if (!matchRoomType) return false;
        
        // 4. Aircon matching
        const isAircon = hall.aircon.includes('Air-con');
        const isNonAircon = hall.aircon.includes('Non air-con');
        const matchAircon = (selectedAircon.includes('Air-con') && isAircon) || 
                            (selectedAircon.includes('Non air-con') && isNonAircon);
        if (!matchAircon) return false;
        
        // 5. Bathroom configurations matching
        const matchBathroom = selectedBathrooms.includes(hall.bathroom_type);
        if (!matchBathroom) return false;
        
        // 6. Amenities matching
        if (reqGym && !hall.amenities['Gym']) return false;
        if (reqLift && hall.has_lift !== 'Yes') return false;
        
        const hasPantry = Object.keys(hall.amenities).some(k => k.toLowerCase().includes('pantry') || k.toLowerCase().includes('kitchenette'));
        if (reqPantry && !hasPantry) return false;
        
        // 7. Distance matching
        if (maxNsDist < 1500 && hall.dist_to_ns > maxNsDist) return false;
        if (maxSsDist < 1500 && hall.dist_to_ss > maxSsDist) return false;
        
        return true;
    });
    
    // Sorting
    const sortBy = sortBySelect.value;
    filteredHalls.sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortBy === 'price-low' || sortBy === 'price-high') {
            const aPrices = a.renting_rates.map(r => parseInt(r.ay26_27_rate)).filter(p => !isNaN(p));
            const bPrices = b.renting_rates.map(r => parseInt(r.ay26_27_rate)).filter(p => !isNaN(p));
            const aMin = aPrices.length ? Math.min(...aPrices) : Infinity;
            const bMin = bPrices.length ? Math.min(...bPrices) : Infinity;
            return sortBy === 'price-low' ? aMin - bMin : bMin - aMin;
        } else if (sortBy === 'ns-dist') {
            return a.dist_to_ns - b.dist_to_ns;
        } else if (sortBy === 'ss-dist') {
            return a.dist_to_ss - b.dist_to_ss;
        } else if (sortBy === 'capacity-high') {
            const aCap = parseInt(a.capacity) || 0;
            const bCap = parseInt(b.capacity) || 0;
            return bCap - aCap;
        }
        return 0;
    });
    
    // Update count labels
    displayedHallsCount.textContent = filteredHalls.length;
    
    // Render Grid
    renderGrid();
}

// Render Halls Card Grid
function renderGrid() {
    if (filteredHalls.length === 0) {
        hallsGrid.innerHTML = `
            <div class="glass-container" style="padding: 4rem 2rem; grid-column: 1/-1; text-align: center; color: var(--text-secondary);">
                <i data-lucide="info" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 1rem; margin-inline: auto;"></i>
                <h3>No Halls Found</h3>
                <p>Try resetting filters or expanding your budget range.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    hallsGrid.innerHTML = filteredHalls.map(hall => {
        // Prices range AY26/27
        const prices = hall.renting_rates.map(r => parseInt(r.ay26_27_rate)).filter(p => !isNaN(p));
        const minPrice = prices.length ? Math.min(...prices) : 'N/A';
        const maxPrice = prices.length ? Math.max(...prices) : 'N/A';
        const priceString = minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`;
        
        // Thumbnail Image
        const image = (hall.images && hall.images.length) ? hall.images[0] : 'https://www.ntu.edu.sg/media/images/default-source/accommodations/accommodation-banners/hall.png';
        
        // Check if compared
        const isCompared = comparedHalls.some(h => h.slug === hall.slug);
        
        return `
            <article class="hall-card glass-container" data-slug="${hall.slug}">
                <div class="hall-card-image-wrap">
                    <img src="${image}" class="hall-card-img" alt="${hall.name} exterior" onerror="this.src='https://www.ntu.edu.sg/media/images/default-source/accommodations/accommodation-banners/hall.png'">
                    <span class="hall-card-badge">${hall.capacity || '500+ Beds'}</span>
                    
                    <div class="hall-card-compare-chk">
                        <label>
                            <input type="checkbox" class="compare-chk" data-slug="${hall.slug}" ${isCompared ? 'checked' : ''}>
                            Compare
                        </label>
                    </div>
                </div>
                
                <div class="hall-card-body">
                    <h3 class="hall-card-title">${hall.name}</h3>
                    <p class="hall-card-desc">${hall.description}</p>
                    
                    <div class="card-spec-row">
                        <span class="spec-badge bath" title="Bathroom type">
                            <i data-lucide="bath"></i> ${hall.bathroom_type} Toilet
                        </span>
                        <span class="spec-badge canteen" title="Near Canteen">
                            <i data-lucide="utensils"></i> ${hall.near_canteen.split(' ')[0]}
                        </span>
                        <span class="spec-badge school" title="Closest School">
                            <i data-lucide="graduation-cap"></i> ${hall.closest_school.split(' ')[0]} (${hall.closest_school_dist}m)
                        </span>
                    </div>
                    
                    <div class="card-pricing-block">
                        <div class="price-meta">
                            <span class="price-label">AY26/27 Rent (Monthly)</span>
                            <span class="price-value">${priceString}</span>
                        </div>
                        <button class="btn-primary view-details-btn" data-slug="${hall.slug}">
                            Details <i data-lucide="arrow-right"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
    
    // Re-bind Lucide icons
    lucide.createIcons();
    
    // Bind click events on buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const slug = btn.getAttribute('data-slug');
            openDetailModal(slug);
        });
    });
    
    document.querySelectorAll('.compare-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const slug = chk.getAttribute('data-slug');
            toggleComparison(slug, e.target.checked);
        });
    });
}

// Compare Manager
function toggleComparison(slug, checkState) {
    const hall = hallsData.find(h => h.slug === slug);
    if (!hall) return;
    
    if (checkState) {
        if (comparedHalls.some(h => h.slug === slug)) return;
        if (comparedHalls.length >= 3) {
            alert('You can select a maximum of 3 halls for side-by-side comparison.');
            // Revert state
            const chk = document.querySelector(`.compare-chk[data-slug="${slug}"]`);
            if (chk) chk.checked = false;
            return;
        }
        comparedHalls.push(hall);
    } else {
        comparedHalls = comparedHalls.filter(h => h.slug !== slug);
    }
    
    updateComparisonDrawer();
}

function clearComparison() {
    comparedHalls = [];
    document.querySelectorAll('.compare-chk').forEach(chk => chk.checked = false);
    updateComparisonDrawer();
}

function updateComparisonDrawer() {
    compareBadge.textContent = comparedHalls.length;
    comparisonStatus.textContent = comparedHalls.length === 1
        ? '1 hall selected. Select one more hall to compare.'
        : comparedHalls.length >= 2 ? `${comparedHalls.length} halls ready to compare.` : '';
    
    if (comparedHalls.length > 0) {
        comparisonDrawer.classList.add('active');
        
        drawerSlots.innerHTML = comparedHalls.map(hall => {
            const image = (hall.images && hall.images.length) ? hall.images[0] : 'https://www.ntu.edu.sg/media/images/default-source/accommodations/accommodation-banners/hall.png';
            return `
                <div class="drawer-slot-item">
                    <img src="${image}" alt="${hall.name}" onerror="this.src='https://www.ntu.edu.sg/media/images/default-source/accommodations/accommodation-banners/hall.png'">
                    <span>${hall.name}</span>
                    <button class="drawer-remove-btn" data-slug="${hall.slug}">
                        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
        
        // Bind drawer remove clicks
        document.querySelectorAll('.drawer-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const slug = btn.getAttribute('data-slug');
                toggleComparison(slug, false);
                // Also uncheck in main grid if exists
                const chk = document.querySelector(`.compare-chk[data-slug="${slug}"]`);
                if (chk) chk.checked = false;
            });
        });
        
        // Toggle action button state
        openComparisonBtn.disabled = comparedHalls.length < 2;
    } else {
        comparisonDrawer.classList.remove('active');
        drawerSlots.innerHTML = '';
        openComparisonBtn.disabled = true;
    }
}

// Side by Side Specs Comparison Modal
function openComparisonModal() {
    if (comparedHalls.length < 2) return;
    
    // Header names and pictures row
    let headerRow = `<tr><th>Specifications</th>`;
    comparedHalls.forEach(hall => {
        const image = (hall.images && hall.images.length) ? hall.images[0] : 'https://www.ntu.edu.sg/media/images/default-source/accommodations/accommodation-banners/hall.png';
        headerRow += `
            <td class="comparison-header-cell">
                <img src="${image}" alt="${hall.name}" onerror="this.src='https://www.ntu.edu.sg/media/images/default-source/accommodations/accommodation-banners/hall.png'">
                <div class="comparison-header-name">${hall.name}</div>
            </td>
        `;
    });
    headerRow += `</tr>`;
    
    const rentRow = buildComparisonRentRows(comparedHalls);
    
    // Bathroom configuration
    let bathRow = `<tr><th>Bathroom Type</th>`;
    comparedHalls.forEach(hall => {
        bathRow += `<td>${hall.bathroom_type} Toilet</td>`;
    });
    bathRow += `</tr>`;

    // Aircon
    let airconRow = `<tr><th>Air Conditioning</th>`;
    comparedHalls.forEach(hall => {
        airconRow += `<td>${hall.aircon}</td>`;
    });
    airconRow += `</tr>`;

    // Lift
    let liftRow = `<tr><th>Lift / Elevator</th>`;
    comparedHalls.forEach(hall => {
        const icon = hall.has_lift === 'Yes' ? 'Yes' : 'No';
        liftRow += `<td>${icon}</td>`;
    });
    liftRow += `</tr>`;

    // Gym
    let gymRow = `<tr><th>In-Hall Gym</th>`;
    comparedHalls.forEach(hall => {
        const hasGym = hall.amenities['Gym'] ? 'Yes' : 'No';
        gymRow += `<td>${hasGym}</td>`;
    });
    gymRow += `</tr>`;

    // Closest School
    let schoolRow = `<tr><th>Closest School</th>`;
    comparedHalls.forEach(hall => {
        schoolRow += `<td>${hall.closest_school} (${hall.closest_school_dist}m away)</td>`;
    });
    schoolRow += `</tr>`;

    // Spine Distances
    let spineRow = `<tr><th>Distance to Spines</th>`;
    comparedHalls.forEach(hall => {
        spineRow += `<td>North Spine: ${hall.dist_to_ns}m<br>South Spine: ${hall.dist_to_ss}m</td>`;
    });
    spineRow += `</tr>`;

    // Near Canteen
    let canteenRow = `<tr><th>Nearby Canteen</th>`;
    comparedHalls.forEach(hall => {
        canteenRow += `<td>${hall.near_canteen}</td>`;
    });
    canteenRow += `</tr>`;

    // Bus Stop
    let busRow = `<tr><th>Nearby Transport</th>`;
    comparedHalls.forEach(hall => {
        busRow += `<td>${hall.bus_stop}</td>`;
    });
    busRow += `</tr>`;

    // Room sizes
    let sizeRow = `<tr><th>Room Sizes</th>`;
    comparedHalls.forEach(hall => {
        sizeRow += `<td>Single: ${hall.room_sizes.single}<br>Double: ${hall.room_sizes.double}</td>`;
    });
    sizeRow += `</tr>`;

    // Capacity
    let capacityRow = `<tr><th>Total Capacity</th>`;
    comparedHalls.forEach(hall => {
        capacityRow += `<td>${hall.capacity || 'Not specified'}</td>`;
    });
    capacityRow += `</tr>`;

    // Assemble Table
    comparisonTableContent.innerHTML = headerRow + rentRow + bathRow + airconRow + sizeRow + liftRow + gymRow + schoolRow + spineRow + canteenRow + busRow + capacityRow;
    
    // Open Modal
    comparisonModal.classList.add('active');
}

function escapeComparisonText(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

// Keep bathroom, room size and aircon variants separate rather than mixing prices.
function buildComparisonRentRows(halls) {
    const normalize = roomType => String(roomType).trim().replace(/\s+/g, ' ').toLowerCase();
    const configurations = new Map();
    halls.forEach(hall => (hall.renting_rates || []).forEach(rate => {
        const key = normalize(rate.room_type);
        if (!configurations.has(key)) configurations.set(key, rate.room_type.trim());
    }));
    if (!configurations.size) {
        return `<tr><th scope="row">AY26/27 Monthly Rent</th>${halls.map(() => '<td>Rate unavailable</td>').join('')}</tr>`;
    }
    return Array.from(configurations).sort(([a], [b]) => a.localeCompare(b)).map(([key, label]) => {
        const cells = halls.map(hall => {
            const rate = (hall.renting_rates || []).find(item => normalize(item.room_type) === key);
            if (!rate) return '<td>Not offered</td>';
            const rawPrice = String(rate.ay26_27_rate ?? '').trim();
            const price = Number(rawPrice.replace(/,/g, ''));
            if (!rawPrice || !Number.isFinite(price) || price <= 0) return '<td>Rate unavailable</td>';
            return `<td class="highlight-cell">S$${price.toLocaleString('en-SG', { maximumFractionDigits: 2 })}</td>`;
        }).join('');
        return `<tr><th scope="row">${escapeComparisonText(label)}</th>${cells}</tr>`;
    }).join('');
}

// Detailed Hall Spec Modal
function openDetailModal(slug) {
    const hall = hallsData.find(h => h.slug === slug);
    if (!hall) return;
    
    // Render hero image
    const image = (hall.images && hall.images.length) ? hall.images[0] : 'https://www.ntu.edu.sg/media/images/default-source/accommodations/accommodation-banners/hall.png';
    const detailHeroBanner = document.getElementById('detail-hero-banner');
    detailHeroBanner.style.backgroundImage = `url('${image}')`;
    
    detailHeroBanner.innerHTML = `
        <div class="hero-banner-content">
            <h2 class="hero-banner-title">${hall.name}</h2>
            <div class="hero-banner-badges">
                <span class="hero-banner-badge">${hall.bathroom_type} Toilet</span>
                <span class="hero-banner-badge">${hall.aircon}</span>
                <span class="hero-banner-badge">Lift: ${hall.has_lift}</span>
            </div>
        </div>
    `;
    
    // Populate overview info
    document.getElementById('detail-desc').textContent = hall.description;
    document.getElementById('detail-capacity').textContent = hall.capacity || 'Not specified';
    document.getElementById('detail-lift').textContent = hall.has_lift === 'Yes' ? 'Yes' : 'No';
    document.getElementById('detail-address').textContent = hall.address;
    document.getElementById('detail-school').textContent = `${hall.closest_school} (${hall.closest_school_dist}m)`;
    document.getElementById('detail-bus').textContent = hall.bus_stop;
    document.getElementById('detail-canteen').textContent = hall.near_canteen;
    
    // Populate rates table
    const ratesTbody = document.getElementById('detail-rates-tbody');
    ratesTbody.innerHTML = hall.renting_rates.map(r => `
        <tr>
            <td class="highlight-cell">${r.room_type}</td>
            <td>$${r.ay25_26_rate || '-'}</td>
            <td class="bold-val">$${r.ay26_27_rate || '-'}</td>
        </tr>
    `).join('');
    
    // Populate detailed amenities table
    const amenitiesTbody = document.getElementById('detail-amenities-tbody');
    const amKeys = Object.keys(hall.amenities);
    amenitiesTbody.innerHTML = amKeys.map(k => {
        const item = hall.amenities[k];
        return `
            <tr>
                <td class="highlight-cell">${k}</td>
                <td>${item.location || 'Within Hall Campus'}</td>
                <td>${item.opening_days || 'Daily'}</td>
                <td>${item.opening_hours || '24 Hours'}</td>
            </tr>
        `;
    }).join('');
    
    // Populate sizes
    document.getElementById('detail-size-single').textContent = hall.room_sizes.single || 'Not specified';
    document.getElementById('detail-size-double').textContent = hall.room_sizes.double || 'Not specified';
    
    // Set first tab active by default
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="tab-overview"]').classList.add('active');
    document.getElementById('tab-overview').classList.add('active');
    
    // Recreate icons in detail modal
    lucide.createIcons();
    
    // Open Modal
    detailModal.classList.add('active');
}

// ==========================================
// Floating AI Chat Assistant (Lyon) Logic
// ==========================================

// NTU Scholarships Data Reference
const SCHOLARSHIPS_DATA = [
    {
        name: "Nanyang Scholarship",
        tuition: "100% Tuition Fees covered",
        livingAllowance: "S$6,500 per academic year",
        hostelAllowance: "Up to S$2,000 per academic year (Hostel residents only)",
        travelGrant: "S$5,000 one-off",
        computerAllowance: "S$1,500 one-off",
        guaranteedHostel: "Guaranteed accommodation for 1st year (with hostel allowance)"
    },
    {
        name: "College Scholarship",
        tuition: "100% Tuition Fees covered",
        livingAllowance: "S$3,600 per academic year",
        hostelAllowance: "Up to S$2,000 per academic year (Hostel residents only)",
        travelGrant: "None",
        computerAllowance: "None",
        guaranteedHostel: "Guaranteed accommodation for 1st year (with hostel allowance)"
    },
    {
        name: "CN Yang Scholars Programme",
        tuition: "100% Tuition Fees covered",
        livingAllowance: "S$6,500 per academic year",
        hostelAllowance: "Up to S$2,000 per academic year for first 2 years",
        travelGrant: "Travel grant available",
        computerAllowance: "Computer allowance available",
        guaranteedHostel: "Guaranteed hostel stay for the first 2 years"
    },
    {
        name: "University Engineering Scholarship (UES)",
        tuition: "100% Tuition Fees covered",
        livingAllowance: "S$6,000 per academic year",
        hostelAllowance: "Up to S$2,000 per academic year (Hostel residents only)",
        travelGrant: "None",
        computerAllowance: "None",
        guaranteedHostel: "No guaranteed hostel, but eligible for hostel allowance"
    },
    {
        name: "NTU Talent Scholarship",
        tuition: "100% Tuition Fees covered",
        livingAllowance: "Varies by programme",
        hostelAllowance: "Up to S$2,000 per academic year (Hostel residents only)",
        travelGrant: "Available for study trips",
        computerAllowance: "None",
        guaranteedHostel: "Guaranteed accommodation for 1st year (with hostel allowance)"
    },
    {
        name: "School Scholarship / NTU Education Award",
        tuition: "100% Tuition Fees covered",
        livingAllowance: "S$3,000 per academic year",
        hostelAllowance: "NO Accommodation Allowance",
        travelGrant: "None",
        computerAllowance: "None",
        guaranteedHostel: "No guaranteed hostel and no hostel allowance"
    }
];

// Initialize Chatbot Event Bindings
function initChatbot() {
    const aiToggleBtn = document.getElementById('ai-toggle-btn');
    const aiCloseBtn = document.getElementById('ai-close-btn');
    const aiChatPanel = document.getElementById('ai-chat-panel');
    const aiSettingsBtn = document.getElementById('ai-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const aiSettingsOverlay = document.getElementById('ai-settings-overlay');
    const geminiApiKeyInput = document.getElementById('gemini-api-key');
    const geminiModelInput = document.getElementById('gemini-model-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const aiChatMessages = document.getElementById('ai-chat-messages');
    const aiInput = document.getElementById('ai-input');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const quickPromptBtns = document.querySelectorAll('.quick-prompt-btn');
    const aiExpandBtn = document.getElementById('ai-expand-btn');
    const aiClearBtn = document.getElementById('ai-clear-btn');

    // Load saved API key in input field
    if (geminiApiKey) {
        geminiApiKeyInput.value = geminiApiKey;
    }

    // Load saved Model inside configuration input
    if (geminiModel) {
        geminiModelInput.value = geminiModel;
    }

    // Toggle assistant panel
    aiToggleBtn.addEventListener('click', () => {
        aiChatPanel.classList.toggle('active');
        if (aiChatPanel.classList.contains('active')) {
            aiInput.focus();
            // Automatically clear the pulse dot animation once opened
            const pulseDot = aiToggleBtn.querySelector('.ai-pulse-dot');
            if (pulseDot) pulseDot.style.display = 'none';
        }
    });

    // Minimize assistant panel
    aiCloseBtn.addEventListener('click', () => {
        aiChatPanel.classList.remove('active');
    });

    // Open Settings overlay (for API key)
    aiSettingsBtn.addEventListener('click', () => {
        aiSettingsOverlay.classList.add('active');
    });

    // Close Settings overlay
    closeSettingsBtn.addEventListener('click', () => {
        aiSettingsOverlay.classList.remove('active');
    });

    // Save API key securely in localStorage
    saveApiKeyBtn.addEventListener('click', () => {
        const key = geminiApiKeyInput.value.trim();
        if (!key) {
            alert('Please enter a valid API Key.');
            return;
        }
        localStorage.setItem('gemini_api_key', key);
        geminiApiKey = key;
        
        const model = geminiModelInput.value.trim() || 'gemini-3.1-flash-lite';
        localStorage.setItem('gemini_model', model);
        geminiModel = model;
        
        aiSettingsOverlay.classList.remove('active');
        
        // Add status message in the chat
        appendBotMessage(`<strong>System:</strong> Settings saved successfully! Active Model: <strong>${geminiModel}</strong>. I am ready to answer your NTU housing and scholarship questions.`);
    });

    // Fullscreen Toggle
    aiExpandBtn.addEventListener('click', () => {
        aiChatPanel.classList.toggle('fullscreen');
        const expandIcon = aiExpandBtn.querySelector('i');
        if (aiChatPanel.classList.contains('fullscreen')) {
            aiExpandBtn.title = "Exit Fullscreen";
            if (expandIcon) expandIcon.setAttribute('data-lucide', 'minimize-2');
        } else {
            aiExpandBtn.title = "Toggle Fullscreen";
            if (expandIcon) expandIcon.setAttribute('data-lucide', 'maximize-2');
        }
        lucide.createIcons();
    });

    // Clear History Chat
    aiClearBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear your chat history?")) {
            chatHistory = [];
            localStorage.removeItem('ai_chat_history');
            restoreWelcomeMessage();
        }
    });

    // Send message triggers
    aiSendBtn.addEventListener('click', handleUserMessage);
    aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserMessage();
        }
    });

    // Quick prompt buttons
    quickPromptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            aiInput.value = btn.textContent;
            handleUserMessage();
        });
    });

    // Load Chat History from LocalStorage on load
    loadChatHistory();
}

// Append User Bubble to Chat
function appendUserMessage(text) {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    
    // If this is the first user query, clear out the default welcome state
    if (chatHistory.length === 0) {
        aiChatMessages.innerHTML = '';
    } else {
        // Remove quick prompts from view to keep message feed clean
        const quickPrompts = aiChatMessages.querySelector('.quick-prompts');
        if (quickPrompts) {
            quickPrompts.remove();
        }
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message user';
    messageDiv.textContent = text;
    
    aiChatMessages.appendChild(messageDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

// Append Bot Bubble to Chat with Markdown Parsing
function appendBotMessage(htmlContent) {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    
    // Remove any loading indicator if present
    const loader = document.getElementById('ai-loading-indicator');
    if (loader) {
        loader.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message bot';
    messageDiv.innerHTML = htmlContent;
    
    aiChatMessages.appendChild(messageDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

// Show Typing Indicator
function showTypingIndicator() {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    
    // Check if loader already exists
    if (document.getElementById('ai-loading-indicator')) return;

    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'ai-message bot';
    loaderDiv.id = 'ai-loading-indicator';
    loaderDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0;">
            <span style="font-weight: 600; color: var(--text-secondary);">Lyon is drafting an answer</span>
            <span class="badge-dot" style="margin-left: 0.2rem; width: 6px; height: 6px; background-color: var(--primary);"></span>
        </div>
    `;
    
    aiChatMessages.appendChild(loaderDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

// Main submission handler
async function handleUserMessage() {
    const aiInput = document.getElementById('ai-input');
    const userQuery = aiInput.value.trim();
    if (!userQuery) return;

    // Check API Key
    if (!geminiApiKey) {
        document.getElementById('ai-settings-overlay').classList.add('active');
        alert('API Key Required: Please enter your Gemini API Key first.');
        return;
    }

    // Append to UI and Clear Input
    appendUserMessage(userQuery);
    aiInput.value = '';

    // Show Loader
    showTypingIndicator();

    // Append user query to history state
    chatHistory.push({
        role: "user",
        parts: [{ text: userQuery }]
    });

    try {
        const systemPrompt = generateSystemPrompt();
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: chatHistory,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 1500
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            throw new Error("Empty response from model");
        }

        const botReply = data.candidates[0].content.parts[0].text;
        
        // Append bot reply to history state
        chatHistory.push({
            role: "model",
            parts: [{ text: botReply }]
        });

        // Save conversation history to localstorage
        localStorage.setItem('ai_chat_history', JSON.stringify(chatHistory));

        // Parse markdown formatting
        const formattedHtml = parseMarkdown(botReply);

        // Render to Chat
        appendBotMessage(formattedHtml);

    } catch (error) {
        console.error("Gemini API Error:", error);
        
        // Remove loader and show error bubble
        const loader = document.getElementById('ai-loading-indicator');
        if (loader) loader.remove();

        // Rollback last query from history as it failed
        chatHistory.pop();
        localStorage.setItem('ai_chat_history', JSON.stringify(chatHistory));

        appendBotMessage(`
            <div style="color: hsl(348, 85%, 48%); font-weight: 600;">
                <i data-lucide="alert-triangle" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 0.3rem;"></i>
                Connection failed
            </div>
            <p style="font-size: 0.8rem; margin-top: 0.4rem; color: var(--text-secondary);">
                Lyon could not connect to the Gemini API. Please make sure your API Key is correct in the top-right settings button or try again later. Error: ${error.message}
            </p>
        `);
        
        // Re-create icons in error bubble
        lucide.createIcons();
    }
}

// Dynamic prompt formatter with halls database and scholarship details
function generateSystemPrompt() {
    // Compress halls data into a highly token-efficient reference JSON format
    const compactHalls = hallsData.map(h => {
        const rates = h.renting_rates.map(r => `${r.room_type}: S$${r.ay26_27_rate}/month`).join(' | ');
        return {
            name: h.name,
            bathroom: h.bathroom_type,
            aircon: h.aircon,
            rates_ay26_27: rates,
            capacity: h.capacity,
            lift: h.has_lift,
            closest_school: `${h.closest_school} (dist: ${h.closest_school_dist}m)`,
            dist_ns: `${h.dist_to_ns}m`,
            dist_ss: `${h.dist_to_ss}m`,
            canteen: h.near_canteen,
            bus: h.bus_stop
        };
    });

    return `You are Lyon, a premium, knowledgeable AI Housing & Scholarship Assistant for NTU (Nanyang Technological University) undergraduate students.
Your personality is warm, student-focused, precise, and supportive. You will help students search, compare, and analyze halls of residence while guiding them through NTU scholarship benefits for housing.

=== NTU ACCOMMODATION DATASET (AY2026-2027) ===
Here is the structured dataset of all 23 halls of residence:
${JSON.stringify(compactHalls, null, 2)}

=== NTU UNDERGRADUATE SCHOLARSHIPS RULES ===
Students frequently ask which scholarships cover their hostel/housing fees and what the exact allowances are:
1. **Nanyang Scholarship**:
   - Covers full tuition fees.
   - Living allowance: S$6,500 per academic year.
   - Hostel accommodation allowance: Up to S$2,000 per academic year (Applies ONLY if the student stays in NTU hostel/campus housing).
   - Travel grant: S$5,000 (one-off).
   - Computer allowance: S$1,500 (one-off).
2. **College Scholarship**:
   - Covers full tuition fees.
   - Living allowance: S$3,600 per academic year.
   - Hostel accommodation allowance: Up to S$2,000 per academic year (Applies ONLY if the student stays in NTU hostel/campus housing).
3. **CN Yang Scholars Programme**:
   - Covers full tuition fees.
   - Living allowance: S$6,500 per academic year.
   - Hostel accommodation allowance: Up to S$2,000 per academic year for the first 2 years. Guaranteed hostel stay for the first 2 years.
4. **University Engineering Scholarship (UES) & NTU Talent Scholarship**:
   - Covers full tuition fees.
   - Living allowance: S$6,000 per academic year.
   - Hostel accommodation allowance: Up to S$2,000 per academic year.
5. **School Scholarship & NTU Education Award**:
   - Covers full tuition fees.
   - Living allowance: S$3,000 per academic year.
   - **Hostel accommodation allowance: S$0 (NONE).** Scholars must co-pay or fully cover their own housing fees.

=== FINANCIAL MATHS & REASONING RULES ===
An academic year is normally counted as 10 months of residence (August to May).
- The maximum hostel allowance of S$2,000/year translates to a budget of S$200/month.
- For double rooms (ranging $380 - $500/mo), the yearly cost is $3,800 - $5,000. S$2,000 is covered, so the student pays the rest out-of-pocket.
- Example: "If you choose a Binjai Hall double room (Air-con) at S$502/month, the total annual rent for 10 months is S$5,020. Your Nanyang Scholarship covers S$2,000. You will have to pay S$3,020 out-of-pocket (roughly S$302/month)."
- Ensure you perform this math whenever a student asks for scholarship calculations!

=== HOW TO RESPOND ===
- Answer directly and professionally. Provide bullet points for visual scannability.
- Use Markdown Tables whenever users ask to compare multiple halls or rates. E.g.
  | Hall | Room Type | Monthly Rate | Closest School |
  | --- | --- | --- | --- |
  | Hall 1 | Double En-suite | $412 | SPMS |
- If the student is asking about transport or nearest school, refer precisely to the dataset's 'bus', 'canteen', 'closest_school', and 'dist_ns' / 'dist_ss' attributes.
- If asked about non-NTU housing or unrelated topics, politely direct them back to NTU accommodation or scholarship programs.
- NEVER invent information not present in the dataset or scholarship rules above.
- Wrap all responses in beautifully formatted clean markdown text.`;
}

// Robust State-based line-by-line Markdown Parser
function parseMarkdown(text) {
    const lines = text.split('\n');
    let html = '';
    let listState = null; // 'ul' or 'ol'
    let tableState = false;
    let activeParagraph = '';
    
    function closeParagraph() {
        if (activeParagraph) {
            html += `<p>${parseInlineMarkdown(activeParagraph)}</p>`;
            activeParagraph = '';
        }
    }
    
    function closeList() {
        if (listState) {
            html += `</${listState}>`;
            listState = null;
        }
    }
    
    function closeTable() {
        if (tableState) {
            html += '</tbody></table></div>';
            tableState = false;
        }
    }
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();
        
        // 1. Table Parsing
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            closeParagraph();
            closeList();
            
            const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
            
            if (!tableState) {
                tableState = true;
                html += '<div class="table-responsive"><table>';
                html += '<thead><tr>' + cells.map(c => `<th>${parseInlineMarkdown(c)}</th>`).join('') + '</tr></thead><tbody>';
            } else {
                if (trimmed.includes('---') || trimmed.includes('-:-')) {
                    continue;
                }
                html += '<tr>' + cells.map(c => `<td>${parseInlineMarkdown(c)}</td>`).join('') + '</tr>';
            }
            continue;
        } else {
            closeTable();
        }
        
        // 2. Headings (# to ######)
        if (trimmed.startsWith('#')) {
            closeParagraph();
            closeList();
            
            let depth = 0;
            while (trimmed[depth] === '#') depth++;
            const content = trimmed.substring(depth).trim();
            html += `<h${Math.min(depth + 1, 6)}>${parseInlineMarkdown(content)}</h${Math.min(depth + 1, 6)}>`;
            continue;
        }
        
        // 3. Unordered Lists (*, -, •)
        const ulMatch = trimmed.match(/^[*\-•]\s+(.+)/);
        if (ulMatch) {
            closeParagraph();
            const content = ulMatch[1];
            if (listState === 'ol') {
                html += '</ol>';
                listState = null;
            }
            if (listState !== 'ul') {
                listState = 'ul';
                html += '<ul>';
            }
            html += `<li>${parseInlineMarkdown(content)}</li>`;
            continue;
        }
        
        // 4. Ordered Lists (1., 2.)
        const olMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (olMatch) {
            closeParagraph();
            const content = olMatch[2];
            if (listState === 'ul') {
                html += '</ul>';
                listState = null;
            }
            if (listState !== 'ol') {
                listState = 'ol';
                html += '<ol>';
            }
            html += `<li>${parseInlineMarkdown(content)}</li>`;
            continue;
        }
        
        // 5. Blank line spacing
        if (trimmed === '') {
            closeParagraph();
            closeList();
            continue;
        }
        
        // 6. Horizontal Rules (---, ***, ___)
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            closeParagraph();
            closeList();
            html += '<hr>';
            continue;
        }
        
        // 7. Standard Paragraph blocks (or paragraph lines concatenation)
        closeList();
        if (activeParagraph) {
            activeParagraph += ' ' + trimmed;
        } else {
            activeParagraph = trimmed;
        }
    }
    
    // Close remaining structures
    closeParagraph();
    closeList();
    closeTable();
    
    return html;
}

// Inline Markdown formatter helper
function parseInlineMarkdown(text) {
    // Bold: **text** or __text__
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');

    // Inline Code: `code`
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');

    return text;
}

// Load Persistent Chat History from LocalStorage
function loadChatHistory() {
    const savedHistory = localStorage.getItem('ai_chat_history');
    if (savedHistory) {
        try {
            chatHistory = JSON.parse(savedHistory);
            if (chatHistory.length > 0) {
                const aiChatMessages = document.getElementById('ai-chat-messages');
                aiChatMessages.innerHTML = ''; // Wipe default welcome state

                chatHistory.forEach(msg => {
                    const text = msg.parts[0].text;
                    const messageDiv = document.createElement('div');
                    if (msg.role === 'user') {
                        messageDiv.className = 'ai-message user';
                        messageDiv.textContent = text;
                    } else {
                        messageDiv.className = 'ai-message bot';
                        messageDiv.innerHTML = parseMarkdown(text);
                    }
                    aiChatMessages.appendChild(messageDiv);
                });

                aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
            }
        } catch (e) {
            console.error("Failed parsing localStorage chat history:", e);
            chatHistory = [];
        }
    }
}

// Restore default chatbot welcome message card + prompt tags
function restoreWelcomeMessage() {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    aiChatMessages.innerHTML = `
        <div class="ai-message bot">
            <p>Hi there! I am <strong>Lyon</strong>, your NTU housing and scholarship assistant. Ask me anything about room rates, bathroom types, distances to schools, or scholarships like the <strong>Nanyang Scholarship</strong> that cover hostel fees!</p>
        </div>
        <!-- Quick Prompt Suggestions -->
        <div class="quick-prompts">
            <button class="quick-prompt-btn">Which halls are closest to CCDS and have air-con?</button>
            <button class="quick-prompt-btn">Which scholarships cover housing accommodation fees?</button>
            <button class="quick-prompt-btn">Compare Hall 1 vs Binjai Hall for budget</button>
            <button class="quick-prompt-btn">What is the Nanyang Scholarship accommodation allowance?</button>
        </div>
    `;

    // Re-bind click event listeners to new quick prompt buttons
    const quickPromptBtns = aiChatMessages.querySelectorAll('.quick-prompt-btn');
    quickPromptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('ai-input').value = btn.textContent;
            handleUserMessage();
        });
    });
}
