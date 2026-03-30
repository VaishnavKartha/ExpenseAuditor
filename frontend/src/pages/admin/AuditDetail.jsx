import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import api from "../../utils/api";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
} from "lucide-react";

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showItems, setShowItems] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState("approved");
  const [overrideComment, setOverrideComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState("");

  useEffect(() => {
    fetchClaim();
  }, [id]);

  const fetchClaim = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/claims/${id}`);
      setClaim(res.data);
    } catch (err) {
      console.error("Failed to fetch claim:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideComment.trim()) return;
    setSubmitting(true);
    try {
      await api.put(`/claims/${id}/override`, {
        new_status: overrideStatus,
        comment: overrideComment,
      });
      setOverrideSuccess("Override submitted successfully!");
      setOverrideComment("");
      fetchClaim();
    } catch (err) {
      console.error("Override failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      approved: { class: "badge-approved", icon: <ShieldCheck size={16} />, label: "Approved" },
      flagged: { class: "badge-flagged", icon: <AlertTriangle size={16} />, label: "Flagged" },
      rejected: { class: "badge-rejected", icon: <XCircle size={16} />, label: "Rejected" },
      pending: { class: "badge-pending", icon: <Clock size={16} />, label: "Pending" },
    };
    const badge = map[status] || map.pending;
    return (
      <span className={`status-badge ${badge.class}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={32} className="spin" />
        <p>Loading claim details...</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="empty-state">
        <p>Claim not found.</p>
        <button onClick={() => navigate("/admin")} className="back-btn">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { extracted_data, audit_result } = claim;

  return (
    <div className="audit-detail">
      <button onClick={() => navigate("/admin")} className="back-btn">
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      <div className="audit-detail-header">
        <h1>Audit Detail</h1>
        <div className="audit-detail-meta">
          {getStatusBadge(claim.final_status)}
          {claim.override && (
            <span className="override-badge">
              Overridden
            </span>
          )}
        </div>
      </div>

      <div className="audit-detail-grid">
        {/* Left: Receipt Image */}
        <div className="audit-receipt-panel">
          <h2 className="panel-title">
            <FileText size={20} />
            Receipt Image
          </h2>
          <div className="receipt-image-wrapper">
            <img
              src={`http://localhost:8000/${claim.receipt_image_url}`}
              alt="Receipt"
              className="receipt-image"
            />
          </div>
        </div>

        {/* Right: Details */}
        <div className="audit-info-panel">
          {/* Extracted Data */}
          <div className="info-card">
            <h2 className="panel-title">Extracted Data</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Vendor</label>
                <p>{extracted_data?.vendor_name || "—"}</p>
              </div>
              <div className="info-item">
                <label>Total</label>
                <p>
                  {extracted_data?.currency || ""} {extracted_data?.total || "—"}
                </p>
              </div>
              <div className="info-item">
                <label>Date</label>
                <p>{extracted_data?.date || "—"}</p>
              </div>
              <div className="info-item">
                <label>Category</label>
                <p>{claim.category || "—"}</p>
              </div>
            </div>

            {/* Items */}
            {extracted_data?.items?.length > 0 && (
              <div className="items-section">
                <button
                  className="items-toggle"
                  onClick={() => setShowItems(!showItems)}
                >
                  Items ({extracted_data.items.length})
                  {showItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showItems && (
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extracted_data.items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="info-grid" style={{ marginTop: "16px" }}>
              <div className="info-item">
                <label>Business Purpose</label>
                <p>{claim.business_purpose || "—"}</p>
              </div>
              <div className="info-item">
                <label>Description</label>
                <p>{claim.description || "—"}</p>
              </div>
            </div>
          </div>

          {/* AI Audit Result */}
          {audit_result && (
            <div className="info-card audit-result-card">
              <h2 className="panel-title">
                <ShieldCheck size={20} />
                AI Audit Result
              </h2>
              <div className="audit-verdict">
                {getStatusBadge(audit_result.status)}
                <span className={`risk-badge risk-${audit_result.risk_level}`}>
                  Risk: {audit_result.risk_level}
                </span>
              </div>
              <div className="audit-explanation">
                <label>Explanation</label>
                <p>{audit_result.explanation}</p>
              </div>
              {audit_result.policy_snippet && (
                <div className="policy-snippet">
                  <label>Policy Reference</label>
                  <blockquote>{audit_result.policy_snippet}</blockquote>
                </div>
              )}
              {audit_result.violations?.length > 0 && (
                <div className="violations-list">
                  <label>Violations</label>
                  <ul>
                    {audit_result.violations.map((v, i) => (
                      <li key={i}>
                        <XCircle size={14} />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Override */}
          {claim.override && (
            <div className="info-card override-card">
              <h2 className="panel-title">Previous Override</h2>
              <p>
                <strong>Status:</strong> {claim.override.new_status}
              </p>
              <p>
                <strong>Comment:</strong> {claim.override.comment}
              </p>
              <p className="override-time">
                {new Date(claim.override.overridden_at).toLocaleString()}
              </p>
            </div>
          )}

          {/* Override Form */}
          <div className="info-card override-form-card">
            <h2 className="panel-title">Override Decision</h2>
            {overrideSuccess && (
              <div className="login-success" style={{marginBottom: 12}}>
                <ShieldCheck size={16} />
                <span>{overrideSuccess}</span>
              </div>
            )}
            <div className="override-form">
              <div className="form-group">
                <label>New Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="override-select"
                >
                  <option value="approved">Approved</option>
                  <option value="flagged">Flagged</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="form-group">
                <label>Comment</label>
                <textarea
                  value={overrideComment}
                  onChange={(e) => setOverrideComment(e.target.value)}
                  placeholder="Explain your override decision..."
                  className="override-textarea"
                  rows={3}
                />
              </div>
              <button
                onClick={handleOverride}
                disabled={submitting || !overrideComment.trim()}
                className="override-submit-btn"
              >
                {submitting ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <Send size={16} />
                )}
                Submit Override
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
