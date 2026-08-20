import urllib.request, json

endpoints = [
    'https://canlidoviz.com/api/v1/currencies',
    'https://canlidoviz.com/api/v1/market',
    'https://canlidoviz.com/api/currencies',
    'https://canlidoviz.com/api/rates'
]

for url in endpoints:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as res:
            data = json.loads(res.read().decode('utf-8'))
            print(f"Success {url}: {list(data.keys()) if isinstance(data, dict) else len(data)}")
    except Exception as e:
        print(f"Failed {url}: {e}")
