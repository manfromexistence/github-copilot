from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from deep_translator import GoogleTranslator
import uvicorn

app = FastAPI(
    title="Translation API",
    description="A simple API to translate text using Google Translator.",
    version="1.0.0"
)

class TranslationRequest(BaseModel):
    text: str
    target_language: str

class TranslationResponse(BaseModel):
    translated_text: str

@app.get("/", summary="API Documentation and Welcome Message", tags=["General"])
async def read_root():
    """
    Welcome to the Translation API!
    This API allows you to translate text into different languages.
    - Use the POST `/` endpoint to translate text.
    - Check the `/docs` or `/redoc` paths for interactive API documentation.
    """
    return {
        "message": "Welcome to the Translation API!",
        "documentation_url": "/docs",
        "alternative_documentation_url": "/redoc",
        "translate_endpoint_info": {
            "path": "/",
            "method": "POST",
            "request_body": {
                "text": "string (the text to translate)",
                "target_language": "string (e.g., 'de', 'fr', 'es')"
            },
            "response_body": {
                "translated_text": "string"
            }
        }
    }

@app.post("/", response_model=TranslationResponse, summary="Translate Text", tags=["Translation"])
async def translate_text(request: TranslationRequest):
    """
    Translate a given text to a target language.
    """
    if not request.text:
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")
    if not request.target_language:
        raise HTTPException(status_code=400, detail="Target language cannot be empty.")

    try:
        translated = GoogleTranslator(source='auto', target=request.target_language).translate(request.text)
        if translated is None: # Some translators might return None on failure
            raise HTTPException(status_code=500, detail="Translation failed. The translator returned an empty result.")
        return TranslationResponse(translated_text=translated)
    except Exception as e:
        # Log the exception e for debugging if necessary
        # print(f"Translation error: {e}")
        if "invalid destination language" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"Invalid target language: '{request.target_language}'. Please provide a valid language code (e.g., 'en', 'es', 'fr', 'de').")
        raise HTTPException(status_code=500, detail=f"An error occurred during translation: {str(e)}")

# To run this application locally (optional, Vercel will handle it in production):
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# The following line is kept for Vercel, as it might expect 'app' to be defined at the top level.
# If Vercel uses a different entry point or command, this might need adjustment in vercel.json or procfile.
# For Vercel, the `app` instance is what it will look for.
