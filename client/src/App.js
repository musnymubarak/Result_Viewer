import React, { useState, useEffect } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './App.css';

const App = () => {
  const [year] = useState('2020');
  const [department] = useState('ICT');
  const [number, setNumber] = useState('');
  
  const [serverUrl, setServerUrl] = useState('http://localhost:4000'); // Default local server
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Requirement: Do NOT show degree class badge by default!
  const [showClassDetails, setShowClassDetails] = useState(false);
  
  const [activeTab, setActiveTab] = useState('ALL');
  const [recentSearches, setRecentSearches] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recent_uov_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveRecentSearch = (numStr) => {
    const updated = [numStr, ...recentSearches.filter(n => n !== numStr)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent_uov_searches', JSON.stringify(updated));
  };

  const handleSearch = async (numToSearch) => {
    const searchNum = numToSearch || number;
    if (!searchNum) return;

    setError('');
    setResults(null);
    setLoading(true);
    setShowClassDetails(false); // Reset hidden state on new search

    // Format registration number flexibly
    let formattedNum = searchNum.trim();
    if (formattedNum.length === 1) formattedNum = `0${formattedNum}`;
    
    try {
      const url = `${serverUrl}/api/results/${year}/${department}/${formattedNum}`;
      console.log('Fetching results from:', url);
      const response = await axios.get(url);
      setResults(response.data);
      saveRecentSearch(formattedNum);
    } catch (err) {
      console.error(err);
      setError(`No results found for registration number ${year}/${department}/${formattedNum}. Make sure the backend server is running.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(number);
  };

  const getGradeClass = (gradeStr) => {
    if (!gradeStr) return 'pass';
    const g = String(gradeStr).trim().toUpperCase();
    if (['A+', 'A', 'A-'].includes(g)) return 'distinction';
    if (['B+', 'B', 'B-'].includes(g)) return 'credit';
    if (['C+', 'C'].includes(g)) return 'pass';
    if (['C-', 'D+', 'D'].includes(g)) return 'low';
    if (['E', 'F', 'AB', 'ABSENT'].includes(g)) return 'fail';
    return 'pass';
  };

  const downloadPDF = () => {
    const input = document.getElementById('results-container');
    if (!input) return;

    html2canvas(input, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFFFFF'
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`uov_results_${results.regNo.replace(/\//g, '_')}.pdf`);
    });
  };

  const copySummary = () => {
    if (!results) return;
    const text = `University of Vavuniya Results\nStudent: ${results.name} (${results.regNo})\nTrack: ${results.degreeTrack}\nFinal OCGPA: ${results.overallGpa}\nDegree Class: ${results.degreeClass}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group semesters by academic year tab
  const getFilteredSemesters = () => {
    if (!results || !results.semesterResults) return [];
    const entries = Object.entries(results.semesterResults);

    if (activeTab === 'Y1') return entries.filter(([sem]) => sem.startsWith('1.'));
    if (activeTab === 'Y2') return entries.filter(([sem]) => sem.startsWith('2.'));
    if (activeTab === 'Y3') return entries.filter(([sem]) => sem.startsWith('3.'));
    if (activeTab === 'Y4') return entries.filter(([sem]) => sem.startsWith('4.'));
    return entries;
  };

  const renderResults = () => {
    if (!results) return null;

    const filteredSemesters = getFilteredSemesters();

    return (
      <div id="results-container" className="results-card">
        {/* Student Header Banner */}
        <div className="student-banner">
          <div className="student-info-main">
            <h2>{results.name}</h2>
            <span className="student-reg-tag">Reg No: {results.regNo}</span>
          </div>

          <div className="degree-track-container">
            <span className={`track-badge ${results.degreeTrack && results.degreeTrack.includes('120') ? 'honours' : 'general'}`}>
              {results.degreeTrack || 'General Degree (90 Cr)'}
            </span>
          </div>
        </div>

        {/* GPA Summary Metrics Cards */}
        <div className="gpa-metrics-grid">
          <div className="metric-card">
            <div className="metric-label">3-Year OCGPA (90 Cr)</div>
            <div className="metric-val">{results.threeYearGpa || results.overallGpa || 'N/A'}</div>
          </div>

          {results.year4Gpa && results.year4Gpa !== 'N/A' && (
            <div className="metric-card">
              <div className="metric-label">Year 4 GPA (30 Cr)</div>
              <div className="metric-val">{results.year4Gpa}</div>
            </div>
          )}

          <div className="metric-card highlight">
            <div className="metric-label">Final Degree OCGPA</div>
            <div className="metric-val">{results.overallGpa || 'N/A'}</div>
          </div>
        </div>

        {/* REQUIREMENT: Hidden-by-default Degree Class Toggle */}
        <div className="class-details-section">
          <button 
            onClick={() => setShowClassDetails(!showClassDetails)} 
            className="class-toggle-btn"
            type="button"
          >
            {showClassDetails ? '🔒 Hide Graduation Class Details' : '🎓 View Degree Class & Graduation Details'}
          </button>

          {showClassDetails && (
            <div className="class-details-card">
              <div>
                <div className="class-title">Official Graduation Degree Classification</div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                  Based on total earned credits ({results.degreeTrack && results.degreeTrack.includes('120') ? '120 Honours Credits' : '90 General Credits'})
                </div>
              </div>
              <div className="degree-class-pill">
                🏆 {results.degreeClass || 'N/A'}
              </div>
            </div>
          )}
        </div>

        {/* Semester Navigation Tabs */}
        <div className="semester-tabs-header">
          <button className={`sem-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>All Semesters</button>
          <button className={`sem-tab-btn ${activeTab === 'Y1' ? 'active' : ''}`} onClick={() => setActiveTab('Y1')}>Year 1 (1.1, 1.2)</button>
          <button className={`sem-tab-btn ${activeTab === 'Y2' ? 'active' : ''}`} onClick={() => setActiveTab('Y2')}>Year 2 (2.1, 2.2)</button>
          <button className={`sem-tab-btn ${activeTab === 'Y3' ? 'active' : ''}`} onClick={() => setActiveTab('Y3')}>Year 3 (3.1, 3.2)</button>
          {Object.keys(results.semesterResults).some(s => s.startsWith('4.')) && (
            <button className={`sem-tab-btn ${activeTab === 'Y4' ? 'active' : ''}`} onClick={() => setActiveTab('Y4')}>Year 4 (4.1, 4.2)</button>
          )}
        </div>

        {/* Semester Cards Grid */}
        <div className="semester-cards-grid">
          {filteredSemesters.length > 0 ? (
            filteredSemesters.map(([semester, data]) => (
              <div key={semester} className="semester-box">
                <div className="sem-header">
                  <span className="sem-title">Semester {semester}</span>
                  {data.semesterGPA > 0 && (
                    <span className="sem-gpa-badge">GPA: {parseFloat(data.semesterGPA).toFixed(2)}</span>
                  )}
                </div>

                {data.courses.map((course, cIdx) => (
                  <table key={cIdx} className="course-table">
                    <thead>
                      <tr>
                        <th>Course Subject</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(course).map(([subj, grade]) => (
                        <tr key={subj}>
                          <td>{subj}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`grade-pill ${getGradeClass(grade)}`}>
                              {grade || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
              </div>
            ))
          ) : (
            <div style={{ gridColumn: 'span 2', padding: '20px', textCenter: 'center', color: '#64748B' }}>
              No results recorded for this semester tab.
            </div>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="actions-bar">
          <button onClick={copySummary} className="action-btn secondary" type="button">
            {copied ? '✓ Summary Copied!' : '📋 Copy Summary'}
          </button>

          <button onClick={downloadPDF} className="action-btn primary" type="button">
            📥 Download Official PDF
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Header Banner */}
      <header className="portal-header">
        <div className="university-badge">
          🏛️ University of Vavuniya
        </div>
        <h1 className="portal-title">Academic Result Portal</h1>
        <p className="portal-subtitle">Faculty of Technological Studies — ICT Degree Program</p>
      </header>

      {/* Search Input Card */}
      <div className="search-card">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-inputs-grid">
            <input type="text" value={year} readOnly className="input-field readonly" title="Batch Year" />
            <input type="text" value={department} readOnly className="input-field readonly" title="Department" />
            <input
              type="text"
              placeholder="Enter Number (e.g. 30, 06, 01)"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              className="input-field"
            />
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? 'Searching...' : '🔍 Search'}
            </button>
          </div>
        </form>

        {/* Settings Bar & Recent Searches */}
        <div className="settings-bar" style={{ marginTop: '16px' }}>
          <div className="recent-searches">
            <span>Recent:</span>
            {recentSearches.length > 0 ? (
              recentSearches.map((numStr) => (
                <span
                  key={numStr}
                  onClick={() => {
                    setNumber(numStr);
                    handleSearch(numStr);
                  }}
                  className="recent-pill"
                >
                  {numStr}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>None yet</span>
            )}
          </div>

          <div className="server-toggle-group">
            <label htmlFor="server-select">Server:</label>
            <select
              id="server-select"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="server-toggle-select"
            >
              <option value="http://localhost:4000">Local Backend (Port 4000)</option>
              <option value="https://result-backend-vkcw.onrender.com">Cloud Render Backend</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Card */}
      {error && <div className="error-card">{error}</div>}

      {/* Main Results View */}
      {renderResults()}
    </div>
  );
};

export default App;
