import urllib.request
import json
import re

# Check first 12 products (home page)
req = urllib.request.Request('http://localhost:3000/api/products?page=1&limit=12')
r = urllib.request.urlopen(req, timeout=10)
data = json.loads(r.read())

for p in data.get('products', []):
    s = f"{(p.get('productType',''))} {(p.get('productGroup',''))} {(p.get('section',''))} {(p.get('department',''))}"
    matched_cats = []
    for cat, keywords in {
        "Women": ["womens", "women", "lady"],
        "Men": ["mens", "men"],
        "Kids": ["kids", "kid", "baby", "girl", "boy"],
        "Accessories": ["accessories", "bag", "hat", "scarf", "belt", "watch", "jewelry", "hair"],
        "Shoes": ["shoes", "shoe", "boot", "sneaker", "sandal", "heel", "loafer", "pump", "trainer"],
    }.items():
        for kw in keywords:
            if re.search(rf'\b{kw}\w*', s, re.IGNORECASE):
                matched_cats.append(cat)
                break
    print(f"{p.get('productName'):40s} | type={p.get('productType'):25s} | group={p.get('productGroup'):25s} | cats={matched_cats}")
