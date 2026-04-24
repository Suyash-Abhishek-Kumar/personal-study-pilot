// Global Application State
let selectedFile = null;
let appData = null;
let currentPage = "upload-page";

// API Endpoint
const API_URL = "http://127.0.0.1:8000/upload_pdf/";
console.log("APP STARTED");

// DOM Load Setup
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initFileUpload();
    initSearch(); // Initialize live search
    renderPage(); // Initial render
});

// --- NAVIGATION LOGIC ---
function initNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const targetId = item.getAttribute('data-target');

            // Allow navigation to data pages ONLY if appData exists
            if (targetId !== 'upload-page' && !appData) {
                alert("Upload and generate content first");
                return;
            }

            setCurrentPage(targetId);
        });
    });
}

function setCurrentPage(pageId) {
    currentPage = pageId;
    renderPage();
}

// --- RENDER LOGIC ---
function renderPage() {
    // 1. Update Navigation UI
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        if (item.getAttribute('data-target') === currentPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }

        // Un-disable menu items if appData is present
        if (appData && item.getAttribute('data-target') !== 'upload-page') {
            item.classList.remove('disabled');
        }
    });

    // 2. Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    // 3. Show current page
    const targetPage = document.getElementById(currentPage);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 4. Force back to upload if data pages accessed without data
    if (currentPage !== 'upload-page' && !appData) {
        alert("Upload and generate content first");
        setCurrentPage('upload-page');
    }
}

function showErrorMsg(msg) {
    const errorMessage = document.getElementById('error-message');
    const erroText = document.getElementById('error-text');
    errorMessage.classList.remove('hidden');
    erroText.textContent = msg;
}

function hideErrorMsg() {
    document.getElementById('error-message').classList.add('hidden');
}

// --- FILE UPLOAD LOGIC ---
function initFileUpload() {
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('file-input');
    const selectFileText = document.getElementById('selected-file-name');
    const generateBtn = document.getElementById('generate-btn');

    // Box Click opens file OS dialog
    uploadBox.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Drag & Drop Events
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');

        if (e.dataTransfer.files.length) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    function handleFileSelection(file) {
        hideErrorMsg();

        // Validation Checks
        if (file.type !== "application/pdf") {
            showErrorMsg("Please upload a valid PDF file. Other formats are not supported.");
            selectedFile = null;
            generateBtn.setAttribute('disabled', 'true');
            selectFileText.textContent = "";
            return;
        }

        if (file.size === 0) {
            showErrorMsg("The uploaded file is empty or corrupted. Please try a different file.");
            selectedFile = null;
            generateBtn.setAttribute('disabled', 'true');
            selectFileText.textContent = "";
            return;
        }

        // ONLY update the selected file state, do not touch appData
        selectedFile = file;
        selectFileText.textContent = `Selected: ${file.name}`;
        generateBtn.removeAttribute('disabled');
    }

    // Button click triggers API (Debounced immediately via disable state)
    generateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (generateBtn.hasAttribute('disabled')) return; // Extra check to prevent duplicate clicks
        processFile();
    });
}


// --- API AND PROCESSING LOGIC ---
async function processFile() {
    if (!selectedFile) return;

    const generateBtn = document.getElementById('generate-btn');
    const loadingState = document.getElementById('loading-state');
    const errorMessage = document.getElementById('error-message');

    // UI Updates
    generateBtn.setAttribute('disabled', 'true'); // Debounce block
    generateBtn.classList.add('hidden');
    hideErrorMsg();
    loadingState.classList.remove('hidden');

    const formData = new FormData();
    formData.append("file", selectedFile);

    // Timeout handling using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 seconds timeout

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();

        // Handle invalid/empty JSON object cases gracefully
        if (!responseData || typeof responseData !== 'object') {
            throw new Error("Received an invalid response from the server.");
        }

        if (responseData.error) {
            throw new Error(responseData.error);
        }

        // Store API efficiently, clearing previous state fully before injection
        appData = null;
        appData = responseData;

        // Reset Search Input on new upload
        document.getElementById("search-input").value = "";
        document.getElementById("search-no-results").classList.add("hidden");

        // Populate DOM elements
        populateContentsPage();
        populateSummaryPage();
        populateFlashcardsPage();

        // Successful Redirect
        setCurrentPage('contents-page');

    } catch (error) {
        console.error("Upload error:", error);

        if (error.name === 'AbortError') {
            showErrorMsg("Request timed out. The backend took too long to process the document.");
        } else if (error.message.includes("Failed to fetch")) {
            showErrorMsg("Network error: Cannot connect to server. Please ensure the backend is running.");
        } else {
            showErrorMsg(`Upload failed: ${error.message}`);
        }

    } finally {
        clearTimeout(timeoutId);
        loadingState.classList.add('hidden');
        generateBtn.classList.remove('hidden');

        // If file exists, retain ability to try generating again
        if (selectedFile) {
            generateBtn.removeAttribute('disabled');
        }
    }
}


// --- DOM POPULATION LOGIC ---

function populateContentsPage() {
    if (!appData) return;

    const textPreviewContainer = document.getElementById('text-preview-container');
    const keywordsContainer = document.getElementById('keywords-container');

    // Handle Image-PDFs or Unextractable text graceful fallback
    const rawText = appData.text_preview || "";
    if (rawText.trim() === "") {
        textPreviewContainer.innerHTML = `<p class="empty-state-message">No readable text found. We detected an image-based PDF or empty document. Text extraction is not supported for this format.</p>`;
    } else {
        textPreviewContainer.textContent = rawText;
    }

    // Set keywords (deduplicated)
    keywordsContainer.innerHTML = "";
    const rawKeywords = appData.keywords || [];
    const uniqueKeywords = Array.from(new Set(rawKeywords)); // Enforce deduplication

    if (uniqueKeywords.length === 0) {
        keywordsContainer.innerHTML = "<p class='empty-state-message'>No keywords identified from this document.</p>";
        return;
    }

    uniqueKeywords.forEach(kw => {
        const span = document.createElement("span");
        span.className = "keyword-pill";
        span.textContent = kw;
        keywordsContainer.appendChild(span);
    });
}

// Search Logic implementation (Fuzzy & Case Insensitive)
function initSearch() {
    const searchInput = document.getElementById("search-input");
    const searchNoResults = document.getElementById("search-no-results");
    const previewContainer = document.getElementById('text-preview-container');

    searchInput.addEventListener("input", (e) => {
        if (!appData) return;

        const rawText = appData.text_preview || "";
        const query = e.target.value.toLowerCase().trim();

        // Graceful skip if empty state
        if (rawText.trim() === "" || previewContainer.querySelector('.empty-state-message')) {
            return;
        }

        if (query === "") {
            // Reset to pure text
            previewContainer.innerHTML = "";
            previewContainer.textContent = rawText;
            searchNoResults.classList.add("hidden");
            return;
        }

        // Execute Case-Insensitive, Partial Match
        const regex = new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        const hasMatch = regex.test(rawText);

        if (hasMatch) {
            // Escapes safe HTML to prevent XSS string injection issues during `.replace`
            const safeText = document.createElement('div');
            safeText.textContent = rawText;
            const htmlString = safeText.innerHTML.replace(regex, `<span class="highlighted-text">$1</span>`);

            previewContainer.innerHTML = htmlString;
            searchNoResults.classList.add("hidden");
        } else {
            previewContainer.innerHTML = "";
            previewContainer.textContent = rawText;
            searchNoResults.classList.remove("hidden");
        }
    });
}

function populateSummaryPage() {
    if (!appData) return;

    const summaryContainer = document.getElementById('summary-container');
    summaryContainer.innerHTML = "";

    const rawText = appData.text_preview || "";
    if (rawText.trim() === "") {
        summaryContainer.innerHTML = "<p class='empty-state-message'>No summary could be extracted from this document context.</p>";
        return;
    }

    // Split the text into paragraphs based on sentence structure cleanly
    // Handling specific line break anomalies reliably
    const cleanText = rawText.replace(/\n+/g, ' ');
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const paragraphs = [];

    let currentParagraph = "";
    sentences.forEach(sentence => {
        currentParagraph += sentence.trim() + " ";
        // Group roughly 3 sentences per paragraph
        if (currentParagraph.length > 250) {
            paragraphs.push(currentParagraph.trim());
            currentParagraph = "";
        }
    });

    if (currentParagraph.trim().length > 0) {
        paragraphs.push(currentParagraph.trim());
    }

    if (paragraphs.length === 0) {
        summaryContainer.innerHTML = "<p class='empty-state-message'>No comprehensive summary could be extracted.</p>";
        return;
    }

    paragraphs.forEach(pText => {
        if (!pText) return;
        const p = document.createElement("p");
        p.textContent = pText;
        summaryContainer.appendChild(p);
    });
}

function populateFlashcardsPage() {
    if (!appData) return;

    const container = document.getElementById('flashcards-container');
    container.innerHTML = "";

    const allFlashcards = appData.flashcards || [];

    // Enforce flashcard limit logically to prevent loop overflow (Max 5)
    const flashcards = allFlashcards.slice(0, 5);

    if (flashcards.length === 0) {
        container.innerHTML = "<p class='empty-state-message'>No valid flashcards generated from this text.</p>";
        return;
    }

    flashcards.forEach(card => {
        // Create elements
        const cardElement = document.createElement("div");
        cardElement.className = "flashcard";

        const inner = document.createElement("div");
        inner.className = "flashcard-inner";

        // Front (Question)
        const front = document.createElement("div");
        front.className = "flashcard-front";
        front.innerHTML = `
            <h3>Question</h3>
            <p>${card.question || 'N/A'}</p>
        `;

        // Back (Answer)
        const back = document.createElement("div");
        back.className = "flashcard-back";
        back.innerHTML = `
            <h3>Answer</h3>
            <p>${card.answer || 'N/A'}</p>
        `;

        // Assemble
        inner.appendChild(front);
        inner.appendChild(back);
        cardElement.appendChild(inner);

        // Add flip logic
        cardElement.addEventListener("click", () => {
            cardElement.classList.toggle("flipped");
        });

        container.appendChild(cardElement);
    });
}
