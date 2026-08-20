import urllib.request
import re, json

req = urllib.request.Request(
    'https://canlidoviz.com',
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
)
try:
    with urllib.request.urlopen(req, timeout=10) as res:
        html = res.read().decode('utf-8', errors='ignore')
        # Check next data
        m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
        if m:
            data = json.loads(m.group(1))
            props = data.get('props', {}).get('pageProps', {})
            print("PageProps keys:", list(props.keys()))
            items = props.get('initialCurrencies', []) or props.get('items', []) or props.get('currencies', [])
            print("Found items count:", len(items))
            for item in items[:15]:
                print(item)
except Exception as e:
    print("Error:", e)
