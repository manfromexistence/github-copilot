from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from deep_translator import GoogleTranslator
from gtts import gTTS, lang as gtts_langs
from langdetect import detect
from io import BytesIO
import uvicorn

app = FastAPI(
    title="Translation and TTS API",
    description="A simple API to translate text and convert text to speech.",
    version="1.1.0"
)

class TranslationRequest(BaseModel):
    text: str
    target_language: str

class TranslationResponse(BaseModel):
    translated_text: str

class TTSRequest(BaseModel):
    text: str

@app.get("/", summary="API Documentation", tags=["General"])
async def read_root():
    """
    Serves the API documentation HTML page.
    """
    return FileResponse("index.html")

@app.post("/translate", response_model=TranslationResponse, summary="Translate Text", tags=["Translation"])
async def translate_text_endpoint(request: TranslationRequest): # Renamed to avoid conflict
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
        if "invalid destination language" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"Invalid target language: '{request.target_language}'. Please provide a valid language code (e.g., 'en', 'es', 'fr', 'de').")
        raise HTTPException(status_code=500, detail=f"An error occurred during translation: {str(e)}")

@app.post("/tts", summary="Text to Speech", tags=["TTS"])
async def text_to_speech(request: TTSRequest):
    """
    Convert a given text to speech (MP3 audio).
    """
    if not request.text:
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")

    try:
        detected_lang_code = detect(request.text)
        # gTTS uses language codes like 'en', 'es', langdetect might return 'en-US'
        language_code = detected_lang_code.split('-')[0]

        supported_langs = gtts_langs.tts_langs().keys()
        if language_code not in supported_langs:
            language_code = 'en' # Fallback to English if detected language is not supported

        tts_obj = gTTS(text=request.text, lang=language_code, slow=False)
        mp3_buffer = BytesIO()
        tts_obj.write_to_fp(mp3_buffer)
        mp3_buffer.seek(0)
        
        return Response(content=mp3_buffer.getvalue(), media_type="audio/mpeg", headers={"Content-Disposition": f"attachment; filename=tts_{language_code}.mp3"})
    except Exception as e:
        # Consider logging the error e
        raise HTTPException(status_code=500, detail=f"An error occurred during TTS generation: {str(e)}")

# To run this application locally (optional, Vercel will handle it in production):
# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)

# The following line is kept for Vercel, as it might expect 'app' to be defined at the top level.
# If Vercel uses a different entry point or command, this might need adjustment in vercel.json or procfile.
# For Vercel, the `app` instance is what it will look for.
