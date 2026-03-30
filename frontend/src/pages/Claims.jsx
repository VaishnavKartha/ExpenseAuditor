import React, { useState, useEffect } from "react";
import api from "../utils/api";
import NoClaim from "../components/NoClaim";
import ClaimFeatures from "../components/ClaimFeatures";
import { RefreshCw } from "lucide-react";

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/claims/");
      setClaims(res.data);
    } catch (err) {
      console.error("Failed to fetch claims:", err);
      setError("Failed to load claims. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <RefreshCw size={32} className="spin text-primary" />
        <p className="mt-4 text-gray-500">Loading your claims...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchClaims}
          className="bg-primary text-white px-4 py-2 rounded-full"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-md:px-4">
      <h1 className="font-bold text-4xl">
        <span>My</span> <span className="text-primary">Claims</span>
      </h1>
      {claims.length === 0 ? (
        <NoClaim />
      ) : (
        <ClaimFeatures claims={claims} setClaims={setClaims} />
      )}
    </div>
  );
}