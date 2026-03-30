import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router";
import api from "../utils/api";
import { X, Upload, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const NewClaim = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileType, setFileType] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    description: "",
    business_purpose: "",
    category: "Meals",
  });

  const categories = [
    "Meals",
    "Transport",
    "Lodging",
    "Office Supplies",
    "Travel",
    "Other",
  ];

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    try {
      if (file) {
        setFile(file);
        setPreview(URL.createObjectURL(file));
        if (file.type.startsWith("image/")) {
          setFileType("image");
        } else if (file.type.startsWith("application/")) {
          setFileType("pdf");
        }
      }
    } catch (err) {
      console.log(err);
      setPreview(null);
      setFile(null);
      setFileType("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "application/pdf": [],
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const createClaim = async () => {
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please upload a receipt image.");
      return;
    }
    if (!formData.business_purpose) {
      setError("Please provide a business purpose.");
      return;
    }

    setLoading(true);
    try {
      const formPayLoad = new FormData();
      formPayLoad.append("description", formData.description);
      formPayLoad.append("business_purpose", formData.business_purpose);
      formPayLoad.append("category", formData.category);
      formPayLoad.append("file", file);

      const response = await api.post("/claims/", formPayLoad);
      console.log(response);
      setSuccess("Claim submitted successfully! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to submit claim. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 md:mt-20 flex flex-col gap-4 items-center h-full px-4">
      <h1 className="self-start text-4xl font-bold text-accent">
        Create New Claim
      </h1>

      {error && (
        <div className="login-error w-full max-w-xl">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="login-success w-full max-w-xl">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {!file && (
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-gray-400 bg-gray-100 hover:bg-gray-200 px-8 py-12 flex flex-col justify-center items-center rounded-2xl w-full max-w-xl cursor-pointer transition-colors"
        >
          <input {...getInputProps()} accept="image/jpeg,image/png,application/pdf" />
          <Upload size={48} className="text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-primary font-medium">Drop the file here...</p>
          ) : (
            <div className="text-center">
              <p className="font-medium text-gray-700">
                Drag & drop your receipt here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse (JPG, PNG, PDF)
              </p>
            </div>
          )}
        </div>
      )}

      <div className="relative w-[200px]">
        {file && preview && fileType === "image" && (
          <img src={preview} className="w-full rounded-lg shadow-md" />
        )}
        {file && preview && fileType === "pdf" && (
          <iframe src={preview} className="h-[300px] w-[200px] rounded-lg" />
        )}
        {file && (
          <button
            onClick={() => {
              setFile(null);
              setPreview(null);
              setFileType("");
            }}
            className="absolute z-10 cursor-pointer top-[-8px] right-[-8px] bg-red-500 text-white rounded-full p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {file && (
        <div className="w-full max-w-xl flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Business Purpose <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="business_purpose"
              value={formData.business_purpose}
              onChange={handleChange}
              placeholder="e.g., Client lunch meeting, Team building..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Description
            </label>
            <textarea
              className="w-full h-[120px] border border-gray-300 rounded-lg px-3 py-2"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Give a brief description of the expense..."
            />
          </div>

          <button
            onClick={createClaim}
            disabled={loading}
            className="bg-accent rounded-full px-6 py-3 cursor-pointer text-white hover:bg-accent/80 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload size={18} />
                Submit Claim
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default NewClaim;