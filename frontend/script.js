const fileInput = document.getElementById("pdfFile");
const uploadBtn = document.getElementById("uploadBtn");
const uploadBox = document.getElementById("uploadBox");

console.log("Script loaded", {fileInput, uploadBtn, uploadBox});

uploadBtn.addEventListener("click", function(e) {
    e.preventDefault();
    uploadPDF();
});

fileInput.addEventListener("change", function() {
    console.log("File selected:", this.files[0]);
    uploadBtn.disabled = !this.files[0];
    if (this.files[0]) {
        uploadBox.style.borderColor = "#764ba2";
        uploadBox.querySelector(".upload-text").textContent = this.files[0].name;
    }
});

uploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = "#764ba2";
    uploadBox.style.background = "#f0f2ff";
});

uploadBox.addEventListener("dragleave", () => {
    uploadBox.style.borderColor = "#667eea";
    uploadBox.style.background = "#f8f9ff";
});

uploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = "#667eea";
    uploadBox.style.background = "#f8f9ff";
    
    const files = e.dataTransfer.files;
    if (files.length && files[0].type === "application/pdf") {
        fileInput.files = files;
        uploadBtn.disabled = false;
        uploadBox.querySelector(".upload-text").textContent = files[0].name;
    }
});

async function uploadPDF() {
    console.log("uploadPDF called");
    const fileInput = document.getElementById("pdfFile");
    const file = fileInput.files[0];
    console.log("File:", file);

    const errorDiv = document.getElementById("error");
    const loading = document.getElementById("loading");
    const results = document.getElementById("results");

    errorDiv.innerText = "";
    results.classList.add("hidden");

    if (!file) {
        errorDiv.innerText = "Please select a PDF file.";
        return;
    }

    let formData = new FormData();
    formData.append("file", file);

    loading.classList.remove("hidden");

    try {
        let response = await fetch("http://127.0.0.1:8000/upload_pdf/", {
            method: "POST",
            body: formData
        });

        let data = await response.json();
        console.log("Response data:", data);

        loading.classList.add("hidden");
        results.classList.remove("hidden");

        if (data.error) {
            errorDiv.innerText = data.error;
            return;
        }

        // TEXT
        document.getElementById("text").innerText = data.text_preview;

        // KEYWORDS
        let keywordDiv = document.getElementById("keywords");
        keywordDiv.innerHTML = "";

        data.keywords.forEach(k => {
            let tag = document.createElement("div");
            tag.className = "keyword-tag";
            tag.innerText = k;
            keywordDiv.appendChild(tag);
        });

        // FLASHCARDS
        let flashDiv = document.getElementById("flashcards");
        flashDiv.innerHTML = "";

        data.flashcards.forEach(fc => {
            let card = document.createElement("div");
            card.className = "flashcard";

            let content = document.createElement("div");
            content.className = "flashcard-content";
            content.innerHTML = `<b>Q:</b> ${fc.question}`;

            let showingAnswer = false;

            card.onclick = () => {
                if (showingAnswer) {
                    content.innerHTML = `<b>Q:</b> ${fc.question}`;
                } else {
                    content.innerHTML = `<b>A:</b> ${fc.answer}`;
                }
                showingAnswer = !showingAnswer;
            };

            card.appendChild(content);
            flashDiv.appendChild(card);
        });

    } catch (err) {
        console.error("Error:", err);
        loading.classList.add("hidden");
        errorDiv.innerText = "Error connecting to backend.";
    }
}