from flask import Flask, request, jsonify
from flask_cors import CORS
from googletrans import Translator
import os
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

# Load environment variables
load_dotenv()

# Initialize translator
translator = Translator()

def detect_language(text):
    """Detect the language of the input text"""
    try:
        detected = translator.detect(text)
        return detected.lang
    except Exception as e:
        print(f"Language detection error: {str(e)}")
        return 'ko'  # Fallback to Korean

def translate_to_korean(text):
    """Translate text to Korean for internal processing"""
    try:
        translated = translator.translate(text, dest='ko')
        return translated.text
    except Exception as e:
        print(f"Translation to Korean error: {str(e)}")
        return text

def translate_to_language(text, target_lang):
    """Translate text to target language"""
    try:
        if target_lang != 'ko':
            translated = translator.translate(text, dest=target_lang)
            return translated.text
        return text
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return text

@app.route('/chat-rag', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        chat_history = data.get('chat_history', [])

        # Detect the language of the user's message
        user_lang = detect_language(user_message)
        
        # Translate to Korean for internal processing
        korean_message = translate_to_korean(user_message)
        
        # Here you would process the message with your RAG system
        # For now, we'll just echo back a simple response
        korean_response = f"입력하신 메시지 '{korean_message}'에 대한 응답입니다."
        
        # Translate the response to the user's original language
        final_response = translate_to_language(korean_response, user_lang)
        
        return jsonify({
            'reply': final_response,
            'chat_history': chat_history + [
                {'role': 'user', 'content': user_message},
                {'role': 'assistant', 'content': final_response}
            ]
        })

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        # Send error message in user's language
        error_message = "서버 처리 중 오류가 발생했습니다."
        translated_error = translate_to_language(error_message, user_lang)
        return jsonify({
            'error': translated_error,
            'details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 