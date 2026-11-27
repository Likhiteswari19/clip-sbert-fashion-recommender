import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">AI-Powered Fashion Recommendations</h1>
        <p className="text-lg text-indigo-100 mb-8">Discover styles matched to your taste using CLIP, SBERT and collaborative filtering</p>
        <Link to="/recommendations" className="bg-white text-indigo-600 px-8 py-3 rounded-full font-medium hover:bg-gray-100 transition">Get Started</Link>
      </div>
    </div>
  );
}