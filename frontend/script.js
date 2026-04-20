async function uploadPDF() {
    const fileInput = document.getElementById("pdfFile");
    const file = fileInput.files[0];

    const errorDiv = document.getElementById("error");
    const loading = document.getElementById("loading");

    errorDiv.innerText = "";

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

        loading.classList.add("hidden");

        if (data.error) {
            errorDiv.innerText = data.error;
            return;
        }

        // TEXT
        document.getElementById("text").innerText = data.text_preview;

        // KEYWORDS
        let keywordList = document.getElementById("keywords");
        keywordList.innerHTML = "";

        data.keywords.forEach(k => {
            let li = document.createElement("li");
            li.innerText = k;
            keywordList.appendChild(li);
        });

        // FLASHCARDS
        let flashDiv = document.getElementById("flashcards");
        flashDiv.innerHTML = "";

        data.flashcards.forEach(fc => {
            let div = document.createElement("div");
            div.className = "flashcard";

            let showingAnswer = false;

            div.innerHTML = `<b>Q:</b> ${fc.question}`;

            div.onclick = () => {
                if (showingAnswer) {
                    div.innerHTML = `<b>Q:</b> ${fc.question}`;
                } else {
                    div.innerHTML = `<b>A:</b> ${fc.answer}`;
                }
                showingAnswer = !showingAnswer;
            };

            flashDiv.appendChild(div);
        });

    } catch (err) {
        loading.classList.add("hidden");
        errorDiv.innerText = "Error connecting to backend.";
    }
}