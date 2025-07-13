import requests
import json

# The URL of your running FastAPI server
API_URL = "http://127.0.0.1:8000/api/generate"

# The data to send in the POST request
payload = {
    "query": "Tell me a short story about a robot who discovers music.",
    "max_tokens": 150
}

print(f"--- Sending request to {API_URL} ---")
print(f"Query: {payload['query']}\n")

try:
    # Make the POST request with stream=True
    with requests.post(API_URL, json=payload, stream=True) as response:
        # Check if the request was successful
        if response.status_code == 200:
            print("--- Streaming response ---")
            # Iterate over the response content chunk by chunk
            for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
                if chunk:
                    # Print each chunk to the console immediately
                    print(chunk, end="", flush=True)
            print("\n--- Stream finished ---")
        else:
            print(f"\n--- Error ---")
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")

except requests.exceptions.ConnectionError as e:
    print("\n--- Connection Error ---")
    print(f"Could not connect to the server at {API_URL}.")
    print("Please make sure your FastAPI server is running.")

except Exception as e:
    print(f"\nAn unexpected error occurred: {e}") 