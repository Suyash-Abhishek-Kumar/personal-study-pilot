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
    initDownloadFlashcards();
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
                alert("Upload and generate 2 content first");
                console.log(targetId, appData);
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
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === "application/pdf") {
                handleFileSelection(droppedFile);
            } else {
                alert("Please drop a valid PDF file.");
            }
        }
    });

    function handleFileSelection(file) {
        // ONLY update the selected file state, do not touch appData
        selectedFile = file;
        
        selectFileText.textContent = `Selected: ${file.name}`;
        generateBtn.removeAttribute('disabled');
        document.getElementById('error-message').classList.add('hidden');
    }

    // Button click triggers API
    generateBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Just in case it tries to submit randomly
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
    generateBtn.setAttribute('disabled', 'true');
    generateBtn.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loadingState.classList.remove('hidden');

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.error) {
            throw new Error(responseData.error);
        }

        // Store API successfully response cleanly without clearing selected file
        appData = responseData;
        console.log(appData)
        
        // Populate DOM elements
        populateContentsPage();
        populateSummaryPage();
        populateFlashcardsPage();
        populateQuestionsPage();

        // Successful Redirect
        setCurrentPage('contents-page');

    } catch (error) {
        console.error("Upload error:", error);
        errorMessage.classList.remove('hidden');
        document.getElementById('error-text').textContent = error.message.includes("Failed to fetch") 
            ? "Network error: Make sure FastAPI server is running with CORS." 
            : `Upload failed: ${error.message}`;
            
    } finally {
        generateBtn.classList.remove('hidden');
        loadingState.classList.add('hidden');
        
        if (selectedFile) {
             generateBtn.removeAttribute('disabled');
        }
    }
}

function formatTextPreview(rawText) {
    if (!rawText) return "<p>No preview text available.</p>";

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let html = '';
    let bulletBuffer = [];

    const isHeading = (line) => {
        // Short lines with no punctuation ending, or lines with dashes like "Adversarial search Methods-Game"
        return line.length < 60 && !line.endsWith('.') && !line.startsWith('•') && !/^\d/.test(line);
    };

    const isDate = (line) => /^\d{2}\/\d{2}\/\d{2,4}/.test(line);
    const isBullet = (line) => line.startsWith('•') || line.startsWith('-');

    const flushBullets = () => {
        if (bulletBuffer.length > 0) {
            html += '<ul>' + bulletBuffer.map(b => `<li>${b}</li>`).join('') + '</ul>';
            bulletBuffer = [];
        }
    };

    lines.forEach(line => {
        // Skip date/page number lines like "19/12/23 1"
        if (isDate(line)) return;

        if (isBullet(line)) {
            // Strip the bullet character and add to buffer
            bulletBuffer.push(line.replace(/^[•\-]\s*/, ''));
        } else if (isHeading(line)) {
            flushBullets();
            html += `<h3 class="preview-heading">${line}</h3>`;
        } else {
            flushBullets();
            html += `<p>${line}</p>`;
        }
    });

    flushBullets(); // flush any remaining bullets
    return html;
}

function initDownloadFlashcards() {
    const btn = document.getElementById('download-flashcards-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (!appData || !appData.flashcards?.length) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 50;
        const usableWidth = pageWidth - margin * 2;
        let y = margin;

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(99, 102, 241); // indigo
        doc.text('Flashcards', margin, y);
        y += 10;

        // Underline
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(1.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 30;

        appData.flashcards.forEach((card, idx) => {
            const question = card.question || 'N/A';
            const answer = card.answer || 'N/A';

            // Wrap text to calculate height needed
            const qLines = doc.splitTextToSize(`Q: ${question}`, usableWidth - 20);
            const aLines = doc.splitTextToSize(`A: ${answer}`, usableWidth - 20);
            const cardHeight = (qLines.length + aLines.length) * 14 + 50;

            // Page break if needed
            if (y + cardHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }

            // Card background
            doc.setFillColor(249, 250, 251);
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, y, usableWidth, cardHeight, 8, 8, 'FD');

            // Card number badge
            doc.setFillColor(99, 102, 241);
            doc.roundedRect(margin + 10, y + 10, 28, 16, 4, 4, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text(`${idx + 1}`, margin + 24, y + 22, { align: 'center' });

            // Question
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(55, 65, 81);
            doc.text(qLines, margin + 16, y + 36);

            // Divider
            const dividerY = y + 36 + qLines.length * 14 + 4;
            doc.setDrawColor(199, 210, 254);
            doc.line(margin + 10, dividerY, margin + usableWidth - 10, dividerY);

            // Answer
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(75, 85, 99);
            doc.text(aLines, margin + 16, dividerY + 16);

            y += cardHeight + 16;
        });

        doc.save('flashcards.pdf');
    });
}


// --- DOM POPULATION LOGIC ---

function populateQuestionsPage() {
    if (!appData) return;

    const container = document.getElementById('questions-container');
    container.innerHTML = "";

    const questions = appData.questions || [];

    if (questions.length === 0) {
        container.innerHTML = "<p>No questions generated.</p>";
        return;
    }

    // Group questions by type
    const groups = {};
    questions.forEach(q => {
        const type = q.type || "General";
        if (!groups[type]) groups[type] = [];
        groups[type].push(q);
    });

    Object.entries(groups).forEach(([type, qs]) => {
        // Section heading per type
        const heading = document.createElement("h2");
        heading.className = "question-type-heading";
        heading.textContent = type;
        container.appendChild(heading);

        qs.forEach((q, idx) => {
            const card = document.createElement("div");
            card.className = "question-card";
            card.innerHTML = `
                <div class="question-header">
                    <span class="question-number">Q${idx + 1}</span>
                    <p class="question-text">${q.question}</p>
                </div>
                <div class="answer-body">
                    <span class="answer-label">Answer</span>
                    <p class="answer-text">${q.answer}</p>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

function populateContentsPage() {
    if (!appData) return;

    const textPreviewContainer = document.getElementById('text-preview-container');
    const keywordsContainer = document.getElementById('keywords-container');

    // Use innerHTML instead of textContent
    textPreviewContainer.innerHTML = formatTextPreview(appData.text_preview);

    keywordsContainer.innerHTML = "";
    const keywords = appData.keywords || [];

    if (keywords.length === 0) {
        keywordsContainer.innerHTML = "<p>No keywords identified.</p>";
        return;
    }

    keywords.forEach(kw => {
        const span = document.createElement("span");
        span.className = "keyword-pill";
        span.textContent = kw;
        keywordsContainer.appendChild(span);
    });
}

function populateSummaryPage() {
    if (!appData) return;

    const summaryContainer = document.getElementById('summary-container');
    summaryContainer.innerHTML = "";

    const rawText = appData.text_preview || "";
    
    // Split the text into paragraphs based on sentence structure
    const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
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
        summaryContainer.innerHTML = "<p>Could not extract a meaningful summary.</p>";
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

    const flashcards = appData.flashcards || [];

    if (flashcards.length === 0) {
        container.innerHTML = "<p>No flashcards generated.</p>";
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
