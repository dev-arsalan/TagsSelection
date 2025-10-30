import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [highlights, setHighlights] = useState({});
  const allHighlights = Object.values(highlights).flat().map(h => h.text);

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
      }
      
      reader.onerror = () => {
        alert(`Error reading file: ${file.name}`)
      }
      
      reader.readAsText(file)
    });

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
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // Get the original file content
    const originalText = file.content;

    // Simple approach: Find all occurrences of the selected text in the original content
    // and use the first one that doesn't overlap with existing highlights
    const occurrences = [];
    let startIndex = 0;


    let positions = [];
    let index = originalText.indexOf(selectedText);

    while (index !== -1) {
      positions.push(index);
      index = originalText.indexOf(selectedText, index + selectedText.length);
    }

    console.log(`Count of "${selectedText}":`, positions.length);
    console.log(`Positions:`, positions);
    
    if(positions.length === 1){
      console.log('single');
      while (startIndex < originalText.length) {
        const index = originalText.indexOf(selectedText, startIndex);
  
  
  
        if (index === -1) break;
        
        occurrences.push({
          start: index,
          end: index + selectedText.length,
          text: selectedText
        });
        
        startIndex = index + 1;
      }
    } else {
      console.log('more');
      const contentElement = document.getElementById(`file-content-${fileId}`);
      if (!contentElement) return;

      // Get the selected range
      const range = selection.getRangeAt(0);

      // Create a temporary range covering the whole content
      const preRange = document.createRange();
      preRange.selectNodeContents(contentElement);
      preRange.setEnd(range.startContainer, range.startOffset);

      // Get start and end positions (relative to the full text)
      const start = preRange.toString().length;
      const end = start + selectedText.length;

      console.log(`Selected text: "${selectedText}"`);
      console.log(`Start position: ${start}, End position: ${end}`);
      occurrences.push({
        start: start,
        end: end,
        text: selectedText
      });
    }
    

    // Filter out occurrences that overlap with existing highlights
    const existingHighlights = highlights[fileId] || [];
    const validOccurrences = occurrences.filter(occurrence => {
      return !existingHighlights.some(existing => 
        (occurrence.start >= existing.start && occurrence.start < existing.end) ||
        (occurrence.end > existing.start && occurrence.end <= existing.end) ||
        (occurrence.start <= existing.start && occurrence.end >= existing.end)
      );
    });

    if (validOccurrences.length === 0) {
      alert("This text overlaps with existing highlights or cannot be found!");
      selection.removeAllRanges();
      return;
    }

    // Use the first valid occurrence
    const newHighlight = validOccurrences[0];

    // Check for exact duplicates
    const isDuplicate = existingHighlights.some(
      h => h.text === newHighlight.text
    );

    if (isDuplicate) {
      alert("This exact text selection already exists!");
      selection.removeAllRanges();
      return;
    }

    // Add highlight
    setHighlights((prev) => ({
      ...prev,
      [fileId]: [...existingHighlights, newHighlight],
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

  // Generate combined query based on file and text order
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

    // Sort highlights by start position
    const sortedHighlights = [...fileHighlights].sort((a, b) => a.start - b.start);
    
    let parts = [];
    let lastIndex = 0;

    sortedHighlights.forEach((hl, idx) => {
      // Add text before highlight
      if (hl.start > lastIndex) {
        parts.push(text.slice(lastIndex, hl.start));
      }
      
      // Add highlighted text
      parts.push(
        <span key={idx} className="highlight">
          {hl.text}
          <button
            className="remove-hl"
            onClick={(e) => {
              e.stopPropagation();
              // Find the actual index in the original array
              const originalIndex = highlights[fileId].findIndex(
                h => h.start === hl.start && h.end === hl.end
              );
              if (originalIndex !== -1) {
                removeHighlight(fileId, originalIndex);
              }
            }}
          >
            ×
          </button>
        </span>
      );
      lastIndex = hl.end;
    });

    // Add remaining text after last highlight
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

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