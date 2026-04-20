from fastapi import FastAPI, UploadFile, File
import shutil
import os
import uuid
from pdf_processor import extract_text_from_pdf
from ai_module import extract_keywords, generate_flashcards


app = FastAPI()

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):

    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files allowed"}

    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = extract_text_from_pdf(file_path)

    keywords = extract_keywords(text)

    flashcards = generate_flashcards(text)

    preview_text = text[:1000]

    if not text.strip():
        return {"error": "No readable text found in PDF"}

    return {
        "filename": file.filename,
        "text_preview": preview_text,
        "keywords": keywords,
        "flashcards": flashcards
    }
