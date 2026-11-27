import urllib.request
import json

req = urllib.request.Request('http://localhost:3000/api/products?page=1&limit=50')
r = urllib.request.urlopen(req, timeout=10)
data = json.loads(r.read())

# Check department, section, productGroup values
depts = {}
sections = {}
groups = {}
types = {}
for p in data.get('products', []):
    d = p.get('department', '')
    s = p.get('section', '')
    g = p.get('productGroup', '')
    t = p.get('productType', '')
    depts[d] = depts.get(d, 0) + 1
    sections[s] = sections.get(s, 0) + 1
    groups[g] = groups.get(g, 0) + 1
    types[t] = types.get(t, 0) + 1

print("Departments:", depts)
print("\nSections:", sections)
print("\nProduct Groups:", groups)
