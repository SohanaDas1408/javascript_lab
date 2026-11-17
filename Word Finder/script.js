document.addEventListener('DOMContentLoaded', () => {
    // ── Elements ──────────────────────────────────────────────────────────
    const wordInput          = document.getElementById('word-input');
    const btnFind            = document.getElementById('btn-find');
    const btnClear           = document.getElementById('btn-clear');
    const dictStatus         = document.getElementById('dict-status');
    const statsBar           = document.getElementById('stats-bar');
    const statTotal          = document.getElementById('stat-total');
    const statMeaningful     = document.getElementById('stat-meaningful');
    const statTime           = document.getElementById('stat-time');
    const progressCont       = document.getElementById('progress-container');
    const progressFill       = document.getElementById('progress-fill');
    const progressText       = document.getElementById('progress-text');
    const resultsDiv         = document.getElementById('results');
    const meaningfulSection  = document.getElementById('meaningful-section');
    const allPermsSection    = document.getElementById('all-permutations-section');
    const emptyState         = document.getElementById('empty-state');
    const frequencySection   = document.getElementById('frequency-section');
    const frequencyChart     = document.getElementById('frequency-chart');

    // ── State ─────────────────────────────────────────────────────────────
    let dictionary = null; // Set of lowercase English words

    // ── Load Dictionary ───────────────────────────────────────────────────
    const DICT_URLS = [
        'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt',
        'https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt'
    ];

    async function loadDictionary() {
        for (const url of DICT_URLS) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const text = await response.text();
                const words = text
                    .split(/\r?\n/)
                    .map(w => w.trim().toLowerCase())
                    .filter(w => w.length >= 2);

                dictionary = new Set(words);

                dictStatus.className = 'dict-status ready';
                dictStatus.innerHTML = `Dictionary loaded — <strong>${dictionary.size.toLocaleString()}</strong> words ready`;

                wordInput.disabled = false;
                btnFind.disabled = false;
                wordInput.focus();
                return;
            } catch (err) {
                console.warn(`Failed to load dictionary from ${url}:`, err);
            }
        }

        dictStatus.className = 'dict-status error';
        dictStatus.innerHTML = 'Failed to load dictionary. Please check your internet connection and refresh.';
    }

    loadDictionary();

    // ── Input Validation ──────────────────────────────────────────────────
    wordInput.addEventListener('input', () => {
        wordInput.value = wordInput.value.replace(/[^a-zA-Z]/g, '');
    });

    wordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !btnFind.disabled) {
            btnFind.click();
        }
    });

    // ── Find Button ───────────────────────────────────────────────────────
    btnFind.addEventListener('click', () => {
        const word = wordInput.value.trim().toLowerCase();

        if (!word) {
            alert('Please enter a word.');
            wordInput.focus();
            return;
        }

        if (word.length < 2) {
            alert('Please enter at least 2 letters.');
            wordInput.focus();
            return;
        }

        if (!dictionary) {
            alert('Dictionary is still loading. Please wait.');
            return;
        }

        runSearch(word);
    });

    // ── Clear Button ──────────────────────────────────────────────────────
    btnClear.addEventListener('click', () => {
        wordInput.value = '';
        statsBar.classList.add('hidden');
        progressCont.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        frequencySection.classList.add('hidden');
        frequencyChart.innerHTML = '';
        meaningfulSection.innerHTML = '';
        allPermsSection.innerHTML = '';
        emptyState.classList.remove('hidden');
        btnClear.disabled = true;
        wordInput.focus();
    });

    // ── Core Search Logic ─────────────────────────────────────────────────
    function runSearch(word) {
        const startTime = performance.now();

        // Disable UI during processing
        btnFind.disabled = true;
        btnClear.disabled = true;
        wordInput.disabled = true;
        emptyState.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        meaningfulSection.innerHTML = '';
        allPermsSection.innerHTML = '';
        statsBar.classList.add('hidden');

        // Show progress
        progressCont.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = 'Generating all letter permutations…';

        setTimeout(() => {
            // Step 0: Calculate and display letter frequency
            displayFrequency(word);

            // Step 1: Generate all unique permutations of ALL the letters
            progressFill.style.width = '30%';

            const letters = word.split('');
            const allPermutations = new Set();
            permute(letters, 0, allPermutations);

            const totalPerms = allPermutations.size;

            // Step 2: Filter meaningful words from the permutations
            progressFill.style.width = '70%';
            progressText.textContent = `Checking ${totalPerms.toLocaleString()} permutations against dictionary…`;

            setTimeout(() => {
                const meaningfulWords = [];
                const nonMeaningful = [];

                for (const perm of allPermutations) {
                    if (dictionary.has(perm)) {
                        meaningfulWords.push(perm);
                    } else {
                        nonMeaningful.push(perm);
                    }
                }

                meaningfulWords.sort((a, b) => a.localeCompare(b));
                nonMeaningful.sort((a, b) => a.localeCompare(b));

                const endTime = performance.now();
                const elapsed = Math.round(endTime - startTime);

                // Update stats
                statTotal.textContent = totalPerms.toLocaleString();
                statMeaningful.textContent = meaningfulWords.length.toLocaleString();
                statTime.textContent = `${elapsed}ms`;

                progressFill.style.width = '100%';
                progressText.textContent = 'Done!';

                setTimeout(() => {
                    progressCont.classList.add('hidden');
                    statsBar.classList.remove('hidden');
                    displayResults(meaningfulWords, nonMeaningful, word);

                    btnFind.disabled = false;
                    btnClear.disabled = false;
                    wordInput.disabled = false;
                }, 300);
            }, 50);
        }, 50);
    }

    // ── Permutation Generator ─────────────────────────────────────────────
    // Generates all UNIQUE permutations of the full array of letters.
    // Uses recursive swap with duplicate skipping at each level.
    function permute(arr, start, resultSet) {
        if (start === arr.length) {
            resultSet.add(arr.join(''));
            return;
        }

        const used = new Set(); // skip duplicate letters at this position

        for (let i = start; i < arr.length; i++) {
            if (used.has(arr[i])) continue;
            used.add(arr[i]);

            [arr[start], arr[i]] = [arr[i], arr[start]]; // swap
            permute(arr, start + 1, resultSet);
            [arr[start], arr[i]] = [arr[i], arr[start]]; // swap back
        }
    }

    // ── Display Results ───────────────────────────────────────────────────
    function displayResults(meaningfulWords, nonMeaningful, originalWord) {

        // ── Section 1: Meaningful Words ──
        if (meaningfulWords.length > 0) {
            const group = createGroup(
                `Meaningful Words Found`,
                meaningfulWords.length,
                'meaningful'
            );
            const wordsContainer = group.querySelector('.result-group-words');

            for (const w of meaningfulWords) {
                const chip = document.createElement('span');
                chip.className = 'word-chip meaningful';
                chip.textContent = w;

                if (w === originalWord) {
                    chip.classList.add('original');
                    chip.title = 'Original word';
                }

                wordsContainer.appendChild(chip);
            }

            meaningfulSection.appendChild(group);
        } else {
            meaningfulSection.innerHTML = `
                <div class="result-group">
                    <div class="no-results">
                        <div class="icon"></div>
                        <p>No meaningful English words found from the letters of "<strong>${escapeHtml(originalWord)}</strong>".</p>
                    </div>
                </div>
            `;
        }

        // ── Section 2: All Permutations ──
        const allPerms = [...meaningfulWords, ...nonMeaningful].sort((a, b) => a.localeCompare(b));
        const group = createGroup(
            `All Permutations`,
            allPerms.length,
            'all'
        );
        const wordsContainer = group.querySelector('.result-group-words');

        // For large lists, show first 500 with a "show more" button
        const INITIAL_LIMIT = 500;
        const permsToShow = allPerms.slice(0, INITIAL_LIMIT);

        for (const w of permsToShow) {
            const chip = document.createElement('span');
            chip.className = 'word-chip';

            if (meaningfulWords.includes(w)) {
                chip.classList.add('meaningful');
            }

            chip.textContent = w;
            wordsContainer.appendChild(chip);
        }

        if (allPerms.length > INITIAL_LIMIT) {
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'btn show-more';
            showMoreBtn.textContent = `Show remaining ${(allPerms.length - INITIAL_LIMIT).toLocaleString()} permutations`;
            showMoreBtn.addEventListener('click', () => {
                for (let i = INITIAL_LIMIT; i < allPerms.length; i++) {
                    const chip = document.createElement('span');
                    chip.className = 'word-chip';
                    if (meaningfulWords.includes(allPerms[i])) {
                        chip.classList.add('meaningful');
                    }
                    chip.textContent = allPerms[i];
                    wordsContainer.appendChild(chip);
                }
                showMoreBtn.remove();
            });
            wordsContainer.appendChild(showMoreBtn);
        }

        allPermsSection.appendChild(group);

        resultsDiv.classList.remove('hidden');
    }

    // ── Helper: Create a collapsible group ────────────────────────────────
    function createGroup(title, count, type) {
        const groupEl = document.createElement('div');
        groupEl.className = `result-group ${type}`;

        const header = document.createElement('div');
        header.className = 'result-group-header';
        header.innerHTML = `
            <span class="result-group-title">${title}</span>
            <span class="result-group-count">${count.toLocaleString()} word${count !== 1 ? 's' : ''}</span>
        `;

        const wordsContainer = document.createElement('div');
        wordsContainer.className = 'result-group-words';

        groupEl.appendChild(header);
        groupEl.appendChild(wordsContainer);

        // Toggle collapse
        header.addEventListener('click', () => {
            wordsContainer.style.display =
                wordsContainer.style.display === 'none' ? 'flex' : 'none';
        });

        return groupEl;
    }

    // ── Letter Frequency Display ───────────────────────────────────────
    function displayFrequency(word) {
        frequencyChart.innerHTML = '';

        // Count each letter
        const freq = {};
        for (const ch of word) {
            freq[ch] = (freq[ch] || 0) + 1;
        }

        // Sort by count descending, then alphabetically
        const sorted = Object.entries(freq).sort(
            (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
        );

        const maxCount = sorted[0][1];

        // Build bar chart rows
        for (const [letter, count] of sorted) {
            const row = document.createElement('div');
            row.className = 'freq-row';

            const percentage = (count / maxCount) * 100;

            row.innerHTML = `
                <span class="freq-letter">${letter.toUpperCase()}</span>
                <div class="freq-bar-container">
                    <div class="freq-bar" style="width: 0%"></div>
                </div>
                <span class="freq-count">${count} × </span>
            `;

            frequencyChart.appendChild(row);

            // Animate the bar after a brief delay
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    row.querySelector('.freq-bar').style.width = `${percentage}%`;
                });
            });
        }

        frequencySection.classList.remove('hidden');
    }

    // ── Utility ───────────────────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
