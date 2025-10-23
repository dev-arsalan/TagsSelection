import { useState } from 'react'
import './App.css'

function App() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [tags, setTags] = useState({}) // store tags per fileId
  const allTags = Object.values(tags).flat() // flatten tags from all files
  const combinedQuery = allTags.join(' ');
  const [fileContents, setFileContents] = useState({});

  const handleFileUpload = (event) => {
    const selectedFiles = Array.from(event.target.files)
    processFiles(selectedFiles)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(event.dataTransfer.files)
    const txtFiles = droppedFiles.filter(file => file.type === 'text/plain')
    
    if (txtFiles.length > 0) {
      processFiles(txtFiles)
    } else {
      alert('Please upload only .txt files')
    }
  }

  const processFiles = (fileList) => {
    const validFiles = fileList.filter(file => file.type === 'text/plain')
    
    if (validFiles.length === 0) {
      alert('Please upload only .txt files')
      return
    }

    validFiles.forEach(file => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        setFiles(prevFiles => [
          ...prevFiles,
          {
            id: Date.now() + Math.random(),
            name: file.name,
            content: e.target.result,
            size: file.size,
            uploadTime: new Date().toLocaleTimeString()
          }
        ])
      }
      
      reader.onerror = () => {
        alert(`Error reading file: ${file.name}`)
      }
      
      reader.readAsText(file)
    })
  }

  const removeFile = (fileId) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId))
  }

  const clearAllFiles = () => {
    setFiles([])
  }

  const getFileStats = (content) => {
    const words = content.split(/\s+/).filter(word => word.length > 0).length
    const characters = content.length
    const lines = content.split('\n').length
    return { words, characters, lines }
  }

  const handleTextSelection = (fileId) => {
    const selection = window.getSelection()
    const selectedText = selection.toString().trim()

    if (selectedText.length > 0) {
      setTags((prev) => {
        const fileTags = prev[fileId] || []
        // avoid duplicates
        if (fileTags.includes(selectedText)) return prev

        return {
          ...prev,
          [fileId]: [...fileTags, selectedText],
        }
      })
    }
  }

  const removeTag = (fileId, tagText) => {
    setTags((prev) => ({
      ...prev,
      [fileId]: prev[fileId].filter((tag) => tag !== tagText),
    }))
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">📚 Multiple Text File Reader</h1>
        <p className="app-subtitle">Upload multiple .txt files and explore their contents!</p>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Upload Section */}
        <section className="upload-section">
          <div 
            className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-content">
              <div className="upload-icon">📤</div>
              <h3>Drop your .txt files here</h3>
              <p>or click to browse multiple files</p>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="file-input"
                id="fileInput"
                multiple
              />
              <label htmlFor="fileInput" className="browse-btn">
                Choose Files
              </label>
            </div>
          </div>

          {/* Files Summary */}
          {files.length > 0 && (
            <div className="files-summary">
              <div className="summary-header">
                <h3>📋 Uploaded Files ({files.length})</h3>
                <button onClick={clearAllFiles} className="clear-all-btn">
                  Clear All
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Files Grid */}
        {files.length > 0 && (
          <section className="files-grid">
            {files.map((file) => {
              const stats = getFileStats(file.content);
              const fileTags = tags[file.id] || [];
              return (
                <div key={file.id} className="file-card">
                  <div className="card-header">
                    <div className="file-info">
                      <h4 className="file-name">📄 {file.name}</h4>
                      <p className="file-meta">
                        {Math.round(file.size / 1024)} KB • {file.uploadTime}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeFile(file.id)} 
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>

                  <div className="stats-bar">
                    <div className="stat-item">
                      <span className="stat-label">Words</span>
                      <span className="stat-value">{stats.words}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Chars</span>
                      <span className="stat-value">{stats.characters}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Lines</span>
                      <span className="stat-value">{stats.lines}</span>
                    </div>
                  </div>

                  <div className="content-preview">
                    <h5>Content Preview:</h5>
                    <div className="content-scroll" onMouseUp={() => handleTextSelection(file.id)}>
                      <p className="file-content">
                        {file.content}
                      </p>
                    </div>
                   
                  </div>
                  {/* --- New: Tag chips display --- */}
                  {fileTags.length > 0 && (
                    <div className="tags-section">
                      <h5>Selected Tags:</h5>
                      <div className="tags-container">
                        {fileTags.map((tag) => (
                          <span key={tag} className="tag-chip">
                            {tag}
                            <button
                              className="remove-tag"
                              onClick={() => removeTag(file.id, tag)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {/* --- Query Builder Section --- */}
        {allTags.length > 0 && (
          <section className="query-builder">
            <h3>🧠 Query Builder</h3>
            <p className="query-description">
              This combines all your selected tag chips from every file.
            </p>

            <div className="query-box">
              <textarea
                className="query-textarea"
                value={combinedQuery}
                readOnly
                rows={3}
              />

              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(combinedQuery)
                  alert('Query copied to clipboard ✅')
                }}
              >
                Copy Query
              </button>
            </div>
          </section>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <section className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No files uploaded yet</h3>
            <p>Upload some .txt files to get started!</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App