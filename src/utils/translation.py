import requests

# Azure Translator 설정
AZURE_TRANSLATOR_KEY = ''
AZURE_TRANSLATOR_ENDPOINT = ''
AZURE_TRANSLATOR_LOCATION = ''

def translate_text(text, target_language):
    """텍스트를 지정된 언어로 번역하는 함수"""
    if not text or not target_language:
        raise ValueError('텍스트와 대상 언어가 필요합니다.')

    try:
        response = requests.post(
            f'{AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&to={target_language}',
            headers={
                'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
                'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_LOCATION,
                'Content-Type': 'application/json',
            },
            json=[{'text': text}]
        )
        
        if not response.ok:
            raise Exception(f'번역 API 오류: {response.status_code} - {response.text}')
            
        data = response.json()
        return data[0]['translations'][0]['text']
        
    except Exception as e:
        print(f'번역 오류: {str(e)}')
        raise 