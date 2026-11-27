import urllib.request
import json
import re

all_products = []
for page in range(1, 16):
    req = urllib.request.Request(f'http://localhost:3000/api/products?page={page}&limit=100')
    r = urllib.request.urlopen(req, timeout=10)
    data = json.loads(r.read())
    all_products.extend(data.get('products', []))

print(f"Total products: {len(all_products)}")

# Check Kids
kids = [p for p in all_products if re.search(r'\b(kids|kid|baby|girl|boy)\w*', f"{(p.get('productType',''))} {(p.get('productGroup',''))} {(p.get('section',''))} {(p.get('department',''))}", re.IGNORECASE)]
print(f"Kids matches: {len(kids)}")
for p in kids[:10]:
    print(f"  {p.get('productName')} | type={p.get('productType')} | section={p.get('section')}")

# Check Shoes
shoes = [p for p in all_products if re.search(r'\b(shoes|shoe|boot|sneaker|sandal|heel|loafer|pump|trainer)\w*', f"{(p.get('productType',''))} {(p.get('productGroup',''))} {(p.get('section',''))}", re.IGNORECASE)]
print(f"\nShoes matches: {len(shoes)}")
for p in shoes[:10]:
    print(f"  {p.get('productName')} | type={p.get('productType')} | section={p.get('section')}")

# Check what sections have "girl" or "boy"
girl_sections = set()
for p in all_products:
    s = (p.get('section', '')).lower()
    if re.search(r'\b(girl|boy|baby|child)', s):
        girl_sections.add(p.get('section', ''))
print(f"\nGirls/Boys sections: {girl_sections}")
