import urllib.request

# Test via Vite proxy (simulating browser request to localhost:5173)
try:
    req = urllib.request.Request("http://localhost:5173/images/0108775015.jpg")
    r = urllib.request.urlopen(req, timeout=5)
    body = r.read()
    print(f"Via Vite proxy: OK - {r.status}, {len(body)} bytes")
except Exception as e:
    print(f"Via Vite proxy FAIL: {e}")

# Test the image URL that frontend would use
try:
    req2 = urllib.request.Request("http://localhost:5173/api/products/0108775015")
    r2 = urllib.request.urlopen(req2, timeout=10)
    data = r2.read().decode()
    print(f"Product API via Vite proxy: OK")
    import json
    d = json.loads(data)
    print(f"  imageUrl: {d.get('imageUrl')}")
except Exception as e:
    print(f"Product API FAIL: {e}")
