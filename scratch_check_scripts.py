import urllib.request, re

req = urllib.request.Request('https://canlidoviz.com', headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
with urllib.request.urlopen(req, timeout=5) as res:
    html = res.read().decode('utf-8', errors='ignore')
    scripts = re.findall(r'<script.*?>([\s\S]*?)</script>', html)
    print(f"Found {len(scripts)} scripts")
    for i, s in enumerate(scripts):
        if len(s) > 50 and ('price' in s.lower() or 'usd' in s.lower() or 'dolar' in s.lower() or 'rate' in s.lower()):
            print(f"Script {i} (len {len(s)}): {s[:300]}...\n")
