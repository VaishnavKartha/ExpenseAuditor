import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Clock, Check, X, Flag } from "lucide-react";
import Filters from "./Filters";

const ClaimFeatures = ({ claims = [], setClaims = () => {} }) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: "all",
    date: "latest",
    search: "",
  });

  const status = {
    pending: <Clock className="size-4" />,
    approved: <Check className="size-4 text-green-600" />,
    rejected: <X className="size-4 text-red-600" />,
    flagged: <Flag className="size-4 text-yellow-600" />,
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const filteredClaims = claims.filter((c) => {
    const matchesStatus =
      filters.status === "all" || c.final_status === filters.status;

    const vendorName = c.extracted_data?.vendor_name || c.description || "";
    const matchesSearch = vendorName
      .toLowerCase()
      .includes(filters.search.toLowerCase());



    return matchesStatus && matchesSearch;
  }).sort((a,b)=>{
    const dateA=new Date(a.created_at+'Z')
    const dateB=new Date(b.created_at+'Z')

    return filters.date==="latest" ? dateB-dateA : dateA-dateB
  });

  return (
    <div className="flex flex-col">
      <div className="w-full mt-8 md:px-8">
        <input
          className="w-full rounded-full px-4 py-4 outline-1 focus:outline-accent border border-gray-200"
          placeholder="Search claims by vendor name..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      <div>
        <Filters
          status={filters.status}
          setStatus={(value) => setFilters({ ...filters, status: value })}
          date={filters.date}
          setDate={(value) => setFilters({ ...filters, date: value })}
        />
      </div>

      <div>
        {filteredClaims.map((claim, index) => (
          <div
            key={claim._id || index}
            onClick={() => navigate(`/view/${claim._id}`)}
            className="max-md:text-[10px] flex justify-around items-center cursor-pointer bg-accent/10 mt-3 px-4 py-4 rounded-xl hover:bg-accent/20 transition-colors"
          >
            <img
              src={`http://localhost:8000/${claim.receipt_image_url}`}
              alt="receipt"
              className="w-10 h-10 rounded object-cover"
            />

            <div className="flex gap-4 items-center">
              
              <p className="text-gray-500">
                {formatDate(claim.created_at)}
              </p>


              <h3 className="font-semibold">
                {claim.extracted_data?.vendor_name || claim.description || "Unknown"}
              </h3>
            </div>

            <div className="text-right">
              <span className="flex items-center gap-1">
                {status[claim.final_status]}
                <span className="capitalize">{claim.final_status}</span>
              </span>
              <p className="font-semibold">
                {claim.extracted_data?.total || claim.amount || 0}{" "}
                {claim.extracted_data?.currency || claim.currency || ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClaimFeatures;