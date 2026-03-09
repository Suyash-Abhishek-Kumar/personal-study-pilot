from fastapi import FastAPI, UploadFile, File
import shutil
import os

from pdf_processor import extract_text_from_pdf
from ai_module import extract_keywords, generate_flashcards


app = FastAPI()

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):

    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files allowed"}

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = extract_text_from_pdf(file_path)

    keywords = extract_keywords(text)

    flashcards = generate_flashcards(text)

    preview_text = text[:1000]

    return {
        "filename": file.filename,
        "text_preview": preview_text,
        "keywords": keywords,
        "flashcards": flashcards
    }