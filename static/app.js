// State
let currentTab = 'suggestions';

// LocalStorage keys
const STORAGE_KEYS = {
    settings: 'domain_ai_settings',
    history: 'domain_ai_history',
    suggestions: 'domain_ai_suggestions'
};

// PostHog tracking helper
function track(event, properties = {}) {
    if (window.posthog) {
        posthog.capture(event, properties);
    }
}

// LocalStorage helpers
function getLocalData(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error('Error reading localStorage:', e);
        return defaultValue;
    }
}

function setLocalData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Error writing localStorage:', e);
    }
}

// DOM Elements
const suggestionsContainer = document.getElementById('suggestions-container');
const historyContainer = document.getElementById('history-container');
const tabSuggestions = document.getElementById('tab-suggestions');
const tabHistory = document.getElementById('tab-history');
const mainLayout = document.getElementById('main-layout');
const searchColumn = document.getElementById('search-column');
const resultsColumn = document.getElementById('results-column');

// Check if user has used the app before
function hasUsedBefore() {
    return localStorage.getItem('domain_ai_has_used') === 'true';
}

function markAsUsed() {
    localStorage.setItem('domain_ai_has_used', 'true');
}

// Expand layout to show results
function expandLayout() {
    if (mainLayout.dataset.expanded === 'true') return;

    mainLayout.dataset.expanded = 'true';
    mainLayout.classList.remove('grid-cols-1', 'justify-center');
    mainLayout.classList.add('grid-cols-[420px_1fr]', 'max-lg:grid-cols-1');

    searchColumn.classList.remove('justify-self-center');
    searchColumn.classList.add('justify-self-start');

    // Left-align the header
    const pageHeader = document.getElementById('page-header');
    pageHeader.classList.remove('text-center');
    pageHeader.classList.add('text-left');

    resultsColumn.classList.remove('hidden');
    setTimeout(() => {
        resultsColumn.classList.remove('opacity-0');
        resultsColumn.classList.add('opacity-100');
    }, 100);

    markAsUsed();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    // If user has used before, expand layout immediately and load suggestions
    if (hasUsedBefore()) {
        // Set expanded state immediately without animation
        mainLayout.dataset.expanded = 'true';
        mainLayout.classList.remove('grid-cols-1', 'justify-center');
        mainLayout.classList.add('grid-cols-[420px_1fr]', 'max-lg:grid-cols-1');
        searchColumn.classList.remove('justify-self-center');
        searchColumn.classList.add('justify-self-start');
        document.getElementById('page-header').classList.remove('text-center');
        document.getElementById('page-header').classList.add('text-left');
        resultsColumn.classList.remove('hidden', 'opacity-0');
        resultsColumn.classList.add('opacity-100');

        loadSuggestions();
    }

    setupEventListeners();
});

function setupEventListeners() {
    // Tab switching
    tabSuggestions.addEventListener('click', () => switchTab('suggestions'));
    tabHistory.addEventListener('click', () => switchTab('history'));

    // Generate button
    document.getElementById('btn-generate').addEventListener('click', generateSuggestions);

    // Save settings on blur
    document.getElementById('description').addEventListener('blur', saveSettings);
    document.getElementById('tlds').addEventListener('blur', saveSettings);
    document.getElementById('daily-count').addEventListener('blur', saveSettings);
}

function switchTab(tab) {
    currentTab = tab;

    // Update tab styles
    if (tab === 'suggestions') {
        tabSuggestions.classList.add('bg-gray-apple-bg', 'text-gray-900');
        tabSuggestions.classList.remove('text-gray-apple');
        tabHistory.classList.remove('bg-gray-apple-bg', 'text-gray-900');
        tabHistory.classList.add('text-gray-apple');
    } else {
        tabHistory.classList.add('bg-gray-apple-bg', 'text-gray-900');
        tabHistory.classList.remove('text-gray-apple');
        tabSuggestions.classList.remove('bg-gray-apple-bg', 'text-gray-900');
        tabSuggestions.classList.add('text-gray-apple');
    }

    suggestionsContainer.classList.toggle('hidden', tab !== 'suggestions');
    historyContainer.classList.toggle('hidden', tab !== 'history');

    if (tab === 'history') {
        loadHistory();
    }
}

// API Functions
async function loadSuggestions() {
    suggestionsContainer.innerHTML = `
        <div class="text-center py-16 text-gray-apple">
            <div class="w-8 h-8 border-3 border-gray-200 border-t-gray-900 rounded-full spinner mx-auto mb-4"></div>
            Loading suggestions...
        </div>`;

    try {
        const response = await fetch('/api/suggestions');
        const data = await response.json();
        renderSuggestions(data.suggestions);
    } catch (error) {
        suggestionsContainer.innerHTML = `
            <div class="text-center py-16 text-gray-apple">
                <h2 class="text-xl font-semibold text-gray-900 mb-2">Error loading suggestions</h2>
                <p class="text-[15px]">Please try again later.</p>
            </div>`;
    }
}

async function generateSuggestions() {
    // Save settings first
    await saveSettings();

    // Expand layout to show results column
    expandLayout();

    const btn = document.getElementById('btn-generate');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    suggestionsContainer.innerHTML = `
        <div class="text-center py-16 text-gray-apple">
            <div class="w-8 h-8 border-3 border-gray-200 border-t-gray-900 rounded-full spinner mx-auto mb-4"></div>
            Generating domain suggestions with AI...
        </div>`;

    const description = document.getElementById('description').value;
    track('generate_domains_started', { description_length: description.length });

    try {
        const response = await fetch('/api/suggestions/generate', { method: 'POST' });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate suggestions');
        }
        const data = await response.json();
        renderSuggestions(data.suggestions);

        track('generate_domains_completed', {
            count: data.suggestions.length,
            tokens: data.usage?.total_tokens,
            cost: data.usage?.cost_usd
        });

        // Show usage stats
        if (data.usage) {
            document.getElementById('usage-tokens').textContent = data.usage.total_tokens.toLocaleString();
            document.getElementById('usage-cost').textContent = '$' + data.usage.cost_usd.toFixed(4);
            document.getElementById('usage-footer').classList.remove('hidden');
        }
    } catch (error) {
        track('generate_domains_error', { error: error.message });
        alert('Error: ' + error.message);
        loadSuggestions();
    } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Domains';
    }
}

function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        suggestionsContainer.innerHTML = `
            <div class="text-center py-16 text-gray-apple">
                <h2 class="text-xl font-semibold text-gray-900 mb-2">No suggestions yet</h2>
                <p class="text-[15px]">Describe what you're looking for above and click "Generate Domains"</p>
            </div>
        `;
        return;
    }

    const html = suggestions.map(s => `
        <div class="domain-card group px-6 py-5 flex justify-between items-center gap-5 hover:bg-gray-50 transition-all opacity-0 translate-y-2.5 animate-fade-in-up border-b border-gray-200 last:border-b-0" data-id="${s.id}">
            <div class="flex flex-col gap-1 flex-1 min-w-0">
                <span class="domain-name text-[17px] font-semibold text-gray-900 tracking-tight">${s.domain}</span>
                ${s.reason ? `<p class="text-sm text-gray-apple leading-snug">${s.reason}</p>` : ''}
            </div>
            <div class="flex gap-2 items-center flex-shrink-0 relative">
                <div class="absolute bottom-full right-0 flex gap-1.5 pb-2 opacity-0 invisible translate-y-1 transition-all group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
                    <a href="${s.links?.namecheap || '#'}" target="_blank"
                        class="bg-gray-900 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-black transition-all whitespace-nowrap">Namecheap</a>
                    <a href="${s.links?.porkbun || '#'}" target="_blank"
                        class="bg-gray-900 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-black transition-all whitespace-nowrap">Porkbun</a>
                </div>
                <span class="text-lg font-semibold text-gray-900 min-w-[50px] text-right">$${s.price?.toFixed(0) || '10'}</span>
                <button class="w-11 h-11 flex items-center justify-center rounded-lg text-gray-apple hover:bg-green-500/10 hover:text-green-500 transition-all"
                    onclick="submitFeedback(${s.id}, true)" title="Like">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                </button>
                <button class="w-11 h-11 flex items-center justify-center rounded-lg text-gray-apple hover:bg-red-500/10 hover:text-red-500 transition-all"
                    onclick="submitFeedback(${s.id}, false)" title="Dislike">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    suggestionsContainer.innerHTML = `<div class="flex flex-col">${html}</div>`;
}

async function submitFeedback(suggestionId, liked) {
    // Get domain name for tracking
    const card = document.querySelector(`.domain-card[data-id="${suggestionId}"]`);
    const domainName = card?.querySelector('.domain-name')?.textContent || '';

    track('domain_feedback', { domain: domainName, liked });

    // Save to localStorage history
    const history = getLocalData(STORAGE_KEYS.history, []);
    history.unshift({
        domain: domainName,
        liked: liked,
        created_at: new Date().toISOString()
    });
    // Keep only last 100 items
    setLocalData(STORAGE_KEYS.history, history.slice(0, 100));

    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suggestion_id: suggestionId, liked })
        });

        if (!response.ok) throw new Error('Failed to submit feedback');

        // Remove the card with animation
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'translateX(100px)';
            card.style.transition = 'all 0.3s';
            setTimeout(() => {
                card.remove();
                // Check if grid is empty
                const grid = suggestionsContainer.querySelector('.suggestions-grid');
                if (grid && grid.children.length === 0) {
                    renderSuggestions([]);
                }
            }, 300);
        }
    } catch (error) {
        console.error('Error syncing feedback to server:', error);
    }
}

async function loadHistory() {
    // First try localStorage
    const localHistory = getLocalData(STORAGE_KEYS.history);

    if (localHistory && localHistory.length > 0) {
        renderHistory(localHistory);
    } else {
        // Fallback to server history (for migration)
        historyContainer.innerHTML = `
            <div class="text-center py-16 text-gray-apple">
                <div class="w-8 h-8 border-3 border-gray-200 border-t-gray-900 rounded-full spinner mx-auto mb-4"></div>
                Loading history...
            </div>`;
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            renderHistory(data.history);
            // Save to localStorage for future
            if (data.history && data.history.length > 0) {
                setLocalData(STORAGE_KEYS.history, data.history);
            }
        } catch (error) {
            historyContainer.innerHTML = `
                <div class="text-center py-16 text-gray-apple">
                    <h2 class="text-xl font-semibold text-gray-900 mb-2">No history yet</h2>
                </div>`;
        }
    }
}

function renderHistory(history) {
    if (!history || history.length === 0) {
        historyContainer.innerHTML = `
            <div class="text-center py-16 text-gray-apple">
                <h2 class="text-xl font-semibold text-gray-900 mb-2">No history yet</h2>
                <p class="text-[15px]">Your liked and disliked domains will appear here.</p>
            </div>
        `;
        return;
    }

    const html = history.map(h => `
        <div class="px-6 py-4 flex justify-between items-center border-b border-gray-200 last:border-b-0">
            <span class="font-semibold text-[15px]">${h.domain}</span>
            <span class="px-2.5 py-1 rounded-md text-xs font-medium ${h.liked ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}">
                ${h.liked ? 'Liked' : 'Disliked'}
            </span>
        </div>
    `).join('');

    historyContainer.innerHTML = `<div class="flex flex-col">${html}</div>`;
}

// Settings
async function loadSettings() {
    // First try localStorage
    const localSettings = getLocalData(STORAGE_KEYS.settings);

    if (localSettings) {
        document.getElementById('description').value = localSettings.description || '';
        document.getElementById('tlds').value = localSettings.tlds || '.com,.io,.ai';
        document.getElementById('daily-count').value = localSettings.daily_count || 25;
    } else {
        // Fallback to server settings (for migration)
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            const settings = data.settings;

            document.getElementById('description').value = settings.description || '';
            document.getElementById('tlds').value = settings.tlds || '.com,.io,.ai';
            document.getElementById('daily-count').value = settings.daily_count || 25;

            // Save to localStorage for future
            setLocalData(STORAGE_KEYS.settings, {
                description: settings.description || '',
                tlds: settings.tlds || '.com,.io,.ai',
                daily_count: parseInt(settings.daily_count) || 25
            });
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
}

async function saveSettings() {
    const newSettings = {
        description: document.getElementById('description').value,
        tlds: document.getElementById('tlds').value,
        daily_count: parseInt(document.getElementById('daily-count').value) || 25
    };

    // Save to localStorage
    setLocalData(STORAGE_KEYS.settings, newSettings);

    // Also sync to server for scheduler/email functionality
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });
    } catch (error) {
        console.error('Error syncing settings to server:', error);
    }
}

// Subscribe function
async function subscribe() {
    const email = document.getElementById('subscribe-email').value;
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    track('subscribe_clicked', { email });

    try {
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            track('subscribe_success', { email });
            document.getElementById('subscribe-email').value = '';
            alert('Subscribed! Check your inbox for a confirmation.');
        } else {
            throw new Error(data.detail || 'Failed to subscribe');
        }
    } catch (error) {
        track('subscribe_error', { email, error: error.message });
        alert('Error: ' + error.message);
    }
}
