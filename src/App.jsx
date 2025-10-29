import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [highlights, setHighlights] = useState({}); // { fileId: [{ start, end, text }] }
  const allHighlights = Object.values(highlights).flat().map(h => h.text);
  // const combinedQuery = allHighlights.join(' ');

  // Refs for scrolling
  const filesGridRef = useRef(null);
  const queryBuilderRef = useRef(null);

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

    const newFiles = [];

    validFiles.forEach(file => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          content: e.target.result,
          size: file.size,
          uploadTime: new Date().toLocaleTimeString()
        };
        
        setFiles(prevFiles => [...prevFiles, newFile]);
        newFiles.push(newFile);
      }
      
      reader.onerror = () => {
        alert(`Error reading file: ${file.name}`)
      }
      
      reader.readAsText(file)
    });

    // Scroll to files grid after processing
    setTimeout(() => {
      if (filesGridRef.current) {
        filesGridRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  }

  const clearAllFiles = () => {
    setFiles([])
    setHighlights({})
  }

  const handleTextSelection = (fileId) => {
    const selection = window.getSelection();
    let currentText = selection.toString().split('');
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
  
    const range = selection.getRangeAt(0);
    const file = files.find(f => f.id === fileId);
    if (!file) return;
  
    // Find the container that holds the text content of this file
    const contentEl = document.getElementById(`file-content-${fileId}`);
    if (!contentEl) {
      console.error(`No file content element found for fileId: ${fileId}`);
      return;
    }
  
    // Compute exact start index relative to the container text
    const preCaretRange = range.cloneRange();
    console.log(preCaretRange);
    console.log(contentEl);
    console.log(range.startContainer);
    console.log(range.startOffset);
    preCaretRange.selectNodeContents(contentEl);
    let startIndex;
    if(range.startOffset == 0){
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      startIndex = preCaretRange.toString().length;
    } else if(currentText[0] === ' '){
      preCaretRange.setEnd(range.startContainer, range.startOffset - 1);
      startIndex = preCaretRange.toString().length + 1;
    } else if(range.startOffset == 1){
      preCaretRange.setEnd(range.startContainer, range.startOffset - 1);
      startIndex = preCaretRange.toString().length;
    } else {
      preCaretRange.setEnd(range.startContainer, range.startOffset - 1);
      startIndex = preCaretRange.toString().length;
    }
    // preCaretRange.setEnd(range.startContainer, range.startOffset == 0 ? range.startOffset: currentText[0] === ' ' ? range.startOffset - 1: range.startOffset - 2);
    // const startIndex = preCaretRange.toString().length + 1;
    console.log(startIndex);
    const endIndex = startIndex + selectedText.length;
    
  
    const newHighlight = {
      start: startIndex,
      end: endIndex,
      text: selectedText,
    };
    console.log(highlights);
    console.log(newHighlight);
  
    // ✅ Prevent overlapping or duplicate highlights
    const existing = highlights[fileId] || [];
    const isDuplicate = existing.some(
      (h) => h.text === newHighlight.text
    );
    const overlap = existing.some(
      (h) =>
        (newHighlight.start >= h.start && newHighlight.start < h.end) ||
        (newHighlight.end > h.start && newHighlight.end <= h.end) ||
        (newHighlight.start <= h.start && newHighlight.end >= h.end)
    );
  
    if (isDuplicate) {
      alert("This exact text selection already exists!");
      selection.removeAllRanges();
      return;
    }
    if (overlap) {
      alert("This text overlaps an existing highlight!");
      selection.removeAllRanges();
      return;
    }
  
    // Add highlight
    setHighlights((prev) => ({
      ...prev,
      [fileId]: [...existing, newHighlight],
    }));
  
    selection.removeAllRanges();
  
    setTimeout(() => {
      if (queryBuilderRef.current) {
        queryBuilderRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };
  
  // ✅ Generate combined query based on file and text order
  const getOrderedCombinedQuery = () => {
    const orderedTexts = [];
  
    files.forEach((file) => {
      const fileHighlights = (highlights[file.id] || []).sort(
        (a, b) => a.start - b.start
      );
      fileHighlights.forEach((h) => orderedTexts.push(h.text));
    });
  
    return orderedTexts.join(" ");
  };

  const removeHighlight = (fileId, index) => {
    setHighlights(prev => ({
      ...prev,
      [fileId]: prev[fileId].filter((_, i) => i !== index),
    }));
  };

  const renderHighlightedText = (fileId, text) => {
    const fileHighlights = highlights[fileId] || [];
    if (fileHighlights.length === 0) return text;

    let parts = [];
    let lastIndex = 0;

    fileHighlights.forEach((hl, idx) => {
      parts.push(text.slice(lastIndex, hl.start));
      parts.push(
        <span key={idx} className="highlight">
          {hl.text}
          <button
            className="remove-hl"
            onClick={() => removeHighlight(fileId, idx)}
          >
            ×
          </button>
        </span>
      );
      lastIndex = hl.end;
    });

    parts.push(text.slice(lastIndex));
    return parts;
  };

  const combinedQuery = getOrderedCombinedQuery();
  
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">📚 Text File Reader & Selection Query Builder</h1>
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
        <section className="files-grid" ref={filesGridRef}>
          {files.map((file) => {
            const stats = {
              words: file.content.split(/\s+/).filter(Boolean).length,
              characters: file.content.length,
              lines: file.content.split('\n').length,
            };
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
                    onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))} 
                    className="remove-btn"
                  >
                    ×
                  </button>
                </div>

                <div className="stats-bar">
                  <div className="stat-item"><span>Words</span> {stats.words}</div>
                  <div className="stat-item"><span>Chars</span> {stats.characters}</div>
                  <div className="stat-item"><span>Lines</span> {stats.lines}</div>
                </div>

                <div className="content-preview">
                  <h5>Content Preview:</h5>
                  <div className="content-scroll" onMouseUp={() => handleTextSelection(file.id)}>
                    <p className="file-content" id={`file-content-${file.id}`}>
                      {renderHighlightedText(file.id, file.content)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

        {/* Query Builder Section */}
        {allHighlights.length > 0 && (
        <section className="query-builder" ref={queryBuilderRef}>
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