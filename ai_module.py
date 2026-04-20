from keybert import KeyBERT
import nltk
from nltk.tokenize import sent_tokenize
from nltk import pos_tag, word_tokenize

nltk.download('averaged_perceptron_tagger', quiet=True)
nltk.download("punkt")

kw_model = KeyBERT()

def generate_difficult_questions(text):
    sentences = sent_tokenize(text)
    questions = []

    for s in sentences[:10]:  # Process first 10 sentences
        s = s.strip()
        if len(s) < 30:  # Skip very short sentences
            continue

        words = [w for w in s.split() if len(w) > 3 and not w[0].isdigit()]
        topic = ' '.join([w.strip('(),:-') for w in words if w[0].isupper()][:3]) or "this concept"

        # Conceptual
        questions.append({
            "type": "Conceptual",
            "question": f"Why is {topic} important, and how does it work?",
            "answer": s
        })

        # Definition
        questions.append({
            "type": "Definition",
            "question": f"How would you define {topic} in your own words?",
            "answer": s
        })

        # Compare & Contrast
        questions.append({
            "type": "Compare & Contrast",
            "question": f"How does {topic} differ from related concepts in this domain?",
            "answer": s
        })

        # Application
        questions.append({
            "type": "Application",
            "question": f"Give a real-world scenario where {topic} would be applied.",
            "answer": s
        })

    return questions

def extract_keywords(text):
    keywords = kw_model.extract_keywords(
        text,
        keyphrase_ngram_range=(1,2),
        stop_words="english",
        top_n=8
    )

    return [k[0] for k in keywords]

def extract_topic(sentence):
    words = word_tokenize(sentence)
    tagged = pos_tag(words)
    
    # Collect consecutive Nouns/Proper Nouns as the topic phrase
    topic_words = []
    for word, tag in tagged:
        if tag in ('NN', 'NNS', 'NNP', 'NNPS'):
            topic_words.append(word)
            if len(topic_words) == 3:  # Cap at 3 words
                break
    
    if topic_words:
        return ' '.join(topic_words).title()
    
    # Fallback: use first 3 meaningful words (skip short words)
    meaningful = [w for w in words if len(w) > 3]
    return ' '.join(meaningful[:3]).title() if meaningful else "This Concept"

def generate_flashcards(text):
    sentences = sent_tokenize(text)
    flashcards = []

    for s in sentences[:5]:
        topic = extract_topic(s)
        flashcards.append({
            "question": f"Explain the following concept: {topic}",
            "answer": s
        })

    return flashcards