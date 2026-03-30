import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import api from "../utils/api";
import {
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

const ViewClaim = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [showItems, setShowItems] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const res = await api.get(`/claims/${id}`);
        setClaim(res.data);
      } catch (err) {
        console.error("Failed to fetch claim:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaim();
  }, [id]);

  const getStatusInfo = (status) => {
    const map = {
      approved: {
        icon: <ShieldCheck size={20} className="text-green-600" />,
        label: "Approved",
        class: "badge-approved",
      },
      flagged: {
        icon: <AlertTriangle size={20} className="text-yellow-600" />,
        label: "Flagged",
        class: "badge-flagged",
      },
      rejected: {
        icon: <XCircle size={20} className="text-red-600" />,
        label: "Rejected",
        class: "badge-rejected",
      },
      pending: {
        icon: <Clock size={20} className="text-gray-500" />,
        label: "Pending",
        class: "badge-pending",
      },
    };
    return map[status] || map.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <RefreshCw size={32} className="spin text-primary" />
        <p className="mt-4 text-gray-500">Loading claim details...</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <p className="text-red-500">Claim not found.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 bg-primary text-white px-4 py-2 rounded-full"
        >
          Back to Claims
        </button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(claim.final_status);

  return (
    <div className="p-4">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-primary mb-4 hover:underline cursor-pointer"
      >
        <ArrowLeft size={18} />
        Back to Claims
      </button>

      {/* Status Banner */}
      <div className={`status-badge ${statusInfo.class} inline-flex mb-6`}>
        {statusInfo.icon}
        <span className="font-semibold">{statusInfo.label}</span>
      </div>

      <div className="flex max-md:flex-col gap-4">
        {/* Receipt Image */}
        <section className="flex-1">
          <img
            src={`http://localhost:8000/${claim.receipt_image_url}`}
            alt="receipt"
            className="w-full max-h-[70vh] object-contain rounded-lg shadow-md"
          />
        </section>

        {/* Extracted Data */}
        <section className="flex-1 overflow-y-auto">
          <div className="view-section">
            <p className="headings">Merchant Name :</p>
            <p className="fake-input">
              {claim.extracted_data?.vendor_name || "—"}
            </p>
          </div>

          <div className="view-section">
            <p className="headings">Total :</p>
            <p className="fake-input">
              {claim.extracted_data?.total || "—"}
            </p>
          </div>

          <div className="view-section">
            <p className="headings">Currency :</p>
            <p className="fake-input">
              {claim.extracted_data?.currency || claim.currency || "—"}
            </p>
          </div>

          <div className="view-section">
            <p className="headings">Date :</p>
            <p className="fake-input">
              {claim.extracted_data?.date || claim.expense_date || "—"}
            </p>
          </div>

          {/* Items */}
          {claim.extracted_data?.items?.length > 0 && (
            <div>
              <p className="headings inline-flex justify-between w-full">
                Items{" "}
                <span
                  onClick={() => setShowItems(!showItems)}
                  className="cursor-pointer"
                >
                  {showItems ? <ChevronDown /> : <ChevronUp />}
                </span>
              </p>
              <ul
                className={`mx-4 flex flex-col gap-2 ${
                  showItems ? "block" : "hidden"
                }`}
              >
                {claim.extracted_data.items.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <div className="flex gap-2">
                      <p className="font-medium">Name :</p>
                      <p>{item.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <p className="font-medium">Qty :</p>
                      <p>{item.quantity}</p>
                    </div>
                    <div className="flex gap-2">
                      <p className="font-medium">Price :</p>
                      <p>{item.price}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="view-section">
            <p className="headings">Description :</p>
            <p className="fake-input">{claim.description || "—"}</p>
          </div>

          <div className="view-section">
            <p className="headings">Business Purpose :</p>
            <p className="fake-input">{claim.business_purpose || "—"}</p>
          </div>

          <div className="view-section">
            <p className="headings">Category :</p>
            <p className="fake-input">{claim.category || "—"}</p>
          </div>

          {/* Audit Result Section */}
          {claim.audit_result && (
            <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <ShieldCheck size={20} className="text-primary" />
                AI Audit Result
              </h3>

              <div className="view-section">
                <p className="headings">Status :</p>
                <span className={`status-badge ${getStatusInfo(claim.audit_result.status).class}`}>
                  {getStatusInfo(claim.audit_result.status).icon}
                  {claim.audit_result.status}
                </span>
              </div>

              <div className="view-section">
                <p className="headings">Risk Level :</p>
                <span className={`risk-badge risk-${claim.audit_result.risk_level}`}>
                  {claim.audit_result.risk_level}
                </span>
              </div>

              <div className="view-section">
                <p className="headings">Explanation :</p>
                <p className="fake-input">{claim.audit_result.explanation}</p>
              </div>

              {claim.audit_result.policy_snippet && (
                <div className="view-section">
                  <p className="headings">Policy Reference :</p>
                  <blockquote className="border-l-4 border-primary pl-3 italic text-gray-600">
                    {claim.audit_result.policy_snippet}
                  </blockquote>
                </div>
              )}

              {claim.audit_result.violations?.length > 0 && (
                <div className="view-section">
                  <p className="headings">Violations :</p>
                  <ul className="flex flex-col gap-1 mt-1">
                    {claim.audit_result.violations.map((v, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-red-600 text-sm"
                      >
                        <XCircle size={14} />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Override Info */}
          {claim.override && (
            <div className="mt-4 p-4 rounded-xl border border-orange-200 bg-orange-50">
              <h3 className="font-bold text-lg mb-2">Auditor Override</h3>
              <p>
                <strong>New Status:</strong> {claim.override.new_status}
              </p>
              <p>
                <strong>Comment:</strong> {claim.override.comment}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ViewClaim;