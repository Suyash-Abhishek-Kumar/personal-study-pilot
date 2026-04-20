from keybert import KeyBERT
import nltk
from nltk.tokenize import sent_tokenize

for resource in ["punkt", "punkt_tab"]:
    try:
        nltk.download(resource, quiet=True)
    except Exception:
        pass

kw_model = KeyBERT()

def extract_keywords(text):
    keywords = kw_model.extract_keywords(
        text,
        keyphrase_ngram_range=(1,2),
        stop_words="english",
        top_n=8
    )

    return [k[0] for k in keywords]


def generate_flashcards(text):

    sentences = sent_tokenize(text)

    flashcards = []

    for s in sentences[:5]:
        flashcards.append({
            "question": f"What does this mean: {s[:50]}?",
            "answer": s
        })

    return flashcards