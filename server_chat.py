import openai
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")


openai.organization = os.environ["OPENAI_ORGANIZATION_ID"]
openai.api_key = os.environ["OPENAI_API_KEY"]


def chatGPT(input_prompt):
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": input_prompt}
    ]

    res = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=100
    )

    return res['choices'][0]['message']['content']


def dummmyGPT(input_prompt):
    return "日本で一番高い山の名前は「富士山」です。"


def chat(input_prompt, mode):
    if mode == "chat":
        return dummmyGPT(input_prompt)
        # return chatGPT("次の問い合せに短文で答えてください。"+input_prompt)
    return input_prompt
