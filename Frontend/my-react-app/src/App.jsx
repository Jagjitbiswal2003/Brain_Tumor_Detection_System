// App.jsx
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");
  const [prediction, setPrediction] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);

  // Cleanup preview URL when component unmounts or when preview changes
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Handle new file selection (from input or drag & drop)
  const handleNewFile = (file) => {
    // Validate file
    if (!file || !file.type.includes("image")) {
      setError("Please upload a valid image file (JPEG, PNG, etc.)");
      return;
    }

    // Clean up old preview URL to prevent memory leaks
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setFileName(file.name.length > 40 ? file.name.substring(0, 37) + "..." : file.name);
    setPrediction("");
    setConfidence(null);
  };

  // Handle image selection via file input
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleNewFile(file);
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleNewFile(file);
    }
  };

  // Handle prediction submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!image) {
      setError("Please upload an MRI image first");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", image);

      const response = await axios.post(
        "https://pamperer-voltage-barrette.ngrok-free.dev/predict",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      setPrediction(response.data.prediction);
      setConfidence(response.data.confidence);
    } catch (err) {
      console.error("Prediction error:", err);
      if (err.code === "ECONNABORTED") {
        setError("Request timeout. Backend may be slow or offline.");
      } else if (err.response) {
        setError(`Server error: ${err.response.status}. Please try again.`);
      } else if (err.request) {
        setError("Backend server is not responding. Please check if it's running.");
      } else {
        setError("Prediction failed. Backend may be offline.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle image deletion
  const handleDelete = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setImage(null);
    setPreview(null);
    setFileName("");
    setPrediction("");
    setConfidence(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Get color class for tumor type (for UI enhancement)
  const getPredictionColor = () => {
    if (!prediction) return "";
    const lowerPred = prediction.toLowerCase();
    if (lowerPred.includes("no tumor") || lowerPred.includes("normal")) {
      return "result-success";
    }
    if (lowerPred.includes("glioma")) return "result-glioma";
    if (lowerPred.includes("meningioma")) return "result-meningioma";
    if (lowerPred.includes("pituitary")) return "result-pituitary";
    return "result-default";
  };

  // Format confidence value
  const formatConfidence = (conf) => {
    if (conf === null || conf === undefined) return "N/A";
    return typeof conf === "number" ? conf.toFixed(2) : parseFloat(conf).toFixed(2);
  };

  return (
    <div className="app">
      <div className="bg-gradient"></div>
      <div className="card">
        <div className="card-header">
          <div className="icon-brain">🧠</div>
          <h1>Brain Tumor Detection</h1>
          <p className="subtitle">AI-Powered MRI Analysis</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Upload Zone */}
          <div
            className={`upload-zone ${isDragging ? "dragging" : ""} ${preview ? "has-image" : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
              hidden
            />
            
            {!preview ? (
              <div className="upload-placeholder">
                <div className="upload-icon">📷</div>
                <p>Drag & drop MRI image here</p>
                <span className="upload-browse">or click to browse</span>
                <small className="upload-hint">Supports JPEG, PNG, DICOM, etc.</small>
              </div>
            ) : (
              <div className="preview-container">
                <img src={preview} alt="MRI Preview" className="preview-image" />
                <div className="file-info">
                  <span className="file-name">📄 {fileName}</span>
                  <button
                    type="button"
                    className="change-image-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={loading}
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="button-group">
            <button
              type="submit"
              className="predict-btn"
              disabled={!image || loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Analyzing...
                </>
              ) : (
                "🔍 Predict Tumor"
              )}
            </button>

            <button
              type="button"
              className="delete-btn"
              disabled={!image || loading}
              onClick={handleDelete}
            >
              🗑️ Delete Image
            </button>
          </div>
        </form>

        {/* Result Section */}
        {prediction && (
          <div className={`result-card ${getPredictionColor()}`}>
            <div className="result-header">
              <span className="result-icon">📊</span>
              <h2>Analysis Result</h2>
            </div>
            <div className="result-content">
              <div className="result-row">
                <span className="result-label">Tumor Type:</span>
                <span className="result-value prediction-text">{prediction}</span>
              </div>
              
              {confidence !== null && confidence !== undefined && (
                <div className="confidence-section">
                  <div className="result-row">
                    <span className="result-label">Confidence:</span>
                    <span className="result-value">{formatConfidence(confidence)}%</span>
                  </div>
                  <div className="confidence-bar-container">
                    <div 
                      className="confidence-bar-fill"
                      style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="info-footer">
          <p>⚡ Powered by Deep Learning Model</p>
          <p className="disclaimer">For medical professional use only</p>
        </div>
      </div>
    </div>
  );
}

export default App;