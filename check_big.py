import urllib.request
import json
import re

# Check first 5000 products (5 pages of 1000)
all_products = []
for page in range(1, 6):
    req = urllib.request.Request(f'http://localhost:3000/api/products?page={page}&limit=1000')
    r = urllib.request.urlopen(req, timeout=15)
    data = json.loads(r.read())
    all_products.extend(data.get('products', []))

print(f"Total products checked: {len(all_products)}")

# Kids
kids = [p for p in all_products if re.search(r'\b(kids|kid|baby|girl|boy)', f"{(p.get('productType',''))} {(p.get('productGroup',''))} {(p.get('section',''))}", re.IGNORECASE)]
print(f"Kids matches: {len(kids)}")
for p in kids[:10]:
    print(f"  {p.get('productName')} | type={p.get('productType')} | group={p.get('productGroup')}")

# Shoes
shoes = [p for p in all_products if re.search(r'\b(shoes|shoe|boot|sneaker|sandal|heel|loafer|pump|trainer)', f"{(p.get('productType',''))} {(p.get('productGroup',''))} {(p.get('section',''))}", re.IGNORECASE)]
print(f"\nShoes matches: {len(shoes)}")
for p in shoes[:10]:
    print(f"  {p.get('productName')} | type={p.get('productType')} | group={p.get('productGroup')}")
