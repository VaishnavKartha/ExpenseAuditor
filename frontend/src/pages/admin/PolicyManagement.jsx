import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  FileText,
  Filter,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export default function PolicyManagement() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: "Meals",
    region: "all",
    rule_text: "",
    constraints: {
      max_amount: null,
      prohibited_items: [],
      allowed_days: [],
    },
    source_page: null,
  });
  const [prohibitedInput, setProhibitedInput] = useState("");
  const [daysInput, setDaysInput] = useState("");

  const categories = [
    "Meals",
    "Transport",
    "Lodging",
    "Office Supplies",
    "Travel",
    "Other",
  ];

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      const res = await api.get("/policies/", { params });
      setPolicies(res.data);
    } catch (err) {
      console.error("Failed to fetch policies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [filterCategory]);

  const resetForm = () => {
    setFormData({
      category: "Meals",
      region: "all",
      rule_text: "",
      constraints: { max_amount: null, prohibited_items: [], allowed_days: [] },
      source_page: null,
    });
    setProhibitedInput("");
    setDaysInput("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (policy) => {
    setFormData({
      category: policy.category,
      region: policy.region,
      rule_text: policy.rule_text,
      constraints: {
        max_amount: policy.constraints?.max_amount || null,
        prohibited_items: policy.constraints?.prohibited_items || [],
        allowed_days: policy.constraints?.allowed_days || [],
      },
      source_page: policy.source_page || null,
    });
    setProhibitedInput(
      (policy.constraints?.prohibited_items || []).join(", ")
    );
    setDaysInput((policy.constraints?.allowed_days || []).join(", "));
    setEditingId(policy._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...formData,
      constraints: {
        max_amount: formData.constraints.max_amount
          ? parseFloat(formData.constraints.max_amount)
          : null,
        prohibited_items: prohibitedInput
          ? prohibitedInput.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        allowed_days: daysInput
          ? daysInput.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      },
      source_page: formData.source_page
        ? parseInt(formData.source_page)
        : null,
    };

    try {
      if (editingId) {
        await api.put(`/policies/${editingId}`, payload);
      } else {
        await api.post("/policies/", payload);
      }
      resetForm();
      fetchPolicies();
    } catch (err) {
      console.error("Failed to save policy:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;
    try {
      await api.delete(`/policies/${id}`);
      fetchPolicies();
    } catch (err) {
      console.error("Failed to delete policy:", err);
    }
  };

  return (
    <div className="admin-dashboard policy-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">
            <FileText size={32} />
            Policy Management
          </h1>
          <p className="admin-subtitle">
            Manage expense policies and constraints
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="refresh-btn"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >
          <Plus size={18} />
          Add Policy
        </button>
      </div>

      {/* Category Filter */}
      <div className="admin-filters">
        <div className="filter-pills">
          <Filter size={16} />
          <button
            className={`filter-pill ${!filterCategory ? "active" : ""}`}
            onClick={() => setFilterCategory("")}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-pill ${filterCategory === cat ? "active" : ""}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="policy-form-overlay">
          <div className="policy-form-modal">
            <div className="modal-header">
              <h2>{editingId ? "Edit Policy" : "Create Policy"}</h2>
              <button onClick={resetForm} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="policy-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Region</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                    placeholder="all, London, New York..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Rule Text</label>
                <textarea
                  value={formData.rule_text}
                  onChange={(e) =>
                    setFormData({ ...formData, rule_text: e.target.value })
                  }
                  placeholder="Describe the policy rule in detail..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Amount</label>
                  <input
                    type="number"
                    value={formData.constraints.max_amount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        constraints: {
                          ...formData.constraints,
                          max_amount: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. 50"
                  />
                </div>
                <div className="form-group">
                  <label>Source Page</label>
                  <input
                    type="number"
                    value={formData.source_page || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        source_page: e.target.value,
                      })
                    }
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Prohibited Items (comma-separated)</label>
                <input
                  type="text"
                  value={prohibitedInput}
                  onChange={(e) => setProhibitedInput(e.target.value)}
                  placeholder="alcohol, beer, wine..."
                />
              </div>

              <div className="form-group">
                <label>Allowed Days (comma-separated)</label>
                <input
                  type="text"
                  value={daysInput}
                  onChange={(e) => setDaysInput(e.target.value)}
                  placeholder="Monday, Tuesday, Wednesday..."
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? (
                    <RefreshCw size={16} className="spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Policies List */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spin" />
          <p>Loading policies...</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="empty-state">
          <ShieldCheck size={48} />
          <p>No policies found. Create one to get started.</p>
        </div>
      ) : (
        <div className="policies-grid">
          {policies.map((policy) => (
            <div key={policy._id} className="policy-card">
              <div className="policy-card-header">
                <span className="category-tag">{policy.category}</span>
                <span className="region-tag">{policy.region}</span>
                <div className="policy-actions">
                  <button onClick={() => handleEdit(policy)} className="icon-btn">
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(policy._id)}
                    className="icon-btn icon-btn-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="policy-rule-text">{policy.rule_text}</p>
              <div className="policy-constraints">
                {policy.constraints?.max_amount && (
                  <span className="constraint-chip">
                    Max: £{policy.constraints.max_amount}
                  </span>
                )}
                {policy.constraints?.prohibited_items?.length > 0 && (
                  <span className="constraint-chip constraint-prohibited">
                    {policy.constraints.prohibited_items.length} prohibited
                  </span>
                )}
                {policy.constraints?.allowed_days?.length > 0 && (
                  <span className="constraint-chip">
                    {policy.constraints.allowed_days.length} allowed days
                  </span>
                )}
                {policy.source_page && (
                  <span className="constraint-chip">
                    Page {policy.source_page}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
