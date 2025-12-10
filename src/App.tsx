import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import mermaid from "mermaid";
import "./App.css";

function App() {
  const [mermaidCode, setMermaidCode] = useState("");
  const [error, setError] = useState("");
  const [renderError, setRenderError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);

  // 初始化Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      fontFamily: "monospace",
      fontSize: 16,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis"
      }
    });
  }, []);

  // 渲染Mermaid图表
  useEffect(() => {
    if (mermaidCode && mermaidRef.current) {
      renderMermaid();
    }
  }, [mermaidCode]);

  const renderMermaid = async () => {
    if (!mermaidRef.current) return;
    
    try {
      setRenderError("");
      // 清空容器
      mermaidRef.current.innerHTML = "";
      
      // 生成唯一ID
      const id = `mermaid-${Date.now()}`;
      
      // 验证并渲染图表
      const isValid = await mermaid.parse(mermaidCode);
      if (isValid) {
        const { svg } = await mermaid.render(id, mermaidCode);
        mermaidRef.current.innerHTML = svg;
      }
    } catch (err) {
      setRenderError(`渲染图表失败: ${err}`);
      console.error("Mermaid render error:", err);
    }
  };

  // 应用启动时获取命令行参数中的文件路径
  useEffect(() => {
    invoke<string>("get_cli_arg")
      .then((path) => {
        loadFileContent(path);
      })
      .catch((err) => {
        setError(err);
      });
  }, []);

  const loadFileContent = async (path: string) => {
    try {
      const content = await invoke<string>("read_file", { filePath: path });
      setMermaidCode(content);
      setError("");
    } catch (error) {
      setError(`读取文件失败: ${error}`);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setMermaidCode(content);
        setError(""); // 清除错误状态
      };
      reader.readAsText(file);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3)); // 最大放大到3倍
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5)); // 最小缩小到0.5倍
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (error) {
    return (
      <main className="container">
        <div className="error-container">
          <h1>错误</h1>
          <p className="error-message">{error}</p>
          <div className="file-select-container">
            <p>请选择一个Mermaid文件:</p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".mmd,.mermaid,.txt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button 
              className="select-file-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              选择文件
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main 
      className={`container ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: isDragging ? 'none' : 'auto'
      }}
    >
      <div className="header">        
        <div className="toolbar">
          <button className="zoom-btn" onClick={handleZoomOut} title="缩小">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button className="zoom-btn" onClick={handleZoomIn} title="放大">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
        </div>
      </div>
      <div className="content-container" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`, transformOrigin: 'top left' }}>
        {renderError && (
          <div className="render-error">
            {renderError}
          </div>
        )}
        <div className="mermaid-container" ref={mermaidRef}>
          {!mermaidCode && <p>请选择一个Mermaid文件</p>}
        </div>
      </div>
    </main>
  );
}

export default App;