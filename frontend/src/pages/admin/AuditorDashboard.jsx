import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "../../utils/api";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";

export default function AuditorDashboard() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await api.get("/claims/");
      setClaims(res.data);
    } catch (err) {
      console.error("Failed to fetch claims:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const stats = {
    total: claims.length,
    approved: claims.filter((c) => c.final_status === "approved").length,
    flagged: claims.filter((c) => c.final_status === "flagged").length,
    rejected: claims.filter((c) => c.final_status === "rejected").length,
    pending: claims.filter((c) => c.final_status === "pending").length,
  };

  const filteredClaims = claims.filter((c) => {
    const matchesFilter = filter === "all" || c.final_status === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      (c.extracted_data?.vendor_name || "").toLowerCase().includes(searchLower) ||
      (c.employee_name || "").toLowerCase().includes(searchLower) ||
      (c.category || "").toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  const riskOrder = { high: 0, medium: 1, low: 2 };
  const sortedClaims = [...filteredClaims].sort((a, b) => {
    const rA = riskOrder[a.audit_result?.risk_level] ?? 3;
    const rB = riskOrder[b.audit_result?.risk_level] ?? 3;
    return rA - rB;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      approved: { class: "badge-approved", icon: <ShieldCheck size={14} />, label: "Approved" },
      flagged: { class: "badge-flagged", icon: <AlertTriangle size={14} />, label: "Flagged" },
      rejected: { class: "badge-rejected", icon: <XCircle size={14} />, label: "Rejected" },
      pending: { class: "badge-pending", icon: <Clock size={14} />, label: "Pending" },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`status-badge ${badge.class}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const getRiskBadge = (level) => {
    const badges = {
      high: "risk-high",
      medium: "risk-medium",
      low: "risk-low",
    };
    return (
      <span className={`risk-badge ${badges[level] || "risk-low"}`}>
        {level || "—"}
      </span>
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">
            <TrendingUp size={32} />
            Audit Dashboard
          </h1>
          <p className="admin-subtitle">
            Review and manage all expense claims
          </p>
        </div>
        <button onClick={fetchClaims} className="refresh-btn" disabled={loading}>
          <RefreshCw size={18} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon"><Clock size={24} /></div>
          <div>
            <p className="stat-value">{stats.total}</p>
            <p className="stat-label">Total Claims</p>
          </div>
        </div>
        <div className="stat-card stat-approved">
          <div className="stat-icon"><ShieldCheck size={24} /></div>
          <div>
            <p className="stat-value">{stats.approved}</p>
            <p className="stat-label">Approved</p>
          </div>
        </div>
        <div className="stat-card stat-flagged">
          <div className="stat-icon"><AlertTriangle size={24} /></div>
          <div>
            <p className="stat-value">{stats.flagged}</p>
            <p className="stat-label">Flagged</p>
          </div>
        </div>
        <div className="stat-card stat-rejected">
          <div className="stat-icon"><XCircle size={24} /></div>
          <div>
            <p className="stat-value">{stats.rejected}</p>
            <p className="stat-label">Rejected</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by vendor, employee, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          <Filter size={16} />
          {["all", "pending", "flagged", "rejected", "approved"].map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Claims Table */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spin" />
          <p>Loading claims...</p>
        </div>
      ) : sortedClaims.length === 0 ? (
        <div className="empty-state">
          <ShieldCheck size={48} />
          <p>No claims found matching your filters.</p>
        </div>
      ) : (
        <div className="claims-table-wrapper">
          <table className="claims-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Date</th>
                <th>Risk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedClaims.map((claim) => (
                <tr
                  key={claim._id}
                  onClick={() => navigate(`/admin/claim/${claim._id}`)}
                  className="claims-row"
                >
                  <td className="td-employee">
                    <div className="employee-avatar">
                      {(claim.employee_name || "?")[0].toUpperCase()}
                    </div>
                    <span>{claim.employee_name || "Unknown"}</span>
                  </td>
                  <td className="td-vendor">
                    {claim.extracted_data?.vendor_name || "—"}
                  </td>
                  <td className="td-amount">
                    {claim.extracted_data?.currency || claim.currency || ""}{" "}
                    {claim.extracted_data?.total || claim.amount || 0}
                  </td>
                  <td>
                    <span className="category-tag">{claim.category || "—"}</span>
                  </td>
                  <td>{formatDate(claim.extracted_data?.date || claim.expense_date)}</td>
                  <td>{getRiskBadge(claim.audit_result?.risk_level)}</td>
                  <td>{getStatusBadge(claim.final_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
