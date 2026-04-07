import React, { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
  Upload,
  CheckCircle,
  AlertCircle,
  Eye,
  FileUp,
  Sparkles,
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
      currency: "GBP",
      prohibited_items: [],
      allowed_days: [],
    },
    source_page: null,
  });
  const [prohibitedInput, setProhibitedInput] = useState("");
  const [daysInput, setDaysInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState("GBP");

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadFileType, setUploadFileType] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedPolicies, setExtractedPolicies] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const categories = [
    "Meals",
    "Transport",
    "Lodging",
    "Office Supplies",
    "Travel",
    "Other",
  ];

  const currencies = ["GBP", "USD", "EUR", "INR", "CAD", "AUD", "JPY"];

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
      constraints: {
        max_amount: null,
        currency: "GBP",
        prohibited_items: [],
        allowed_days: [],
      },
      source_page: null,
    });
    setProhibitedInput("");
    setDaysInput("");
    setCurrencyInput("GBP");
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
        currency: policy.constraints?.currency || "GBP",
        prohibited_items: policy.constraints?.prohibited_items || [],
        allowed_days: policy.constraints?.allowed_days || [],
      },
      source_page: policy.source_page || null,
    });
    setProhibitedInput(
      (policy.constraints?.prohibited_items || []).join(", ")
    );
    setDaysInput((policy.constraints?.allowed_days || []).join(", "));
    setCurrencyInput(policy.constraints?.currency || "GBP");
    setEditingId(policy._id || null);
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
        currency: currencyInput || "GBP",
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

  // ── Upload & extraction handlers ─────────────────────────

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
      if (file.type.startsWith("image/")) {
        setUploadFileType("image");
      } else {
        setUploadFileType("pdf");
      }
      setUploadError("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "application/pdf": [],
    },
    multiple: false,
  });

  const resetUpload = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadFileType("");
    setExtracting(false);
    setExtractedPolicies([]);
    setShowReview(false);
    setShowUploadModal(false);
    setUploadError("");
    setUploadSuccess("");
  };

  const handleExtract = async () => {
    if (!uploadFile) return;

    setExtracting(true);
    setUploadError("");

    try {
      const formPayload = new FormData();
      formPayload.append("file", uploadFile);

      const res = await api.post("/policies/upload", formPayload);
      const data = res.data;

      if (data.policies && data.policies.length > 0) {
        setExtractedPolicies(data.policies);
        setShowReview(true);
        setShowUploadModal(false);
        setUploadSuccess(data.message);
      } else {
        setUploadError(
          "No policies could be extracted from this document. Please try a clearer document."
        );
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setUploadError(
        typeof detail === "string"
          ? detail
          : "Failed to extract policies. Please try again."
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleEditExtracted = (policy, index) => {
    // Open the regular form pre-filled with extracted data
    setFormData({
      category: policy.category,
      region: policy.region,
      rule_text: policy.rule_text,
      constraints: {
        max_amount: policy.constraints?.max_amount || null,
        currency: policy.constraints?.currency || "GBP",
        prohibited_items: policy.constraints?.prohibited_items || [],
        allowed_days: policy.constraints?.allowed_days || [],
      },
      source_page: policy.source_page || null,
    });
    setProhibitedInput(
      (policy.constraints?.prohibited_items || []).join(", ")
    );
    setDaysInput((policy.constraints?.allowed_days || []).join(", "));
    setCurrencyInput(policy.constraints?.currency || "GBP");
    setEditingId(null); // It's a new policy, not editing existing
    setShowForm(true);

    // Remove from extracted list
    setExtractedPolicies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDiscardExtracted = (index) => {
    setExtractedPolicies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (extractedPolicies.length === 0) return;

    setSavingAll(true);
    let savedCount = 0;

    try {
      for (const policy of extractedPolicies) {
        const payload = {
          category: policy.category,
          region: policy.region || "all",
          rule_text: policy.rule_text,
          constraints: {
            max_amount: policy.constraints?.max_amount
              ? parseFloat(policy.constraints.max_amount)
              : null,
            currency: policy.constraints?.currency || "GBP",
            prohibited_items: policy.constraints?.prohibited_items || [],
            allowed_days: policy.constraints?.allowed_days || [],
          },
          source_page: policy.source_page
            ? parseInt(policy.source_page)
            : null,
        };
        await api.post("/policies/", payload);
        savedCount++;
      }

      setUploadSuccess(`Successfully saved ${savedCount} policies!`);
      setExtractedPolicies([]);
      setShowReview(false);
      fetchPolicies();
    } catch (err) {
      console.error("Failed to save policies:", err);
      setUploadError(
        `Saved ${savedCount} policies but failed on the rest. Please try saving remaining individually.`
      );
    } finally {
      setSavingAll(false);
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
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => {
              resetUpload();
              setShowUploadModal(true);
            }}
            className="refresh-btn"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <FileUp size={18} />
            Upload Document
          </button>
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
      </div>

      {/* Success / Error banners */}
      {uploadSuccess && (
        <div
          className="policy-banner policy-banner-success"
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "12px",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
            color: "#16a34a",
          }}
        >
          <CheckCircle size={20} />
          <span style={{ flex: 1 }}>{uploadSuccess}</span>
          <button
            onClick={() => setUploadSuccess("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

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

      {/* ── Upload Document Modal ──────────────────────────── */}
      {showUploadModal && (
        <div className="policy-form-overlay">
          <div className="policy-form-modal">
            <div className="modal-header">
              <h2
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Sparkles size={22} style={{ color: "#a855f7" }} />
                Upload Policy Document
              </h2>
              <button onClick={resetUpload} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
              <p
                style={{
                  color: "var(--color-text-muted)",
                  marginBottom: "1.25rem",
                  fontSize: "0.9rem",
                  lineHeight: "1.6",
                }}
              >
                Upload a policy document (PDF or image) and our AI will extract
                all expense policies automatically. You can review and edit each
                policy before saving.
              </p>

              {uploadError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "10px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                    color: "#ef4444",
                    fontSize: "0.875rem",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              {!uploadFile ? (
                <div
                  {...getRootProps()}
                  style={{
                    border: "2px dashed",
                    borderColor: isDragActive ? "#a855f7" : "var(--color-border)",
                    background: isDragActive
                      ? "rgba(168, 85, 247, 0.05)"
                      : "var(--color-surface-alt, rgba(255,255,255,0.03))",
                    borderRadius: "16px",
                    padding: "3rem 2rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input {...getInputProps()} />
                  <Upload
                    size={48}
                    style={{
                      color: isDragActive ? "#a855f7" : "var(--color-text-muted)",
                      marginBottom: "1rem",
                    }}
                  />
                  {isDragActive ? (
                    <p
                      style={{
                        color: "#a855f7",
                        fontWeight: 600,
                        fontSize: "1rem",
                      }}
                    >
                      Drop the document here...
                    </p>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontWeight: 600,
                          color: "var(--color-text)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Drag & drop your policy document here
                      </p>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        or click to browse (PDF, JPG, PNG)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  {/* File preview */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      maxWidth: "280px",
                    }}
                  >
                    {uploadFileType === "image" ? (
                      <img
                        src={uploadPreview}
                        alt="Policy document"
                        style={{
                          width: "100%",
                          borderRadius: "12px",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "2rem",
                          background: "var(--color-surface-alt, rgba(255,255,255,0.05))",
                          borderRadius: "12px",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <FileText
                          size={48}
                          style={{ color: "#a855f7", marginBottom: "0.75rem" }}
                        />
                        <p
                          style={{
                            fontWeight: 500,
                            fontSize: "0.9rem",
                            wordBreak: "break-all",
                            textAlign: "center",
                          }}
                        >
                          {uploadFile.name}
                        </p>
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-muted)",
                            marginTop: "0.25rem",
                          }}
                        >
                          {(uploadFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview(null);
                        setUploadFileType("");
                      }}
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Extract button */}
                  <button
                    onClick={handleExtract}
                    disabled={extracting}
                    style={{
                      background: extracting
                        ? "var(--color-text-muted)"
                        : "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      padding: "0.85rem 2rem",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      cursor: extracting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "all 0.2s ease",
                      width: "100%",
                      justifyContent: "center",
                    }}
                  >
                    {extracting ? (
                      <>
                        <RefreshCw size={18} className="spin" />
                        Extracting policies...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Extract Policies
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Extracted Policies Review ───────────────────────── */}
      {showReview && extractedPolicies.length > 0 && (
        <div
          style={{
            background: "var(--color-surface, rgba(255,255,255,0.05))",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Sparkles size={22} style={{ color: "#a855f7" }} />
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                  fontWeight: 700,
                }}
              >
                Extracted Policies
              </h2>
              <span
                style={{
                  background: "rgba(168, 85, 247, 0.15)",
                  color: "#a855f7",
                  padding: "0.2rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {extractedPolicies.length} found
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleSaveAll}
                disabled={savingAll}
                style={{
                  background: "var(--color-primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0.6rem 1.25rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: savingAll ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                {savingAll ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save All ({extractedPolicies.length})
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowReview(false);
                  setExtractedPolicies([]);
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "10px",
                  padding: "0.6rem 1.25rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <X size={14} />
                Discard All
              </button>
            </div>
          </div>

          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.85rem",
              marginBottom: "1rem",
              lineHeight: 1.5,
            }}
          >
            Review the extracted policies below. Click <strong>Edit</strong> to
            modify a policy before saving, or <strong>Discard</strong> to remove
            it. Use <strong>Save All</strong> to save all remaining policies at
            once.
          </p>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            }}
          >
            {extractedPolicies.map((policy, index) => (
              <div
                key={index}
                style={{
                  background: "var(--color-card-bg, rgba(255,255,255,0.03))",
                  border: "1px solid var(--color-border)",
                  borderRadius: "14px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span className="category-tag">{policy.category}</span>
                    <span className="region-tag">{policy.region}</span>
                    {policy.constraints?.currency && (
                      <span
                        style={{
                          background: "rgba(168, 85, 247, 0.12)",
                          color: "#a855f7",
                          padding: "0.15rem 0.6rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        {policy.constraints.currency}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button
                      onClick={() => handleEditExtracted(policy, index)}
                      className="icon-btn"
                      title="Edit before saving"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDiscardExtracted(index)}
                      className="icon-btn icon-btn-danger"
                      title="Discard this policy"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Rule text */}
                <p
                  className="policy-rule-text"
                  style={{
                    fontSize: "0.85rem",
                    lineHeight: 1.6,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {policy.rule_text}
                </p>

                {/* Constraints */}
                <div className="policy-constraints">
                  {policy.constraints?.max_amount && (
                    <span className="constraint-chip">
                      Max: {policy.constraints.currency === "GBP" ? "£" : policy.constraints.currency === "USD" ? "$" : policy.constraints.currency === "INR" ? "₹" : policy.constraints.currency === "EUR" ? "€" : ""}{policy.constraints.max_amount}
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
        </div>
      )}

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
                  <label>Currency</label>
                  <select
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
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
