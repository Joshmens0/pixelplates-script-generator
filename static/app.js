document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const loadingState = document.getElementById('loadingState');
    const resultSection = document.getElementById('resultSection');
    const jsonOutput = document.getElementById('jsonOutput');
    const copyBtn = document.getElementById('copyBtn');

    generateBtn.addEventListener('click', handleGenerate);
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGenerate();
    });

    copyBtn.addEventListener('click', () => {
        const text = jsonOutput.innerText;
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 2000);
        });
    });

    async function handleGenerate() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // UI Updates
        generateBtn.disabled = true;
        loadingState.classList.remove('hidden');
        resultSection.classList.add('hidden');
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            // Format JSON
            jsonOutput.textContent = JSON.stringify(data, null, 4);
            resultSection.classList.remove('hidden');
            
            // Scroll to result
            resultSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate script. Please try again.');
        } finally {
            generateBtn.disabled = false;
            loadingState.classList.add('hidden');
        }
    }
});
