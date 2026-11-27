const mongoose = require("mongoose");
const config = require("./config/db");

async function main() {
  await mongoose.connect(config.mongoUri);
  const Product = require("./models/Product");

  // Count Bra products
  const braCount = await Product.countDocuments({ productType: "Bra" });
  console.log("Bra products:", braCount);

  // Show sample Bra products
  const braProducts = await Product.find({ productType: "Bra" }).limit(5).lean();
  console.log("\nSample Bra products:");
  braProducts.forEach(p => console.log(`  ${p.articleId}: ${p.productName} (${p.productType})`));

  // Show all unique product types
  const types = await Product.distinct("productType");
  console.log("\nAll product types:", types);

  // Count by product type
  const typeCounts = await Product.aggregate([
    { $group: { _id: "$productType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 30 }
  ]);
  console.log("\nProduct type counts (top 30):");
  typeCounts.forEach(t => console.log(`  ${t._id}: ${t.count}`));

  // Show non-Bra products
  const nonBra = await Product.find({ productType: { $ne: "Bra" } }).limit(5).lean();
  console.log("\nSample non-Bra products:");
  nonBra.forEach(p => console.log(`  ${p.articleId}: ${p.productName} (${p.productType})`));

  await mongoose.disconnect();
}

main().catch(console.error);
