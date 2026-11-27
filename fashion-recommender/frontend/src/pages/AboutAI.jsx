export default function AboutAI() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">About the Recommendation System</h1>
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Architecture</h2>
        <div className="bg-gray-50 rounded-xl p-6 font-mono text-sm space-y-2">
          <p>H&M Dataset</p>
          <p className="text-indigo-600 ml-4">↓</p>
          <p>Product Images → CLIP (512-dim visual embeddings)</p>
          <p>Product Text → SBERT (384-dim semantic embeddings)</p>
          <p>User Transactions → SVD (collaborative filtering)</p>
          <p className="text-indigo-600 ml-4">↓</p>
          <p>Hybrid Recommendation Model</p>
          <p className="text-indigo-600 ml-4">Score = 0.7 × SVD + 0.3 × CLIP+SBERT</p>
          <p className="text-indigo-600 ml-4">↓</p>
          <p>Top-10 Recommendations</p>
          <p className="text-indigo-600 ml-4">↓</p>
          <p>React Web Application</p>
        </div>
      </section>
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Components</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <ComponentCard title="CLIP" desc="Extracts visual features from fashion product images using OpenAI's CLIP model (512-dimensional embeddings)." />
          <ComponentCard title="SBERT" desc="Extracts semantic features from product descriptions using Sentence-BERT (384-dimensional embeddings)." />
          <ComponentCard title="SVD" desc="Collaborative filtering based on 15M+ user-product interactions using matrix factorization (128 latent factors)." />
        </div>
      </section>
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Hybrid Model</h2>
        <p className="text-gray-600 mb-4">The hybrid score combines collaborative filtering with multimodal product similarity:</p>
        <div className="bg-gray-50 rounded-xl p-6 text-center font-mono text-lg">
          <span className="text-indigo-600 font-bold">0.7</span> × <span className="font-medium">SVD Collaborative Score</span>
          <br />
          <span className="text-indigo-600 font-bold">+ 0.3</span> × <span className="font-medium">CLIP + SBERT Content Similarity</span>
        </div>
        <p className="text-gray-500 text-sm mt-4">Both scores are independently min-max normalized before combination.</p>
      </section>
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Evaluation Results (for demo/viva)</h2>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200">
            <thead className="bg-gray-100"><tr><th className="border p-2">Dataset</th><th className="border p-2">Precision@10</th><th className="border p-2">Recall@10</th><th className="border p-2">NDCG@10</th><th className="border p-2">Hybrid vs SVD</th></tr></thead>
            <tbody>
              <tr><td className="border p-2">Validation</td><td className="border p-2">0.0026</td><td className="border p-2">0.0155</td><td className="border p-2">0.0095</td><td className="border p-2 text-red-600">-25% to -58%</td></tr>
              <tr className="bg-green-50"><td className="border p-2">Test (Full)</td><td className="border p-2">0.0047</td><td className="border p-2">0.0420</td><td className="border p-2">0.0253</td><td className="border p-2 text-green-600">+19% to +50%</td></tr>
              <tr><td className="border p-2">Test (Sparse)</td><td className="border p-2">0.0092</td><td className="border p-2">0.0922</td><td className="border p-2">0.0562</td><td className="border p-2 text-green-600">+13% to +17%</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">These metrics are for evaluation purposes only and not shown to regular users.</p>
      </section>
    </div>
  );
}

function ComponentCard({ title, desc }) {
  return (
    <div className="border rounded-xl p-4">
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}