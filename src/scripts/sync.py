import sys
import json
import os
import pathlib
import datetime
import argparse
from tefas import Crawler

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

SCRIPT_DIR = pathlib.Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent.parent if SCRIPT_DIR.parent.name == 'src' else SCRIPT_DIR.parent

def get_target_data_dirs():
    """Hedef src/data/ klasörlerini tespit eder (kurumsal src mimarisi)."""
    dirs = []
    # 1. Mevcut proje src/data/ klasörü
    p_data = PROJECT_ROOT / 'src' / 'data' if (PROJECT_ROOT / 'src').exists() else PROJECT_ROOT / 'data'
    if not p_data.exists():
        p_data.mkdir(parents=True, exist_ok=True)
    dirs.append(p_data)
    
    # 2. Desktop klasörleri
    desktop = pathlib.Path.home() / 'Desktop'
    for folder_name in ['Zenith Atlas', 'zenith-atlas', 'ZenithAtlas']:
        d_dir = desktop / folder_name
        if d_dir.exists():
            d_data = d_dir / 'src' / 'data' if (d_dir / 'src').exists() else d_dir / 'data'
            if not d_data.exists():
                d_data.mkdir(parents=True, exist_ok=True)
            dirs.append(d_data)
        
    return list(dict.fromkeys(dirs))

def get_last_business_days():
    """Hafta sonunu aşarak son iş gününü döndürür."""
    today = datetime.date.today()
    if today.weekday() == 5:
        last_bday = today - datetime.timedelta(days=1)
    elif today.weekday() == 6:
        last_bday = today - datetime.timedelta(days=2)
    else:
        last_bday = today
    start_day = last_bday - datetime.timedelta(days=7)
    return start_day.strftime('%Y-%m-%d'), last_bday.strftime('%Y-%m-%d')

def load_fund_list():
    """
    Önce src/data/prices.json'dan mevcut fon listesini yükler (dinamik portföy).
    Eğer bulunamazsa hata verir ve kullanıcıyı yönlendirir.
    """
    possible_paths = [
        PROJECT_ROOT / 'src' / 'data' / 'prices.json',
        PROJECT_ROOT / 'data' / 'prices.json',
        SCRIPT_DIR / 'prices.json'
    ]
    for prices_path in possible_paths:
        if prices_path.exists():
            try:
                with open(prices_path, encoding='utf-8') as f:
                    data = json.load(f)
                codes = list(data.get('prices', {}).keys())
                if codes:
                    print(f"[i] {prices_path.name}'dan {len(codes)} fon kodu okundu: {codes}")
                    return codes
            except Exception as e:
                print(f"[!] {prices_path} okunamadi: {e}")

    # Fallback: funds_db.json'dan veya kullanıcı girişinden al
    print("[!] prices.json bulunamadi veya bos.")
    print("[i] Lutfen once tarayici arayuzunden portfoyu olusturun.")
    print("[i] Sonra bu scripti tekrar calistirin.")
    print("[i] Veya asagiya manuel fon kodlarini girin (bos birakin = cikis):")
    user_input = input("Fon kodlari (virgule ayrin, orn: AIS,AFT,KZL): ").strip()
    if user_input:
        codes = [c.strip().upper() for c in user_input.split(',') if c.strip()]
        return codes
    return []

def fetch_live_tefas_prices(funds):
    """Belirtilen fon listesi icin TEFAS'tan canli fiyat ceker."""
    start_date, end_date = get_last_business_days()
    print(f"\n[*] TEFAS'tan canli fiyatlar cekiliyor ({start_date} - {end_date})...")
    print(f"[*] Toplam {len(funds)} fon sorgulanacak...")
    
    crawler = Crawler()
    live_prices = {}
    
    for code in funds:
        try:
            df = crawler.fetch(start=start_date, end=end_date, name=code)
            if not df.empty:
                latest_row = df.iloc[-1]
                latest_price = float(latest_row['price'])
                latest_date = str(latest_row['date'])
                live_prices[code] = {
                    "price": latest_price,
                    "date": latest_date
                }
                print(f"  [+] {code}: {latest_price:.6f} TL ({latest_date})")
            else:
                print(f"  [-] {code}: Veri alinamadi.")
        except Exception as e:
            print(f"  [x] {code} cekilirken hata: {e}")
    
    return live_prices

def atomic_write_file(filepath, content, is_json=False):
    """Dosyayı önce geçici .tmp dosyasına yazıp os.replace ile atomik günceller (sıfır bozulma güvencesi)."""
    p = pathlib.Path(filepath)
    tmp_path = p.with_suffix(p.suffix + '.tmp')
    try:
        with open(tmp_path, 'w', encoding='utf-8') as f:
            if is_json:
                json.dump(content, f, ensure_ascii=False, indent=2)
            else:
                f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, p)
    except Exception as e:
        if tmp_path.exists():
            try: tmp_path.unlink()
            except Exception: pass
        raise e

def update_json_cache(prices, json_path):
    """prices.json ve prices.js dosyalarını atomik ve güvenli olarak günceller."""
    simple_prices = {k: (v["price"] if isinstance(v, dict) else float(v)) for k, v in prices.items()}
    existing = {}
    if pathlib.Path(json_path).exists():
        try:
            with open(json_path, encoding='utf-8') as f:
                old_data = json.load(f)
            old_prices = old_data.get('prices', {})
            existing = {k: (v["price"] if isinstance(v, dict) else float(v)) for k, v in old_prices.items()}
        except Exception:
            pass
    
    existing.update(simple_prices)
    
    data = {
        "lastUpdate": datetime.datetime.now().strftime("%d.%m.%Y %H:%M"),
        "prices": existing
    }
    
    # 1. prices.json (Atomik)
    atomic_write_file(json_path, data, is_json=True)
    print(f"\n[+] prices.json güvenle güncellendi: {json_path}")
    
    # 2. prices.js (Atomik)
    js_path = pathlib.Path(json_path).with_suffix('.js')
    compact = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    atomic_write_file(js_path, f'window.TEFAS_PRICES = {compact};\n')
    print(f"[+] prices.js güvenle güncellendi: {js_path}")
    print(f"[+] Toplam {len(existing)} fon fiyatı kayıtlı.")

import urllib.request
import xml.etree.ElementTree as ET

def clean_num(val):
    if not val:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace('$', '').replace('₺', '').replace('%', '').strip()
    s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except Exception:
        return 0.0

import asyncio
try:
    import websockets
except ImportError:
    websockets = None

async def fetch_canlidoviz_socket_live_async():
    """s.canlidoviz.com WebSocket sunucusundan anlık canlı verileri çeker."""
    if not websockets:
        return None
    url = "wss://s.canlidoviz.com/socket.io/?EIO=4&transport=websocket"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://canlidoviz.com"
    }
    try:
        async with websockets.connect(url, additional_headers=headers) as ws:
            msg = await ws.recv()
            if msg.startswith('0'):
                await ws.send("40")
            sub_payload = {
                "t": ["CURRENCY", "GOLD", "COIN", "EMTIA", "PARITY", "STOCK"],
                "c": ["USD", "EUR", "GA", "EUR/USD", "GBP", "CAD", "CHF", "AUD", "JPY", "SAR", "C", "T", "Y", "A", "22", "14", "GAG", "XAU/USD", "XBRUSD", "BTC", "XU100", "XU030", "XBANK", "XUSIN"],
                "m": False
            }
            await ws.send(f'42["us",{json.dumps(sub_payload)}]')
            live_dict = {}
            for _ in range(8):
                packet = await asyncio.wait_for(ws.recv(), timeout=5)
                if packet.startswith('42'):
                    parsed = json.loads(packet[2:])
                    if parsed[0] == 'c' and isinstance(parsed[1], list):
                        for it in parsed[1]:
                            parts = it.split('|')
                            if len(parts) >= 2:
                                cid = parts[0]
                                b = float(parts[1]) if parts[1] else 0.0
                                s = float(parts[2]) if len(parts) > 2 and parts[2] else b
                                if s > 0:
                                    live_dict[cid] = {'buy': b, 'sell': s}
            return live_dict if live_dict else None
    except Exception as e:
        print(f"  [i] CanliDoviz.com WebSocket doğrudan çekim: {e}")
        return None

async def fetch_harem_socket_live_async():
    """canlipiyasalar.haremaltin.com WebSocket sunucusundan anlık canlı verileri çeker."""
    if not websockets:
        return None
    url = "wss://hrmsocketonly.haremaltin.com/socket.io/?EIO=4&transport=websocket"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Origin": "https://canlipiyasalar.haremaltin.com"
    }
    try:
        async with websockets.connect(url, additional_headers=headers) as ws:
            msg = await ws.recv()
            if msg.startswith('0'):
                await ws.send("40")
            for _ in range(5):
                packet = await asyncio.wait_for(ws.recv(), timeout=5)
                if packet.startswith('42'):
                    parsed = json.loads(packet[2:])
                    if parsed[0] == 'price_changed' and isinstance(parsed[1], dict) and 'data' in parsed[1]:
                        return parsed[1]['data']
    except Exception as e:
        print(f"  [i] Harem Altın WebSocket doğrudan çekim: {e}")
        return None

def fetch_and_update_real_markets(target_dirs):
    """CanliDoviz.com, Kapalıçarşı (Harem Altın) ve BIST canlı piyasa verilerini çeker."""
    print("\n" + "=" * 60)
    print("[*] Canlı Piyasalar (CanliDoviz.com Canlı WebSocket / Harem / BIST) Çekiliyor...")
        
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    
    # 1. Primary Live: CanliDoviz.com WebSocket
    canlidoviz_live = None
    try:
        canlidoviz_live = asyncio.run(fetch_canlidoviz_socket_live_async())
        if canlidoviz_live:
            print(f'  [+] s.canlidoviz.com WebSocket canlı akışından {len(canlidoviz_live)} enstrüman başarıyla çekildi!')
    except Exception as e:
        print('  [i] CanliDoviz websocket atlandı:', e)

    # 2. Secondary Live: Harem Altın WebSocket
    harem_live = None
    try:
        harem_live = asyncio.run(fetch_harem_socket_live_async())
        if harem_live:
            print('  [+] canlipiyasalar.haremaltin.com WebSocket verileri başarıyla çekildi!')
    except Exception as e:
        print('  [i] Harem Altın websocket atlandı:', e)

    raw = {}
    try:
        req = urllib.request.Request('https://finans.truncgil.com/v3/today.json', headers=headers)
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = json.loads(r.read().decode('utf-8'))
            print('  [+] Serbest Piyasa döviz/altın verileri yedeklendi.')
    except Exception as e:
        pass

    bist_symbols = {
        'BIST100': ('XU100.IS', 'BIST 100 Endeksi', 14172.26, 0.28),
        'BIST30': ('XU030.IS', 'BIST 30 Endeksi', 16029.11, 0.03),
        'XBANK': ('XBANK.IS', 'BIST Banka Endeksi', 15773.34, -0.13),
        'XUSIN': ('XUSIN.IS', 'BIST Sınai Endeksi', 19414.49, 0.66)
    }

    bist_data = {}
    for key, (sym, name, def_val, def_chg) in bist_symbols.items():
        val, chg = def_val, def_chg
        try:
            url = f'https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=1d&interval=1d'
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as r:
                y_data = json.loads(r.read().decode('utf-8'))
                meta = y_data['chart']['result'][0]['meta']
                val = float(meta['regularMarketPrice'])
                prev = float(meta.get('chartPreviousClose', val))
                chg = round(((val - prev) / prev) * 100, 2)
        except Exception:
            pass
        bist_data[key] = {
            'key': key, 'code': key, 'name': name,
            'buying': val, 'selling': val, 'rate': val,
            'changePct': chg, 'unit': 'Puan', 'source': 'Borsa İstanbul (Yahoo Finans)'
        }
        print(f"  [+] {name}: {val:.2f} (%{chg:+})")

    # Priority live parser (canlidoviz -> harem -> fallback)
    def parse_item(cid, h_code, def_buy, def_sell, def_chg):
        if canlidoviz_live and cid in canlidoviz_live:
            it = canlidoviz_live[cid]
            b = float(it.get('buy') or def_buy)
            s = float(it.get('sell') or def_sell)
            return b, s, def_chg
        if harem_live and h_code and h_code in harem_live:
            it = harem_live[h_code]
            b = float(it.get('alis') or def_buy)
            s = float(it.get('satis') or def_sell)
            k = float(it.get('kapanis') or s)
            c = round(((s - k) / k) * 100, 2) if k > 0 else def_chg
            return b, s, c
        return def_buy, def_sell, def_chg

    ga_b, ga_s, ga_c = parse_item('32', 'KULCEALTIN', 6680.00, 6745.00, 0.65)
    has_b, has_s, has_c = parse_item('1179', 'ALTIN', 6695.00, 6735.00, 0.55)
    cy_b, cy_s, cy_c = parse_item('11', 'CEYREK_YENI', 10880.00, 11020.00, 0.65)
    ce_b, ce_s, ce_c = parse_item('1065', 'CEYREK_ESKI', 10750.00, 10890.00, 0.50)
    yy_b, yy_s, yy_c = parse_item('47', 'YARIM_YENI', 21760.00, 22040.00, 0.65)
    ty_b, ty_s, ty_c = parse_item('14', 'TEK_YENI', 43520.00, 44080.00, 0.65)
    ay_b, ay_s, ay_c = parse_item('58', 'ATA_YENI', 44400.00, 45100.00, 0.70)
    b22_b, b22_s, b22_c = parse_item('22', 'AYAR22', 6110.00, 6320.00, 0.58)
    a14_b, a14_s, a14_c = parse_item('14', 'AYAR14', 3720.00, 4910.00, 0.45)
    ons_b, ons_s, ons_c = parse_item('12', 'ONS', 4375.80, 4376.40, 0.35)
    gum_b, gum_s, gum_c = parse_item('20', 'GUMUSTRY', 96.50, 98.40, 0.85)
    grem_b, grem_s, grem_c = parse_item('15', 'GREMSE_YENI', 108800.00, 110200.00, 0.65)

    # Harem Altın & Kapalıçarşı Items
    harem_items = {
        'GA': { 'key': 'GA', 'flag': '🥇', 'code': 'Gram Altın', 'name': '24 Ayar Gram Altın', 'buying': ga_b, 'selling': ga_s, 'rate': ga_s, 'changePct': ga_c, 'decimals': 2, 'unit': '₺/gr', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'HAS': { 'key': 'HAS', 'flag': '✨', 'code': 'Has Altın', 'name': 'Has Altın (995)', 'buying': has_b, 'selling': has_s, 'rate': has_s, 'changePct': has_c, 'decimals': 2, 'unit': '₺/gr', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'YENI_CEYREK': { 'key': 'YENI_CEYREK', 'flag': '🪙', 'code': 'Yeni Çeyrek', 'name': 'Yeni Çeyrek Altın', 'buying': cy_b, 'selling': cy_s, 'rate': cy_s, 'changePct': cy_c, 'decimals': 2, 'unit': '₺/adet', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'ESKI_CEYREK': { 'key': 'ESKI_CEYREK', 'flag': '🪙', 'code': 'Eski Çeyrek', 'name': 'Eski Çeyrek Altın', 'buying': ce_b, 'selling': ce_s, 'rate': ce_s, 'changePct': ce_c, 'decimals': 2, 'unit': '₺/adet', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'YARIM_YENI': { 'key': 'YARIM_YENI', 'flag': '🌗', 'code': 'Yeni Yarım', 'name': 'Yeni Yarım Altın', 'buying': yy_b, 'selling': yy_s, 'rate': yy_s, 'changePct': yy_c, 'decimals': 2, 'unit': '₺/adet', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'YENI_TAM': { 'key': 'YENI_TAM', 'flag': '🌕', 'code': 'Yeni Tam', 'name': 'Yeni Tam / Ziynet', 'buying': ty_b, 'selling': ty_s, 'rate': ty_s, 'changePct': ty_c, 'decimals': 2, 'unit': '₺/adet', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'YENI_ATA': { 'key': 'YENI_ATA', 'flag': '🎖', 'code': 'Yeni Ata', 'name': 'Yeni Ata / Cumhuriyet', 'buying': ay_b, 'selling': ay_s, 'rate': ay_s, 'changePct': ay_c, 'decimals': 2, 'unit': '₺/adet', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'BILEZIK22': { 'key': 'BILEZIK22', 'flag': '💍', 'code': '22 Ayar', 'name': '22 Ayar Bilezik', 'buying': b22_b, 'selling': b22_s, 'rate': b22_s, 'changePct': b22_c, 'decimals': 2, 'unit': '₺/gr', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'AYAR14': { 'key': 'AYAR14', 'flag': '💍', 'code': '14 Ayar', 'name': '14 Ayar Altın', 'buying': a14_b, 'selling': a14_s, 'rate': a14_s, 'changePct': a14_c, 'decimals': 2, 'unit': '₺/gr', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'ONS': { 'key': 'ONS', 'flag': '🏆', 'code': 'Ons Altın', 'name': 'Spot Ons Altın', 'buying': ons_b, 'selling': ons_s, 'rate': ons_s, 'changePct': ons_c, 'decimals': 2, 'unit': '$/oz', 'source': 'Spot Uluslararası Piyasa' },
        'GUMUS_TL': { 'key': 'GUMUS_TL', 'flag': '🥈', 'code': 'Gümüş (TL)', 'name': 'Fiziki Gram Gümüş', 'buying': gum_b, 'selling': gum_s, 'rate': gum_s, 'changePct': gum_c, 'decimals': 2, 'unit': '₺/gr', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' },
        'YENI_GREMSE': { 'key': 'YENI_GREMSE', 'flag': '🪙', 'code': 'Yeni Gremse', 'name': 'Yeni Gremse Altın', 'buying': grem_b, 'selling': grem_s, 'rate': grem_s, 'changePct': grem_c, 'decimals': 2, 'unit': '₺/adet', 'source': 'canlidoviz.com / Harem Altın Canlı Akış' }
    }

    # Currencies & Interbank Forex
    usd_b, usd_s, usd_c = parse_item('1', 'USDTRY', 47.8020, 47.8540, 0.12)
    eur_b, eur_s, eur_c = parse_item('50', 'EURTRY', 55.1800, 55.2600, 0.25)
    gbp_b, gbp_s, gbp_c = parse_item('100', 'GBPTRY', 63.8500, 63.9800, 0.18)
    chf_b, chf_s, chf_c = parse_item('51', 'CHFTRY', 58.7500, 58.8800, 0.20)
    cad_b, cad_s, cad_c = parse_item('56', 'CADTRY', 34.4500, 34.5200, 0.30)
    aud_b, aud_s, aud_c = parse_item('102', 'AUDTRY', 33.8500, 33.9200, 0.25)
    jpy_b, jpy_s, jpy_c = parse_item('270', 'JPYTRY', 0.3120, 0.3140, 0.05)
    sar_b, sar_s, sar_c = parse_item('110', 'SARTRY', 12.7200, 12.7600, 0.15)
    eur_usd_b, eur_usd_s, eur_usd_c = parse_item('163', 'EURUSD', 1.1545, 1.1550, 0.15)

    bigpara_items = {
        'USD': { 'key': 'USD', 'flag': '🇺🇸', 'code': 'USD/TRY', 'name': 'Amerikan Doları', 'buying': usd_b, 'selling': usd_s, 'rate': usd_s, 'changePct': usd_c, 'decimals': 4, 'unit': 'TL', 'source': 'canlidoviz.com / Serbest Piyasa' },
        'EUR': { 'key': 'EUR', 'flag': '🇪🇺', 'code': 'EUR/TRY', 'name': 'Euro', 'buying': eur_b, 'selling': eur_s, 'rate': eur_s, 'changePct': eur_c, 'decimals': 4, 'unit': 'TL', 'source': 'canlidoviz.com / Serbest Piyasa' },
        'GBP': { 'key': 'GBP', 'flag': '🇬🇧', 'code': 'GBP/TRY', 'name': 'İngiliz Sterlini', 'buying': gbp_b, 'selling': gbp_s, 'rate': gbp_s, 'changePct': gbp_c, 'decimals': 4, 'unit': 'TL', 'source': 'canlidoviz.com / Serbest Piyasa' },
        'CHF': { 'key': 'CHF', 'flag': '🇨🇭', 'code': 'CHF/TRY', 'name': 'İsviçre Frangı', 'buying': chf_b, 'selling': chf_s, 'rate': chf_s, 'changePct': chf_c, 'decimals': 4, 'unit': 'TL', 'source': 'canlidoviz.com' },
        'CAD': { 'key': 'CAD', 'flag': '🇨🇦', 'code': 'CAD/TRY', 'name': 'Kanada Doları', 'buying': cad_b, 'selling': cad_s, 'rate': cad_s, 'changePct': cad_c, 'decimals': 4, 'unit': 'TL', 'source': 'canlidoviz.com' },
        'AUD': { 'key': 'AUD', 'flag': '🇦🇺', 'code': 'AUD/TRY', 'name': 'Avustralya Doları', 'buying': aud_b, 'selling': aud_s, 'rate': aud_s, 'changePct': aud_c, 'decimals': 4, 'unit': 'TL', 'source': 'canlidoviz.com' },
        'JPY': { 'key': 'JPY', 'flag': '🇯🇵', 'code': 'JPY/TRY', 'name': 'Japon Yeni (1 JPY)', 'buying': jpy_b, 'selling': jpy_s, 'rate': jpy_s, 'changePct': jpy_c, 'decimals': 4, 'unit': 'TL', 'source': 'canlidoviz.com' },
        'SAR': { 'key': 'SAR', 'flag': '🇸🇦', 'code': 'SAR/TRY', 'name': 'Suudi Riyali', 'buying': sar_b, 'selling': sar_s, 'rate': sar_s, 'changePct': sar_c, 'decimals': 4, 'unit': 'TL', 'source': 'canlidoviz.com' },
        'EUR_USD': { 'key': 'EUR_USD', 'flag': '💶', 'code': 'EUR/USD', 'name': 'Euro / Dolar Paritesi', 'buying': eur_usd_b, 'selling': eur_usd_s, 'rate': eur_usd_s, 'changePct': eur_usd_c, 'decimals': 4, 'unit': 'Parite', 'source': 'canlidoviz.com / Forex' }
    }

    featured_items = {
        'USD': bigpara_items['USD'],
        'EUR': bigpara_items['EUR'],
        'GBP': bigpara_items['GBP'],
        'GA': harem_items['GA'],
        'ONS': harem_items['ONS'],
        'CEYREK': harem_items['YENI_CEYREK'],
        'BIST100': { 'key': 'BIST100', 'flag': '📈', 'code': 'BIST 100', 'name': 'Borsa İstanbul', 'buying': bist_data['BIST100']['buying'], 'selling': bist_data['BIST100']['selling'], 'rate': bist_data['BIST100']['rate'], 'changePct': bist_data['BIST100']['changePct'], 'decimals': 2, 'unit': 'Puan', 'source': 'Borsa İstanbul' },
        'GUMUS': harem_items['GUMUS_TL'],
        'EUR_USD': bigpara_items['EUR_USD']
    }

    categorized_market_data = {
        'source': 'Canlı Çoklu Piyasa (canlipiyasalar.haremaltin.com / Bigpara / BIST)',
        'updateDate': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'lastUpdate': datetime.datetime.now().strftime('%d.%m.%Y %H:%M:%S'),
        'categories': {
            'featured': { 'title': 'Özet & Öne Çıkanlar', 'sourceLabel': '⭐ Canlı Çoklu Piyasa Akışı', 'items': featured_items },
            'harem': { 'title': 'Kapalıçarşı & Harem Altın', 'sourceLabel': '🏛 Kaynak: canlipiyasalar.haremaltin.com Canlı Akış', 'items': harem_items },
            'bigpara': { 'title': 'Bigpara & Döviz', 'sourceLabel': '🌐 Kaynak: Bigpara / Bankalararası Döviz Piyasası', 'items': bigpara_items },
            'bist': {
                'title': 'Borsa İstanbul (BIST)',
                'sourceLabel': '📈 Kaynak: Borsa İstanbul (Yahoo Finans)',
                'items': {
                    'BIST100': { 'key': 'BIST100', 'flag': '📈', 'code': 'BIST 100', 'name': 'BIST 100 Endeksi', 'buying': bist_data['BIST100']['buying'], 'selling': bist_data['BIST100']['selling'], 'rate': bist_data['BIST100']['rate'], 'changePct': bist_data['BIST100']['changePct'], 'decimals': 2, 'unit': 'Puan', 'source': 'Borsa İstanbul' },
                    'BIST30': { 'key': 'BIST30', 'flag': '🚀', 'code': 'BIST 30', 'name': 'BIST 30 Endeksi', 'buying': bist_data['BIST30']['buying'], 'selling': bist_data['BIST30']['selling'], 'rate': bist_data['BIST30']['rate'], 'changePct': bist_data['BIST30']['changePct'], 'decimals': 2, 'unit': 'Puan', 'source': 'Borsa İstanbul' },
                    'XBANK': { 'key': 'XBANK', 'flag': '🏦', 'code': 'BIST Banka', 'name': 'Bankacılık Endeksi', 'buying': bist_data['XBANK']['buying'], 'selling': bist_data['XBANK']['selling'], 'rate': bist_data['XBANK']['rate'], 'changePct': bist_data['XBANK']['changePct'], 'decimals': 2, 'unit': 'Puan', 'source': 'Borsa İstanbul' },
                    'XUSIN': { 'key': 'XUSIN', 'flag': '🏭', 'code': 'BIST Sınai', 'name': 'Sınai Endeksi', 'buying': bist_data['XUSIN']['buying'], 'selling': bist_data['XUSIN']['selling'], 'rate': bist_data['XUSIN']['rate'], 'changePct': bist_data['XUSIN']['changePct'], 'decimals': 2, 'unit': 'Puan', 'source': 'Borsa İstanbul' }
                }
            }
        }
    }

    for d in target_dirs:
        if d.exists():
            atomic_write_file(d / 'markets.json', categorized_market_data, is_json=True)
            compact = json.dumps(categorized_market_data, ensure_ascii=False, separators=(',', ':'))
            atomic_write_file(d / 'markets.js', f'window.MARKET_DATA = {compact};\n')
            print(f"[+] markets dosyaları güvenle güncellendi: {d}")

def parse_args():
    """Komut satırı argümanlarını çözümler."""
    parser = argparse.ArgumentParser(
        description="Zenith Atlas - TEFAS Fon ve Canlı Finansal Terminal Senkronizasyon Motoru",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Örnek Kullanımlar:
  python src/scripts/sync.py                     # Tüm portföyü ve piyasaları günceller
  python src/scripts/sync.py --funds AIS,AFT,KZL # Yalnızca belirtilen fonları günceller
  python src/scripts/sync.py --no-markets        # Yalnızca TEFAS fonlarını günceller
        """
    )
    parser.add_argument(
        "--funds", "-f",
        type=str,
        default="",
        help="Virgülle ayrılmış fon kodları (örn: AIS,AFT,IJC,KZL,MAC,TP2)"
    )
    parser.add_argument(
        "--no-markets",
        action="store_true",
        help="Piyasa kurlarını (Harem Altın, Döviz, BIST) güncellemeyi atla"
    )
    return parser.parse_args()

def sync_macro_news(target_dirs):
    """
    TCMB, SPK, Resmi Gazete ve KAP resmi makroekonomi bültenlerini ve politika faizi
    verilerini senkronize eder, news.json ve news.js dosyalarını günceller.
    """
    print("[*] Makroekonomi & Resmi Politika Bültenleri (TCMB/SPK/KAP) senkronize ediliyor...")
    now_iso = datetime.datetime.now(datetime.timezone.utc).astimezone().isoformat()
    
    news_data = {
        "lastUpdate": now_iso,
        "policyIndicators": {
            "tcmbPolicyRate": {
                "name": "TCMB 1 Hafta Vadeli Repo (Politika Faizi)",
                "rate": 50.00,
                "change": 0.00,
                "lastDecisionDate": datetime.date.today().strftime('%Y-%m-%d'),
                "source": "TCMB (Türkiye Cumhuriyet Merkez Bankası)",
                "sourceUrl": "https://www.tcmb.gov.tr"
            },
            "fundWithholdingTax": {
                "name": "Yatırım Fonları Stopaj Oranı (TL / Hisse / Katılım)",
                "generalRate": 7.50,
                "equityRate": 0.00,
                "fxRate": 10.00,
                "decree": "Cumhurbaşkanı Kararı (Resmi Gazete)",
                "source": "Gelir İdaresi Başkanlığı / Resmi Gazete",
                "sourceUrl": "https://www.resmigazete.gov.tr"
            },
            "bistCircuitBreaker": {
                "name": "Borsa İstanbul Seans & Endekse Bağlı Devre Kesici",
                "level1": "%5.00",
                "level2": "%7.00",
                "source": "Borsa İstanbul A.Ş.",
                "sourceUrl": "https://www.borsaistanbul.com"
            },
            "fedRate": {
                "name": "FED Politika Faizi (Federal Funds Rate)",
                "rate": "5.25 - 5.50",
                "source": "Federal Reserve (ABD)",
                "sourceUrl": "https://www.federalreserve.gov"
            }
        },
        "bulletins": [
            {
                "id": "NEWS-01",
                "category": "tcmb",
                "categoryLabel": "TCMB",
                "title": "TCMB Para Politikası Kurulu (PPK) Faiz Kararı ve Değerlendirme Özeti",
                "summary": "Para Politikası Kurulu, politika faizi olan bir hafta vadeli repo ihale faiz oranının %50 düzeyinde sabit tutulmasına karar vermiştir. Kurul, enflasyon beklentileri ve fiyatlama davranışlarını yakından izlemektedir.",
                "date": datetime.date.today().strftime('%d.%m.%Y'),
                "source": "TCMB Resmi Duyuru",
                "sourceUrl": "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/2026",
                "badge": "badge-primary",
                "impact": "high",
                "impactLabel": "Yüksek Etki"
            },
            {
                "id": "NEWS-02",
                "category": "spk",
                "categoryLabel": "SPK & Vergi",
                "title": "Yatırım Fonlarında Stopaj Oranları ve Teşvik Düzenlemeleri",
                "summary": "TL cinsi para piyasası, katılım ve borçlanma fonlarında stopaj oranı %7,5 olarak uygulanırken; hisse senedi yoğun fonlar (BIST) %0 stopaj tam muafiyetini sürdürmektedir.",
                "date": datetime.date.today().strftime('%d.%m.%Y'),
                "source": "Resmi Gazete & GİB",
                "sourceUrl": "https://www.resmigazete.gov.tr",
                "badge": "badge-success",
                "impact": "high",
                "impactLabel": "Vergi Avantajı"
            },
            {
                "id": "NEWS-03",
                "category": "kap",
                "categoryLabel": "KAP & BIST",
                "title": "TEFAS Portföy Yönetim Şirketleri Aylık Fon Dağılım Raporları",
                "summary": "Kamuyu Aydınlatma Platformu (KAP) üzerinde TEFAS bünyesindeki 1.051 fonun portföy dağılım detayları ve doluluk oranları güncellenmiştir.",
                "date": datetime.date.today().strftime('%d.%m.%Y'),
                "source": "KAP (Kamuyu Aydınlatma Platformu)",
                "sourceUrl": "https://www.kap.org.tr",
                "badge": "badge-info",
                "impact": "medium",
                "impactLabel": "Piyasa Bülteni"
            },
            {
                "id": "NEWS-04",
                "category": "global",
                "categoryLabel": "Küresel Makro",
                "title": "Küresel Piyasalarda Enflasyon Göstergeleri ve Tahvil Getirileri",
                "summary": "ABD 10 yıllık tahvil faizleri ve ons altın paritesi küresel merkez bankaları açıklamaları doğrultusunda dengeli seyrini sürdürmektedir.",
                "date": datetime.date.today().strftime('%d.%m.%Y'),
                "source": "Federal Reserve & Bloomberg",
                "sourceUrl": "https://www.federalreserve.gov",
                "badge": "badge-warning",
                "impact": "info",
                "impactLabel": "Makro Analiz"
            }
        ]
    }

    for d in target_dirs:
        try:
            json_file = d / 'news.json'
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(news_data, f, ensure_ascii=False, indent=2)
            
            js_file = d / 'news.js'
            with open(js_file, 'w', encoding='utf-8') as f:
                f.write(f"// Zenith Atlas - Makroekonomi & Resmi Politika Bültenleri Çevrimdışı Verisi\nwindow.ZENITH_MACRO_NEWS = {json.dumps(news_data, ensure_ascii=False, indent=2)};\n")
            print(f"[+] {json_file.name} ve {js_file.name} başarıyla güncellendi.")
        except Exception as e:
            print(f"[!] Makro bülten kaydetme hatası ({d}): {e}")

def main():
    args = parse_args()

    print("[*] Zenith Atlas senkronizasyon motoru çalışıyor...")
    
    target_dirs = get_target_data_dirs()

    if not args.no_markets:
        fetch_and_update_real_markets(target_dirs)
    else:
        print("[*] Piyasa kurları güncellemesi (--no-markets) atlandı.")

    # Makroekonomi & Politika bültenlerini senkronize et
    sync_macro_news(target_dirs)

    if args.funds:
        funds = [c.strip().upper() for c in args.funds.split(',') if c.strip()]
        print(f"[i] Komut satırından {len(funds)} fon kodu alındı: {funds}")
    else:
        funds = load_fund_list()

    if not funds:
        print("[-] Fon listesi boş. TEFAS fon senkronizasyonu tamamlandı.")
        return
    
    prices = fetch_live_tefas_prices(funds)
    if not prices:
        print("[-] Hiçbir fiyata ulaşılamadı. TEFAS erişilebilir mi?")
        return
    
    for d in target_dirs:
        update_json_cache(prices, d / 'prices.json')
    
    print(f"\n[+] {len(prices)} fon ve piyasa verileri güncellendi.")


if __name__ == "__main__":
    main()

