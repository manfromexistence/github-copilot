from deep_translator import GoogleTranslator

# Get supported languages
supported_languages = GoogleTranslator().get_supported_languages()
print(supported_languages)
print(f"Total languages: {len(supported_languages)}")