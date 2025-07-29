const isGitHubPages = window.location.hostname.includes('github.io');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let basePath = '';
if (isGitHubPages) {
    basePath = window.location.pathname.replace(/\/[^/]*$/, '');
    if (!basePath.endsWith('/')) basePath += '/';
} else if (isLocalhost) {
    basePath = './';
} else {
    basePath = './';
}

console.log('Environment detected:', { isGitHubPages, isLocalhost, basePath, hostname: window.location.hostname });

class RestaurantIntelligencePlatform {
    constructor() {
        this.dataCache = new Map();
        this.currentRegion = null;
        this.currentCuisine = null;
        this.charts = {};
        this.dataIndex = null;
        this.debugMode = true;
        this.basePath = basePath;

        this.init();
    }
    
    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[RestaurantBI] ${message}`, data || '');
        }
    }
    
    error(message, error = null) {
        console.error(`[RestaurantBI ERROR] ${message}`, error || '');
    }
    
    async init() {
        try {
            this.log('Initializing Restaurant Intelligence Platform...');

            await this.loadDataIndex();

            this.setupEventListeners();
            this.populateRegionSelector();
            this.updateStatus('ready', 'System ready');
            
            this.log('Restaurant Intelligence Platform initialized successfully');
        } catch (error) {
            this.error('Error initializing platform:', error);
            this.updateStatus('error', 'System initialization failed - Check console for details');
        }
    }
    
    async loadDataIndex() {
        try {
            this.log('Loading data index...');
            const response = await fetch(this.basePath + 'data/data_index.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.dataIndex = await response.json();
            this.log('Data index loaded successfully:', this.dataIndex.metadata);

            if (!this.dataIndex.coverage || !this.dataIndex.coverage.regions) {
                throw new Error('Invalid data index structure: missing coverage.regions');
            }
            
        } catch (error) {
            this.error('Failed to load data index:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        document.getElementById('regionSelect').addEventListener('change', (e) => {
            this.log(`Region selected: ${e.target.value}`);
            this.onRegionSelected(e.target.value);
        });

        document.getElementById('cuisineSelect').addEventListener('change', (e) => {
            this.log(`Cuisine selected: ${e.target.value}`);
            this.onCuisineSelected(e.target.value);
        });
    }
    
    populateRegionSelector() {
        const select = document.getElementById('regionSelect');
        select.innerHTML = '<option value="">Select a region...</option>';

        const regions = this.dataIndex.coverage?.regions?.top_regions || [];
        this.log('Available regions:', regions);
        
        if (regions.length === 0) {
            this.error('No regions found in data index');
            return;
        }
        
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = `${region} (Region)`;
            select.appendChild(option);
        });
        
        this.log(`Loaded ${regions.length} regions into selector`);
    }
    
    async onRegionSelected(region) {
        if (!region) {
            this.clearAllPanels();
            return;
        }
        
        this.currentRegion = region;
        this.currentCuisine = null;
        
        try {
            this.updateStatus('loading', `Loading data for region ${region}...`);
            this.log(`Loading regional data for: ${region}`);

            const regionalData = await this.loadRegionalData(region);
            this.log('Regional data loaded:', regionalData.metadata);

            this.updateEcosystemPanel(regionalData);

            this.populateCuisineSelector();

            this.updateRegionalInsights(regionalData);
            
            this.updateStatus('ready', `Region ${region} loaded successfully`);
            
        } catch (error) {
            this.error('Error loading regional data:', error);
            this.updateStatus('error', `Failed to load data for region ${region} - Check console`);
        }
    }
    
    async onCuisineSelected(cuisine) {
        if (!cuisine || !this.currentRegion) {
            this.log('Invalid cuisine selection - missing cuisine or region');
            return;
        }
        
        this.currentCuisine = cuisine;
        
        try {
            this.updateStatus('loading', `Analyzing ${cuisine} cuisine in region ${this.currentRegion}...`);
            this.log(`Loading data for ${cuisine} in ${this.currentRegion}`);

            this.clearCuisineContent();

            const cuisineData = await this.loadCuisineData(cuisine);
            this.log('Cuisine data loaded:', {
                market_overview: cuisineData.market_overview,
                has_popular_dishes: !!(cuisineData.popular_dishes?.popularity)
            });
            
            const competitiveData = await this.loadCompetitiveData(this.currentRegion, cuisine);
            this.log('Competitive data loaded:', {
                metadata: competitiveData.metadata,
                competitor_count: competitiveData.key_competitors?.length || 0,
                has_menu_optimization: !!competitiveData.menu_optimization
            });

            await this.updateAllPanels(cuisineData, competitiveData);
            
            this.updateStatus('ready', `${cuisine} analysis complete for region ${this.currentRegion}`);
            
        } catch (error) {
            this.error('Error in cuisine analysis:', error);
            this.updateStatus('error', `Failed to analyze ${cuisine} cuisine - Check console`);
            this.showErrorInPanels(error.message);
        }
    }
    
    clearCuisineContent() {
        const elements = [
            'cuisineBreakdown',
            'competitorList', 
            'opportunityGrid'
        ];
        
        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = '';
                this.log(`Cleared ${elementId}`);
            }
        });
    }
    
    async updateAllPanels(cuisineData, competitiveData) {
        try {
            this.log('Updating all panels...');

            await this.updateCuisinePanel(cuisineData, competitiveData);
            await this.updateCompetitivePanel(competitiveData);
            await this.updateOpportunitiesPanel(cuisineData, competitiveData);

            this.generateComprehensiveInsights(cuisineData, competitiveData);
            
            this.log('All panels updated successfully');
            
        } catch (error) {
            this.error('Error updating panels:', error);
            throw error;
        }
    }
    
    showErrorInPanels(errorMessage) {
        const panels = [
            { content: 'cuisineContent', empty: 'cuisineEmpty' },
            { content: 'competitiveContent', empty: 'competitiveEmpty' },
            { content: 'opportunitiesContent', empty: 'opportunitiesEmpty' }
        ];
        
        panels.forEach(panel => {
            const contentEl = document.getElementById(panel.content);
            const emptyEl = document.getElementById(panel.empty);
            
            if (contentEl && emptyEl) {
                contentEl.style.display = 'none';
                emptyEl.style.display = 'block';
                emptyEl.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">❌</div>
                        <p>Error loading data: ${errorMessage}</p>
                        <p><small>Check browser console for details</small></p>
                    </div>
                `;
            }
        });
    }
    
    async loadRegionalData(region) {
        const cacheKey = `region_${region}`;
        
        if (this.dataCache.has(cacheKey)) {
            this.log(`Using cached regional data for ${region}`);
            return this.dataCache.get(cacheKey);
        }
        
        try {
            const url = `${this.basePath}data/regions/${region}.json`;
            this.log(`Fetching regional data from: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch regional data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            this.dataCache.set(cacheKey, data);
            this.log(`Regional data cached for ${region}`);
            return data;
            
        } catch (error) {
            this.error(`Failed to load regional data for ${region}:`, error);
            throw error;
        }
    }
    
    async loadCuisineData(cuisine) {
        const cacheKey = `cuisine_${cuisine}`;
        
        this.log(`Loading cuisine data for: ${cuisine} (cache key: ${cacheKey})`);
        
        if (this.dataCache.has(cacheKey)) {
            this.log(`Using cached cuisine data for ${cuisine}`);
            return this.dataCache.get(cacheKey);
        }
        
        try {
            const fileName = `${cuisine}_analysis.json`;
            const url = `${this.basePath}data/cuisines/${fileName}`;
            this.log(`Fetching cuisine data from: ${url}`);

            const timestamp = new Date().getTime();
            const response = await fetch(`${url}?t=${timestamp}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch cuisine data: ${response.status} ${response.statusText} for ${url}`);
            }
            
            const data = await response.json();
            this.log(`Cuisine data loaded for ${cuisine}:`, {
                total_restaurants: data.market_overview?.total_restaurants,
                has_popular_dishes: !!(data.popular_dishes?.popularity),
                popular_dishes_count: data.popular_dishes?.popularity?.length
            });
            
            this.dataCache.set(cacheKey, data);
            return data;
            
        } catch (error) {
            this.error(`Failed to load cuisine data for ${cuisine}:`, error);
            throw error;
        }
    }
    
    async loadCompetitiveData(region, cuisine) {
        const cacheKey = `competitive_${region}_${cuisine}`;
        
        if (this.dataCache.has(cacheKey)) {
            this.log(`Using cached competitive data for ${region}_${cuisine}`);
            return this.dataCache.get(cacheKey);
        }
        
        try {
            const fileName = `${region}_${cuisine}.json`;
            const url = `${this.basePath}data/competitive/${fileName}`;
            this.log(`Fetching competitive data from: ${url}`);

            const timestamp = new Date().getTime();
            const response = await fetch(`${url}?t=${timestamp}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch competitive data: ${response.status} ${response.statusText} for ${url}`);
            }
            
            const data = await response.json();
            this.log(`Competitive data loaded for ${region}_${cuisine}:`, {
                metadata: data.metadata,
                competitor_count: data.key_competitors?.length || 0,
                menu_optimization_status: data.menu_optimization?.status || 'available',
                popular_dishes_count: data.menu_optimization?.regional_popular_dishes?.length || 0
            });
            
            this.dataCache.set(cacheKey, data);
            return data;
            
        } catch (error) {
            this.error(`Failed to load competitive data for ${region}_${cuisine}:`, error);
            throw error;
        }
    }
    
    updateEcosystemPanel(regionalData) {
        const ecosystemContent = document.getElementById('ecosystemContent');
        const ecosystemEmpty = document.getElementById('ecosystemEmpty');
        
        try {
            if (regionalData.market_overview || regionalData.competitive_environment) {
                ecosystemEmpty.style.display = 'none';
                ecosystemContent.style.display = 'block';
                
                const overview = regionalData.market_overview || {};
                const competitive = regionalData.competitive_environment || {};
                const landscape = regionalData.cuisine_landscape || {};
                const opportunities = regionalData.market_opportunities || [];

                const diversityScore = this.calculateDiversityScore(overview, landscape);
                const saturationLevel = this.mapSaturationLevel(competitive.competition_intensity);
                const opportunityScore = this.calculateOpportunityScore(opportunities, overview);
                const customerLevel = this.mapCustomerLevel(competitive.overall_quality);

                document.getElementById('diversityScore').textContent = diversityScore;
                document.getElementById('saturationLevel').textContent = saturationLevel;
                document.getElementById('opportunityScore').textContent = opportunityScore;
                document.getElementById('customerSophistication').textContent = customerLevel;

                this.createEcosystemChart({
                    diversity_score: diversityScore / 100,
                    opportunity_score: opportunityScore / 100,
                    competition_intensity: competitive.competition_intensity,
                    market_quality: competitive.overall_quality
                }, overview);
                
                this.log('Ecosystem panel updated successfully with real data', {
                    diversityScore,
                    saturationLevel,
                    opportunityScore,
                    customerLevel
                });
            } else {
                ecosystemContent.style.display = 'none';
                ecosystemEmpty.style.display = 'block';
                this.log('No ecosystem data available - showing empty state');
            }
        } catch (error) {
            this.error('Error updating ecosystem panel:', error);
        }
    }
    
    calculateDiversityScore(overview, landscape) {
        const cuisineCount = overview.cuisine_diversity || 0;
        const totalRestaurants = overview.total_restaurants || 1;

        let diversityScore = Math.min(100, (cuisineCount / totalRestaurants) * 1000);

        if (landscape.emerging_cuisines && landscape.emerging_cuisines.length > 0) {
            diversityScore += landscape.emerging_cuisines.length * 5;
        }
        
        return Math.min(100, Math.round(diversityScore));
    }
    
    mapSaturationLevel(competitionIntensity) {
        const mapping = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'very_high': 'Very High'
        };
        return mapping[competitionIntensity] || 'Medium';
    }
    
    calculateOpportunityScore(opportunities, overview) {
        let score = 50;
        
        if (opportunities && opportunities.length > 0) {
            score += opportunities.length * 10;

            const highPotentialOpps = opportunities.filter(opp => opp.potential === 'high');
            score += highPotentialOpps.length * 15;
        }

        const totalRestaurants = overview.total_restaurants || 0;
        if (totalRestaurants < 50) {
            score += 20;
        } else if (totalRestaurants < 100) {
            score += 10;
        }
        
        return Math.min(100, Math.round(score));
    }
    
    mapCustomerLevel(overallQuality) {
        const mapping = {
            'low': 'Basic',
            'medium': 'Moderate',
            'high': 'Sophisticated',
            'very_high': 'Expert'
        };
        return mapping[overallQuality] || 'Moderate';
    }
    
    createEcosystemChart(healthData, overviewData) {
        const ctx = document.getElementById('ecosystemChart').getContext('2d');
        
        if (this.charts.ecosystem) {
            this.charts.ecosystem.destroy();
        }
        
        try {
            this.charts.ecosystem = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['Diversity', 'Opportunity', 'Customer Level', 'Market Health'],
                    datasets: [{
                        label: 'Market Ecosystem',
                        data: [
                            (healthData.diversity_score || 0.5) * 100,
                            (healthData.opportunity_score || 0.5) * 100,
                            70, // Customer sophistication placeholder
                            ((healthData.diversity_score + healthData.opportunity_score) / 2 || 0.5) * 100
                        ],
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: { display: true },
                            suggestedMin: 0,
                            suggestedMax: 100
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
            
            this.log('Ecosystem chart created successfully');
        } catch (error) {
            this.error('Error creating ecosystem chart:', error);
        }
    }
    
    populateCuisineSelector() {
        const select = document.getElementById('cuisineSelect');
        select.innerHTML = '<option value="">Select a cuisine...</option>';
        select.disabled = false;

        const cuisines = this.dataIndex.coverage?.cuisines?.main_cuisines || [];
        this.log('Available cuisines:', cuisines);
        
        if (cuisines.length === 0) {
            this.error('No cuisines found in data index');
            select.disabled = true;
            return;
        }
        
        cuisines.forEach(cuisine => {
            const option = document.createElement('option');
            option.value = cuisine;
            option.textContent = cuisine.replace(/[_()]/g, ' ').replace(/\s+/g, ' ').trim();
            select.appendChild(option);
        });
        
        this.log(`Loaded ${cuisines.length} cuisines into selector`);
    }
    
    async updateCuisinePanel(cuisineData, competitiveData) {
        const cuisineContent = document.getElementById('cuisineContent');
        const cuisineEmpty = document.getElementById('cuisineEmpty');
        
        try {
            this.log('Updating cuisine panel...', {
                has_cuisine_data: !!cuisineData,
                has_competitive_data: !!competitiveData,
                data_quality: competitiveData?.metadata?.data_quality
            });

            let displayData = [];
            let dataSource = "unknown";

            if (competitiveData?.key_competitors?.length > 0) {
                displayData = competitiveData.key_competitors.slice(0, 5).map(competitor => ({
                    name: competitor.name,
                    rating: competitor.rating || competitor.stars || 0,
                    reviews: competitor.review_count || 0,
                    position: competitor.market_position || 'Unknown',
                    strengths: competitor.key_strengths || 'N/A'
                }));
                dataSource = "key_competitors";
                this.log('Using key competitors data', displayData.length);
            }
            else if (cuisineData?.regional_variations && Object.keys(cuisineData.regional_variations).length > 0) {
                const currentRegion = this.currentRegion;
                const regionData = cuisineData.regional_variations[currentRegion];
                
                if (regionData) {
                    displayData = [{
                        name: `${this.currentCuisine} restaurants in ${currentRegion}`,
                        rating: regionData.average_rating || 0,
                        reviews: regionData.total_reviews || 0,
                        position: regionData.market_maturity || 'Unknown',
                        strengths: `${regionData.restaurant_count} restaurants, ${regionData.competition_level} competition`
                    }];
                    dataSource = "regional_variations";
                    this.log('Using regional variations data');
                }
            }
            else if (cuisineData?.national_overview) {
                const overview = cuisineData.national_overview;
                displayData = [{
                    name: `${this.currentCuisine} cuisine overview`,
                    rating: overview.average_rating || 0,
                    reviews: overview.total_reviews || 0,
                    position: 'National',
                    strengths: `${overview.total_restaurants} restaurants across ${overview.regional_presence} regions`
                }];
                dataSource = "national_overview";
                this.log('Using national overview data');
            }
            
            if (displayData && displayData.length > 0) {
                cuisineEmpty.style.display = 'none';
                cuisineContent.style.display = 'block';
                
                const breakdown = document.getElementById('cuisineBreakdown');
                breakdown.innerHTML = '';
                
                this.log(`Displaying ${displayData.length} items from ${dataSource}`);

                displayData.forEach((item, index) => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'cuisine-item';
                    
                    itemElement.innerHTML = `
                        <span class="cuisine-name">${item.name}</span>
                        <div class="cuisine-stats">
                            <span>${item.rating.toFixed(1)} ⭐</span>
                            <span>${item.reviews} reviews</span>
                            <span>${item.position}</span>
                        </div>
                    `;
                    breakdown.appendChild(itemElement);
                });
                
                this.createCuisineChart(cuisineData, competitiveData, dataSource);
                
                this.log('Cuisine panel updated successfully');
            } else {
                cuisineContent.style.display = 'none';
                cuisineEmpty.style.display = 'block';
                
                const hasAnyData = (competitiveData?.metadata?.restaurant_count > 0) || 
                                  (cuisineData?.national_overview?.total_restaurants > 0);
                
                if (hasAnyData) {
                    cuisineEmpty.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <p>Data available but no detailed analysis for ${this.currentCuisine} in ${this.currentRegion}</p>
                            <p><small>Restaurant count: ${competitiveData?.metadata?.restaurant_count || 0}</small></p>
                            <p><small>Data quality: ${competitiveData?.metadata?.data_quality || 'unknown'}</small></p>
                        </div>
                    `;
                } else {
                    cuisineEmpty.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <p>No data available for ${this.currentCuisine} in ${this.currentRegion}</p>
                            <p><small>Try selecting a different region or cuisine combination</small></p>
                        </div>
                    `;
                }
                this.log('No valid data available for cuisine panel');
            }
        } catch (error) {
            this.error('Error updating cuisine panel:', error);

            cuisineContent.style.display = 'none';
            cuisineEmpty.style.display = 'block';
            cuisineEmpty.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Error loading cuisine analysis</p>
                    <p><small>${error.message}</small></p>
                </div>
            `;
            throw error;
        }
    }
    
    createCuisineChart(cuisineData, competitiveData, dataSource) {
        const ctx = document.getElementById('cuisineChart').getContext('2d');
        
        if (this.charts.cuisine) {
            this.charts.cuisine.destroy();
        }
        
        try {
            this.log(`Creating cuisine chart with data source: ${dataSource}`);

            if (competitiveData?.metadata) {
                const regionInfo = competitiveData.metadata;
                
                this.charts.cuisine = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: [`Region ${regionInfo.region}`, 'Other Areas'],
                        datasets: [{
                            data: [70, 30],
                            backgroundColor: [
                                'rgba(102, 126, 234, 0.8)',
                                'rgba(200, 200, 200, 0.3)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom' },
                            title: { 
                                display: true, 
                                text: `Regional Analysis: ${regionInfo.region} (${regionInfo.cuisine})` 
                            }
                        }
                    }
                });
                
                this.log('Regional focus chart created');
                return;
            }

            this.charts.cuisine = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Data Available', 'Analysis Complete'],
                    datasets: [{
                        label: 'Status',
                        data: [100, 90],
                        backgroundColor: 'rgba(102, 126, 234, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Analysis Status' }
                    }
                }
            });
            
            this.log('Fallback chart created');
            
        } catch (error) {
            this.error('Error creating cuisine chart:', error);
        }
    }
    
    async updateCompetitivePanel(competitiveData) {
        const competitiveContent = document.getElementById('competitiveContent');
        const competitiveEmpty = document.getElementById('competitiveEmpty');
        
        try {
            if (competitiveData.key_competitors && competitiveData.key_competitors.length > 0) {
                competitiveEmpty.style.display = 'none';
                competitiveContent.style.display = 'block';
                
                const competitors = document.getElementById('competitorList');
                competitors.innerHTML = '';
                
                this.log(`Displaying ${competitiveData.key_competitors.length} competitors`);
                
                competitiveData.key_competitors.slice(0, 5).forEach(competitor => {
                    const competitorElement = document.createElement('div');
                    competitorElement.className = 'competitor-item';
                    
                    const rating = competitor.rating || competitor.stars || 0;
                    const reviews = competitor.review_count || 0;
                    
                    competitorElement.innerHTML = `
                        <div class="competitor-name">${competitor.name}</div>
                        <div class="competitor-details">
                            <div class="competitor-stats">
                                <span>${rating.toFixed(1)} ⭐</span>
                                <span>${reviews} reviews</span>
                            </div>
                            <div><strong>Strengths:</strong> ${competitor.key_strengths || 'N/A'}</div>
                            <div><strong>Weaknesses:</strong> ${competitor.key_weaknesses || 'N/A'}</div>
                        </div>
                    `;
                    competitors.appendChild(competitorElement);
                });
                
                this.log('Competitive panel updated successfully');
            } else {
                competitiveContent.style.display = 'none';
                competitiveEmpty.style.display = 'block';
                this.log('No competitors data available');
            }
        } catch (error) {
            this.error('Error updating competitive panel:', error);
        }
    }
    
    async updateOpportunitiesPanel(cuisineData, competitiveData) {
        const opportunitiesContent = document.getElementById('opportunitiesContent');
        const opportunitiesEmpty = document.getElementById('opportunitiesEmpty');
        
        try {
            const opportunities = competitiveData.differentiation_opportunities || [];
            
            if (opportunities.length > 0) {
                opportunitiesEmpty.style.display = 'none';
                opportunitiesContent.style.display = 'block';
                
                const opportunityGrid = document.getElementById('opportunityGrid');
                opportunityGrid.innerHTML = '';
                
                this.log(`Displaying ${opportunities.length} opportunities`);
                
                opportunities.slice(0, 5).forEach(opp => {
                    const oppElement = document.createElement('div');
                    oppElement.className = 'opportunity-card';

                    let score = 60;
                    if (opp.market_demand === 'high') score += 20;
                    if (opp.competitive_advantage === 'strong') score += 15;
                    if (opp.implementation_difficulty === 'low') score += 5;
                    
                    oppElement.innerHTML = `
                        <div class="opportunity-header">
                            <div class="opportunity-title">${opp.opportunity}</div>
                            <div class="opportunity-score">${score}</div>
                        </div>
                        <div class="opportunity-description">
                            <div><strong>Market Demand:</strong> ${opp.market_demand || 'Medium'}</div>
                            <div><strong>Implementation:</strong> ${opp.implementation_difficulty || 'Moderate'}</div>
                            <div><strong>Advantage:</strong> ${opp.competitive_advantage || 'Moderate'}</div>
                            ${opp.region_specific ? '<div><strong>Type:</strong> Region-Specific</div>' : ''}
                        </div>
                    `;
                    opportunityGrid.appendChild(oppElement);
                });
                
                this.log('Opportunities panel updated successfully');
            } else {
                opportunitiesContent.style.display = 'none';
                opportunitiesEmpty.style.display = 'block';
                this.log('No opportunities data available');
            }
        } catch (error) {
            this.error('Error updating opportunities panel:', error);
        }
    }
    
    updateRegionalInsights(regionalData) {
        const insights = [];
        
        try {
            if (regionalData.market_overview) {
                const overview = regionalData.market_overview;
                insights.push({
                    title: 'Regional Market Overview',
                    description: `This region has ${overview.total_restaurants || 'N/A'} restaurants across ${overview.cuisine_diversity || 'N/A'} different cuisines. Average rating is ${overview.average_rating || 'N/A'} stars with ${overview.total_reviews || 'N/A'} total reviews.`
                });
            }
            
            if (regionalData.competitive_environment) {
                const competitive = regionalData.competitive_environment;
                insights.push({
                    title: 'Business Environment',
                    description: `Market shows ${competitive.competition_intensity || 'unknown'} competition intensity with ${competitive.overall_quality || 'unknown'} overall quality. Quality consistency is ${competitive.quality_consistency || 'unknown'} and market maturity is ${competitive.market_maturity || 'unknown'}.`
                });
            }

            if (regionalData.market_opportunities && regionalData.market_opportunities.length > 0) {
                const opportunities = regionalData.market_opportunities;
                const highPotential = opportunities.filter(opp => opp.potential === 'high');
                insights.push({
                    title: 'Market Opportunities',
                    description: `${opportunities.length} market opportunities identified, with ${highPotential.length} high-potential opportunities. Key gaps include ${opportunities.slice(0, 3).map(opp => opp.cuisine).join(', ')}.`
                });
            }

            if (regionalData.cuisine_landscape) {
                const landscape = regionalData.cuisine_landscape;
                if (landscape.dominant_cuisines && landscape.dominant_cuisines.length > 0) {
                    const topCuisine = landscape.dominant_cuisines[0];
                    insights.push({
                        title: 'Cuisine Landscape',
                        description: `Market is dominated by ${topCuisine.cuisine} with ${topCuisine.restaurant_count} restaurants. ${landscape.emerging_cuisines?.length || 0} emerging cuisines and ${landscape.underrepresented_cuisines?.length || 0} underrepresented cuisines identified.`
                    });
                }
            }
            
            this.displayInsights(insights);
            this.log('Regional insights updated with real data', insights.length);
            
        } catch (error) {
            this.error('Error updating regional insights:', error);
            this.displayInsights([{
                title: 'Error Loading Insights',
                description: 'Unable to load regional insights. Check console for details.'
            }]);
        }
    }
    
    generateComprehensiveInsights(cuisineData, competitiveData) {
        const insights = [];
        
        try {
            if (cuisineData.market_overview) {
                const overview = cuisineData.market_overview;
                insights.push({
                    title: 'Market Analysis',
                    description: `This cuisine has ${overview.total_restaurants || 'N/A'} restaurants with ${overview.market_penetration || 'unknown'} market penetration. Average rating: ${overview.average_rating || 'N/A'} stars across ${overview.total_reviews || 'N/A'} reviews.`
                });
            }

            if (competitiveData.market_saturation) {
                const saturation = competitiveData.market_saturation;
                insights.push({
                    title: 'Competitive Landscape',
                    description: `Market saturation is ${saturation.saturation_level} with ${saturation.restaurant_density} competitors. Entry difficulty: ${saturation.entry_difficulty}. Average competitor rating: ${saturation.average_rating} stars.`
                });
            }

            if (competitiveData.menu_optimization && competitiveData.menu_optimization.regional_context) {
                const context = competitiveData.menu_optimization.regional_context;
                insights.push({
                    title: 'Market Positioning Strategy',
                    description: `This region shows ${context.market_segment} market characteristics with ${context.customer_expectations} customer expectations. Competition intensity: ${context.competition_intensity} restaurants.`
                });
            }

            if (competitiveData.menu_optimization?.strategic_recommendations?.length > 0) {
                const topRec = competitiveData.menu_optimization.strategic_recommendations[0];
                insights.push({
                    title: 'Strategic Recommendation',
                    description: `${topRec.recommendation}. Rationale: ${topRec.rationale}. Priority: ${topRec.priority}.`
                });
            }
            
            this.displayInsights(insights);
            this.log('Comprehensive insights generated');
            
        } catch (error) {
            this.error('Error generating comprehensive insights:', error);
        }
    }
    
    displayInsights(insights) {
        const container = document.getElementById('insightsContainer');
        
        if (insights.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <p>No insights available yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        `).join('');
        
        this.log(`Displayed ${insights.length} insights`);
    }
    
    updateStatus(type, message) {
        const indicator = document.getElementById('statusIndicator');
        indicator.className = `status-indicator ${type}`;
        
        const icons = {
            loading: '⏳',
            ready: '✅',
            error: '❌'
        };
        
        indicator.innerHTML = `
            <span>${icons[type]}</span>
            <span>${message}</span>
        `;
        
        this.log(`Status updated: ${type} - ${message}`);
    }
    
    clearAllPanels() {
        try {
            document.getElementById('ecosystemEmpty').style.display = 'block';
            document.getElementById('ecosystemContent').style.display = 'none';
            
            document.getElementById('cuisineEmpty').style.display = 'block';
            document.getElementById('cuisineContent').style.display = 'none';
            
            document.getElementById('competitiveEmpty').style.display = 'block';
            document.getElementById('competitiveContent').style.display = 'none';
            
            document.getElementById('opportunitiesEmpty').style.display = 'block';
            document.getElementById('opportunitiesContent').style.display = 'none';

            const cuisineSelect = document.getElementById('cuisineSelect');
            cuisineSelect.innerHTML = '<option value="">Select region first...</option>';
            cuisineSelect.disabled = true;

            document.getElementById('insightsContainer').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <p>Actionable business insights will appear as you explore regions and cuisines</p>
                </div>
            `;

            Object.values(this.charts).forEach(chart => {
                if (chart) chart.destroy();
            });
            this.charts = {};
            
            this.updateStatus('ready', 'Select a region to begin analysis');
            this.log('All panels cleared');
            
        } catch (error) {
            this.error('Error clearing panels:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🍽️ Initializing Restaurant Business Intelligence Platform...');
    window.restaurantIntelligence = new RestaurantIntelligencePlatform();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RestaurantIntelligencePlatform };
}