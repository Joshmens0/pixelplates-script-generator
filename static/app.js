document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const loadingState = document.getElementById('loadingState');
    const resultSection = document.getElementById('resultSection');
    const jsonOutput = document.getElementById('jsonOutput');
    const copyBtn = document.getElementById('copyBtn');

    // User Identification - Handled by Auth
    const token = checkAuth();
    
    // Fetch available prompts
    fetch('/api/prompts')
        .then(res => res.json())
        .then(data => {
            promptSelect.innerHTML = '';
            data.prompts.forEach((p, index) => {
                const option = document.createElement('option');
                option.value = p;
                option.textContent = p.replace('.txt', '').replace('prompt', '').replace('_', ' ').trim() || 'Default';
                if (p === 'prompt.txt') option.selected = true;
                promptSelect.appendChild(option);
            });
        })
        .catch(err => {
            console.error('Failed to load prompts:', err);
            promptSelect.innerHTML = '<option value="">Default Style</option>';
        });

    // Auto-resize textarea
    promptInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    generateBtn.addEventListener('click', handleGenerate);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            handleGenerate();
        }
    });

    copyBtn.addEventListener('click', async () => {
        const text = jsonOutput.textContent; // Use textContent for raw text
        
        try {
            // Try modern API first
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                showCopySuccess();
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            // Fallback for mobile/non-secure contexts
            const textArea = document.createElement('textarea');
            textArea.value = text;
            
            // Ensure no scroll scrolling happens
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                showCopySuccess();
            } catch (e) {
                console.error('Copy failed', e);
                alert('Failed to copy code to clipboard');
            }
            
            document.body.removeChild(textArea);
        }
    });

    function showCopySuccess() {
        const originalIcon = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            copyBtn.innerHTML = originalIcon;
        }, 2000);
    }



    // File Upload Logic
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const fileName = document.getElementById('fileName');
    let selectedFile = null;

    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    
    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        if (!file) return;
        const validTypes = ['.pdf', '.txt', '.md'];
        const isPdf = file.type === 'application/pdf';
        const isText = file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt');
        
        if (!isPdf && !isText) {
            alert('Please upload a PDF or text file (.txt, .md)');
            return;
        }

        selectedFile = file;
        fileName.textContent = `Selected: ${file.name}`;
        dropZone.classList.add('has-file');
        
        // Change icon to check
        dropZone.querySelector('i').className = 'fas fa-check-circle';
    }

    // View Toggle Logic
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const visualOutput = document.getElementById('visualOutput');
    const codeOutput = document.getElementById('codeOutput');
    
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update buttons
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update view
            const view = btn.dataset.view;
            if (view === 'visual') {
                visualOutput.classList.remove('hidden');
                codeOutput.classList.add('hidden');
            } else {
                visualOutput.classList.add('hidden');
                codeOutput.classList.remove('hidden');
            }
        });
    });

    async function handleGenerate() {
        const prompt = promptInput.value.trim();
        const promptFile = promptSelect.value;
        
        if (!prompt && !selectedFile) {
             alert('Please enter a prompt or upload a file.');
             return;
        }

        // UI Updates
        generateBtn.disabled = true;
        loadingState.classList.remove('hidden');
        resultSection.classList.add('hidden');

        // Reset views
        visualOutput.innerHTML = '';
        jsonOutput.textContent = '';

        try {
            const formData = new FormData();
            formData.append('prompt', prompt);
            if (promptFile) formData.append('prompt_file', promptFile);
            if (selectedFile) formData.append('file', selectedFile);
            
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData, // No Content-Type header needed, fetch adds it with boundary
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Network response was not ok');
            }

            const data = await response.json();

            // Render Visual Script
            renderVisualScript(data);

            // Render Code
            jsonOutput.textContent = JSON.stringify(data, null, 4);
            
            resultSection.classList.remove('hidden');

            // Scroll to result
            resultSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Error:', error);
            alert(`Failed to generate script: ${error.message}`);
        } finally {
            generateBtn.disabled = false;
            loadingState.classList.add('hidden');
        }
    }

    function renderVisualScript(data) {
        visualOutput.innerHTML = '';
        console.log("Rendering data:", data); // Debugging
        
        // Handle different JSON structures
        // If data has a 'segments' or 'script' key that is an object/array, use that.
        let segments = data.segments || data.script || data; 
        
        // If segments is an array (some models might return array), convert to object or iterate
        const entries = Array.isArray(segments) ? segments.map((s, i) => [`segment_${i+1}`, s]) : Object.entries(segments);
        
        // sort entries if they are numbered keys to ensure order 1, 2, 3..
        entries.sort((a, b) => {
             const numA = parseInt(a[0].replace(/\D/g, '')) || 0;
             const numB = parseInt(b[0].replace(/\D/g, '')) || 0;
             return numA - numB;
        });

        let validSegmentCount = 0;

        entries.forEach(([key, segment], index) => {
            // Heuristic to detect if this is a scene/segment object
            // 1. Key contains 'segment', 'scene', 'part' (case insensitive)
            // 2. OR Value is an object and has typical keys like 'visual', 'voiceover', 'scene_description'
            
            const lowerKey = key.toLowerCase();
            const isNamedSegment = lowerKey.includes('segment') || lowerKey.includes('scene') || lowerKey.includes('part');
            
            const hasContent = typeof segment === 'object' && segment !== null && 
                             (segment.scene_description || segment.visual || segment.voiceover || segment.audio);
            
            if (!isNamedSegment && !hasContent) return;

            validSegmentCount++;
            
            const card = document.createElement('div');
            card.className = 'script-card';
            card.style.animationDelay = `${validSegmentCount * 0.1}s`;
            
            const time = segment.time || segment.duration || segment.timestamp || `Scene ${validSegmentCount}`;
            
            card.innerHTML = `
                <div class="card-header">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="segment-title">Scene ${validSegmentCount}</span>
                        <span class="time-badge"><i class="far fa-clock"></i> ${time}</span>
                    </div>
                    <button class="mini-copy-btn segment-copy-btn" title="Copy Entire Scene" data-segment-index="${index}">
                        <i class="far fa-copy"></i>
                    </button>
                </div>
                <div class="card-body">
                    <div class="script-element">
                        <div class="element-icon" title="Visual Description">
                            <i class="fas fa-video"></i>
                        </div>
                        <div class="element-content">
                            <div class="element-header">
                                <h4>Visual</h4>
                                <button class="mini-copy-btn" title="Copy Visual"><i class="far fa-copy"></i></button>
                            </div>
                            <p class="visual-text">${segment.scene_description || segment.description || segment.visual || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div class="script-element">
                        <div class="element-icon" title="Voiceover">
                            <i class="fas fa-microphone-alt"></i>
                        </div>
                        <div class="element-content">
                            <div class="element-header">
                                <h4>Audio / Voiceover</h4>
                                <button class="mini-copy-btn" title="Copy Audio"><i class="far fa-copy"></i></button>
                            </div>
                            <p class="audio-text">"${segment.voiceover || segment.narration || segment.audio || 'N/A'}"</p>
                        </div>
                    </div>
                    
                    <div class="script-element">
                        <div class="element-icon" title="On-Screen Text">
                            <i class="fas fa-quote-left"></i>
                        </div>
                        <div class="element-content">
                             <div class="element-header">
                                <h4>Overlay Text</h4>
                                <button class="mini-copy-btn" title="Copy Text"><i class="far fa-copy"></i></button>
                            </div>
                            <p class="overlay-text">${segment.on_screen_text || segment.text || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Store segment data for easy copying
            card.dataset.segmentData = JSON.stringify(segment);
            visualOutput.appendChild(card);
        });

        // Fallback if no segments found
        if (validSegmentCount === 0) {
            visualOutput.innerHTML = `
                <div class="script-card" style="padding: 2rem; text-align: center; color: var(--text-muted); border: 1px dashed rgba(255,255,255,0.1);">
                    <i class="fas fa-bug" style="font-size: 2rem; margin-bottom: 1rem; color: var(--secondary);"></i>
                    <p>Could not auto-detect script scenes.</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.7;">The AI generated a format we didn't recognize for Visual Mode.</p>
                    <button class="toggle-btn active" style="margin: 1rem auto; display: inline-flex;" onclick="document.querySelector('[data-view=\\'code\\']').click()">
                        Switch to Code View
                    </button>
                </div>
            `;
        }
    }

    // Event delegation for mini copy buttons
    visualOutput.addEventListener('click', async (e) => {
        const btn = e.target.closest('.mini-copy-btn');
        if (!btn) return;

        let text = '';

        // Handle Segment Copy
        if (btn.classList.contains('segment-copy-btn')) {
            const card = btn.closest('.script-card');
            const data = JSON.parse(card.dataset.segmentData || '{}');
            const title = card.querySelector('.segment-title').innerText;
            const time = card.querySelector('.time-badge').innerText;

            text = `${title} (${time})\n\n` +
                   `[VISUAL]\n${data.scene_description || data.description || data.visual || 'N/A'}\n\n` +
                   `[AUDIO]\n"${data.voiceover || data.narration || data.audio || 'N/A'}"\n\n` +
                   `[TEXT]\n${data.on_screen_text || data.text || 'N/A'}`;
        } 
        // Handle Individual Element Copy
        else {
            // Find the text in the p tag within the same .element-content
            const contentDiv = btn.closest('.element-content');
            const textElem = contentDiv.querySelector('p');
            text = textElem.textContent;

            // Clean up quotes if it's audio
            if (textElem.classList.contains('audio-text')) {
                 text = text.replace(/^"|"$/g, '');
            }
        }

        try {
            // Mobile-first copy approach
            if (navigator.clipboard && window.isSecureContext) {
                 await navigator.clipboard.writeText(text);
            } else {
                 // Fallback
                 const textArea = document.createElement('textarea');
                 textArea.value = text;
                 textArea.style.position = 'fixed';
                 textArea.style.left = '-9999px';
                 document.body.appendChild(textArea);
                 textArea.focus();
                 textArea.select();
                 document.execCommand('copy');
                 document.body.removeChild(textArea);
            }

            // Visual feedback
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            // Only apply color change if it's not the main header button (to keep header style clean) or style both
            btn.style.color = '#4ade80';
            btn.style.borderColor = '#4ade80';
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.color = '';
                btn.style.borderColor = '';
            }, 1500);

        } catch (err) {
            console.error('Failed to copy matches:', err);
            alert('Could not copy text.');
        }
    });

    // About Modal Logic
    const aboutBtn = document.getElementById('aboutBtn');
    const aboutModal = document.getElementById('aboutModal');
    const closeModal = document.querySelector('.close-modal');

    function toggleModal(show) {
        if (show) {
            aboutModal.classList.remove('hidden');
            // Small delay to allow display:flex to apply before opacity transition
            requestAnimationFrame(() => {
                aboutModal.classList.add('visible');
            });
        } else {
            aboutModal.classList.remove('visible');
            setTimeout(() => {
                aboutModal.classList.add('hidden');
            }, 300); // Match transition duration
        }
    }

    if (aboutBtn) {
        aboutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleModal(true);
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            toggleModal(false);
        });
    }

    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                toggleModal(false);
            }
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aboutModal && !aboutModal.classList.contains('hidden')) {
            toggleModal(false);
        }
    });
    // History Sidebar Logic
    const historySidebar = document.getElementById('historySidebar');
    const historyToggle = document.getElementById('historyToggle');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const historyList = document.getElementById('historyList');

    function toggleSidebar(show) {
        if (show) {
            historySidebar.classList.add('open');
            fetchHistory(); // Refresh on open
        } else {
            historySidebar.classList.remove('open');
        }
    }

    if (historyToggle) {
        historyToggle.addEventListener('click', () => toggleSidebar(true));
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (historySidebar.classList.contains('open') && 
            !historySidebar.contains(e.target) && 
            !historyToggle.contains(e.target)) {
            toggleSidebar(false);
        }
    });

    async function fetchHistory() {
        historyList.innerHTML = '<div style="text-align:center; opacity:0.6; padding:1rem;">Loading...</div>';
        try {
            console.log("Fetching history...");
            const res = await fetch(`/api/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Server Error (${res.status}): ${txt}`);
            }
            const scripts = await res.json();
            console.log("History loaded:", scripts.length);
            renderHistoryList(scripts);
        } catch (err) {
            console.error("History Fetch Error:", err);
            historyList.innerHTML = `
                <div style="text-align:center; padding:1rem;">
                    <p style="opacity:0.6; margin-bottom:0.5rem; color:#f87171;">Failed to load history</p>
                    <button onclick="fetchHistory()" style="background:rgba(255,255,255,0.1); border:none; padding:4px 8px; border-radius:4px; color:white; cursor:pointer; font-size:0.8rem;">Retry</button>
                    <p style="font-size:0.7rem; margin-top:0.5rem; opacity:0.4;">${err.message}</p>
                </div>`;
        }
    }

    function renderHistoryList(scripts) {
        if (scripts.length === 0) {
            historyList.innerHTML = '<div style="text-align:center; opacity:0.6; padding:1rem;">No history yet. Generate something!</div>';
            return;
        }

        historyList.innerHTML = '';
        scripts.forEach(script => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            // Format Date
            const date = new Date(script.created_at);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString();

            const isFile = script.input_type === 'file';
            const icon = isFile ? '<i class="fas fa-file-alt"></i>' : '<i class="fas fa-keyboard"></i>';
            const badge = isFile ? '<span class="history-type-badge" style="background:rgba(236,72,153,0.2); color:#f472b6;">RAG</span>' : '<span class="history-type-badge">Text</span>';

            item.innerHTML = `
                <h4>${script.title || 'Untitled Script'}</h4>
                <div class="history-meta">
                    <span>${icon} ${dateStr} ${timeStr}</span>
                    ${badge}
                </div>
            `;
            
            item.addEventListener('click', () => {
                loadHistoryScript(script);
                toggleSidebar(false);
            });

            historyList.appendChild(item);
        });
    }

    function loadHistoryScript(script) {
        // Load content
        const data = script.content;
        
        // Update outputs
        renderVisualScript(data);
        jsonOutput.textContent = JSON.stringify(data, null, 4);
        
        // Switch to visual view by default
        document.querySelector('[data-view="visual"]').click();
        
        // Show result section
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth' });
        
        // Update input (optional)
        if (script.prompt) {
             promptInput.value = script.prompt;
             // Trigger auto-resize
             promptInput.style.height = 'auto';
             promptInput.style.height = promptInput.scrollHeight + 'px';
        }
    }

    // Load history on init
    fetchHistory();
});
