"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    fontFamily: "inherit",
    primaryColor: "#e8f0fe",
    primaryTextColor: "#1a73e8",
    primaryBorderColor: "#7c3aed",
    lineColor: "#80868b",
    secondaryColor: "#fce8e6",
    tertiaryColor: "#e6f4ea",
  },
  flowchart: {
    curve: "basis",
  },
});

export default function VenueDiagram({ diagramString }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!diagramString || !containerRef.current) return;
    
    // Clean up mermaid string if Gemini wrapped it in markdown
    const cleanedString = diagramString.replace(/```mermaid\n?/g, "").replace(/```\n?/g, "").trim();

    const renderDiagram = async () => {
      try {
        setError(false);
        const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}`, cleanedString);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid generation failed:", err);
        setError(true);
      }
    };

    renderDiagram();
  }, [diagramString]);

  if (!diagramString) return null;

  return (
    <div style={{ 
      width: "100%", 
      overflowX: "auto", 
      background: "white", 
      padding: "1rem", 
      borderRadius: "12px", 
      border: "1.5px solid #e8eaed",
      marginBottom: "1rem"
    }}>
      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#202124", marginBottom: "0.5rem" }}>
        AI Architecture Flow
      </h4>
      {error ? (
        <div style={{ color: "#d93025", fontSize: "0.8rem", textAlign: "center", padding: "1rem" }}>
          Sorry, AI generated an invalid diagram format.
        </div>
      ) : (
        <div ref={containerRef} style={{ display: "flex", justifyContent: "center" }} />
      )}
    </div>
  );
}
