import urllib.request
import re

req = urllib.request.Request(
    'https://canlidoviz.com',
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
)
try:
    with urllib.request.urlopen(req, timeout=10) as res:
        html = res.read().decode('utf-8', errors='ignore')
        print(f"HTML length: {len(html)}")
        for line in html.split('\n'):
            if any(k in line for k in ['Dolar', 'Euro', 'Gram Altın', 'BIST 100', 'Bitcoin']):
                clean = re.sub('<[^<]+?>', ' ', line).strip()
                if len(clean) > 5 and len(clean) < 150:
                    print("LINE:", clean)
except Exception as e:
    print("Error:", e)
