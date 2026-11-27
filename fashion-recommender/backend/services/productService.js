const mongoose = require("mongoose");
const Product = require("../models/Product");
const fs = require("fs");
const path = require("path");

const PRODUCTS_CSV = path.join(__dirname, "..", "..", "..", "capstone_data", "products.csv");

const productCache = new Map();
let cacheLoaded = false;
let productListCache = [];
let productListCacheLoaded = false;

const FIELD_MAP = {
  article_id: "articleId", product_code: "productCode", prod_name: "productName",
  product_type_name: "productType", product_group_name: "productGroup",
  department_name: "department", section_name: "section", colour_group_name: "colourGroup",
  perceived_colour_value_name: "perceivedColourValue", perceived_colour_master_name: "perceivedColourMaster",
  garment_group_name: "garmentGroup", detail_desc: "detailDesc", product_text: "productText",
  graphical_appearance_name: "graphicalAppearance", customer_count: "customerCount",
};

function mapFields(doc) {
  const mapped = {};
  for (const [key, value] of Object.entries(doc)) {
    const camelKey = FIELD_MAP[key] || key;
    mapped[camelKey] = value;
  }
  return mapped;
}

async function loadProductsToDB() {
  if (cacheLoaded) return;
  const count = await Product.countDocuments();
  if (count > 0) {
    cacheLoaded = true;
    return;
  }
  const data = fs.readFileSync(PRODUCTS_CSV, "utf-8");
  const lines = data.trim().split("\n");
  const headers = lines[0].split(",");
  const batch = [];
  const BATCH = 500;
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const doc = {};
    headers.forEach((h, idx) => { doc[h.trim()] = values[idx] || ""; });
    doc.articleId = String(doc.article_id || "").padStart(10, "0");
    doc.imageUrl = `/images/${doc.articleId}.jpg`;
    const mapped = mapFields(doc);
    batch.push(mapped);
    if (batch.length >= BATCH) {
      await Product.insertMany(batch);
      batch.length = 0;
    }
  }
  if (batch.length > 0) await Product.insertMany(batch);
  cacheLoaded = true;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

function normalizeQuery(query) {
  if (!query || typeof query !== "string") return "";
  let q = query.toLowerCase().trim();
  q = q.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  const words = q.split(" ").map(w => {
    if (w.length > 4 && w.endsWith("s") && !w.endsWith("ss")) {
      return w.slice(0, -1);
    }
    return w;
  });
  return words.join(" ");
}

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (a.length > 20 || b.length > 20) {
    return simpleEditDistance(a, b);
  }
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function getWords(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 0);
}

function fuzzyScore(query, product) {
  const nqWords = getWords(query);
  if (nqWords.length === 0) return 0;

  const fields = [
    { text: product.productName || "", field: "name" },
    { text: product.productType || "", field: "type" },
    { text: product.productGroup || "", field: "group" },
    { text: product.department || "", field: "dept" },
    { text: product.section || "", field: "section" },
    { text: product.colourGroup || "", field: "colour" },
    { text: product.detailDesc || "", field: "desc" },
    { text: product.productCode || "", field: "code" },
  ];

  let score = 0;

  for (const nword of nqWords) {
    for (const { text, field } of fields) {
      const words = getWords(text);
      if (words.length === 0) continue;

      const normField = text.toLowerCase().replace(/[-_]/g, "").replace(/\s+/g, "");
      const nwordCombined = nword.replace(/[-_]/g, "").replace(/\s+/g, "");
      if (nwordCombined.length >= 3 && normField.includes(nwordCombined)) {
        if (field === "name") score += 100;
        else if (field === "type") score += 80;
        else if (field === "group") score += 60;
        else score += 30;
        continue;
      }

      let bestMatch = false;
      for (const w of words) {
        if (w === nword) {
          if (field === "name") score += 100;
          else if (field === "type") score += 80;
          else if (field === "group") score += 60;
          else score += 30;
          bestMatch = true;
          break;
        }
      }
      if (bestMatch) continue;

      for (const w of words) {
        if (w.length >= 3 && (w.includes(nword) || nword.includes(w))) {
          if (field === "name") score += 50;
          else if (field === "type") score += 40;
          else if (field === "group" || field === "dept") score += 25;
          else score += 10;
          bestMatch = true;
          break;
        }
      }
      if (bestMatch) continue;

      let minDist = Infinity;
      for (const w of words) {
        const dist = levenshtein(nword, w);
        if (dist < minDist) minDist = dist;
      }

      if (field === "name" && minDist <= 3) {
        score += Math.max(0, 25 - minDist * 8);
      } else if (field === "type" && minDist <= 3) {
        score += Math.max(0, 15 - minDist * 5);
      } else if (field === "group" || field === "dept") {
        if (minDist <= 2) score += Math.max(0, 8 - minDist * 3);
      }
    }
  }

  return score;
}

async function fuzzySearchProducts(query, limit) {
  if (productListCacheLoaded && productListCache.length === 0) return [];
  if (!productListCacheLoaded) {
    productListCache = await Product.find({}).lean();
    productListCacheLoaded = true;
  }

  const scored = [];
  const seen = new Set();
  for (const product of productListCache) {
    const score = fuzzyScore(query, product);
    if (score > 0) {
      const key = product.articleId || product._id;
      if (!seen.has(key)) {
        seen.add(key);
        scored.push({ product, score });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.product);
}

async function searchProducts(query, page = 1, limit = 20) {
  await loadProductsToDB();
  const q = query.trim();
  if (!q) return { products: [], total: 0, page, limit };

  const normalizedQuery = normalizeQuery(q);
  const nq = normalizedQuery !== q ? normalizedQuery : q;
  const skip = (page - 1) * limit;

  const regexNorm = new RegExp(nq, "i");
  const regexOrig = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const regexCombined = new RegExp(nq.replace(/\s+/g, ""), "i");

  const buildQuery = () => ({ $or: [
    { productName: { $regex: nq, $options: "i" } },
    { productName: { $regex: q, $options: "i" } },
    { productType: { $regex: nq, $options: "i" } },
    { productType: { $regex: q, $options: "i" } },
    { colourGroup: { $regex: nq, $options: "i" } },
    { colourGroup: { $regex: q, $options: "i" } },
    { department: { $regex: nq, $options: "i" } },
    { department: { $regex: q, $options: "i" } },
    { section: { $regex: nq, $options: "i" } },
    { section: { $regex: q, $options: "i" } },
    { productCode: { $regex: nq, $options: "i" } },
    { productCode: { $regex: q, $options: "i" } },
  ]});

  const exactTotal = await Product.countDocuments(buildQuery());
  if (exactTotal === 0) {
    const fuzzyProducts = await fuzzySearchProducts(q, limit);
    if (fuzzyProducts.length === 0) {
      return { products: [], total: 0, page, limit };
    }
    const scored = fuzzyProducts.map(p => ({ ...p, score: fuzzyScore(q, p) }));
    scored.sort((a, b) => b.score - a.score);
    const paginated = scored.slice(0, limit);
    return { products: paginated, total: scored.length, page, limit };
  }

  const exactProducts = await Product.find(buildQuery())
    .sort({ productName: 1 }).skip(skip).limit(limit);

  if (exactTotal >= 5 || exactProducts.length >= 5) {
    return { products: exactProducts, total: exactTotal, page, limit };
  }

  const fuzzyProducts = await fuzzySearchProducts(q, limit + 20);
  if (fuzzyProducts.length > 0) {
    const scored = fuzzyProducts.map(p => ({ ...p, score: fuzzyScore(q, p) }));
    scored.sort((a, b) => b.score - a.score);
    const combined = new Map();
    for (const p of exactProducts) {
      combined.set(p.articleId, { ...p.toObject ? p.toObject() : p, score: 0 });
    }
    for (const p of scored) {
      if (!combined.has(p.articleId)) {
        combined.set(p.articleId, { ...p, score: p.score });
      }
    }
    const final = Array.from(combined.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
    const paginated = final.slice(skip, skip + limit);
    return { products: paginated, total: final.length, page, limit };
  }

  return { products: exactProducts, total: exactTotal, page, limit };
}

async function getProductByArticleId(articleId) {
  await loadProductsToDB();
  const aid = String(articleId).trim().padStart(10, "0");
  let product = await Product.findOne({ articleId: aid });
  if (!product) product = await Product.findOne({ productCode: String(articleId).trim() });
  return product;
}

async function getProductsList(page = 1, limit = 20, category = "") {
  await loadProductsToDB();
  const skip = (page - 1) * limit;

  if (category && category !== "All") {
    const catMap = {
      Women: ["womens", "women", "lady"],
      Men: ["mens", "men"],
      Kids: ["kids", "kid", "baby", "girl", "boy"],
      Accessories: ["accessories", "bag", "hat", "scarf", "belt", "watch", "jewelry", "hair"],
      Shoes: ["shoes", "shoe", "boot", "sneaker", "sandal", "heel", "loafer", "pump", "trainer"],
    };
    const keywords = catMap[category] || [];
    if (keywords.length > 0) {
      const orConditions = [];
      for (const kw of keywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        orConditions.push(
          { productType: { $regex: `\\b${escaped}\\w*`, $options: "i" } },
          { productGroup: { $regex: `\\b${escaped}\\w*`, $options: "i" } },
          { section: { $regex: `\\b${escaped}\\w*`, $options: "i" } },
          { department: { $regex: `\\b${escaped}\\w*`, $options: "i" } }
        );
      }
      const count = await Product.countDocuments({ $or: orConditions });
      const products = await Product.find({ $or: orConditions }).skip(skip).limit(limit).sort({ productName: 1 });
      return { products, total: count, page, limit };
    }
  }

  const [total, products] = await Promise.all([
    Product.countDocuments(),
    Product.find().skip(skip).limit(limit),
  ]);
  return { products, total, page, limit };
}

module.exports = { loadProductsToDB, searchProducts, getProductByArticleId, getProductsList, normalizeQuery, fuzzyScore };