import React, { useState } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './App.css';

// Hardcoded Cloud Render Backend URL
const SERVER_URL = 'https://result-backend-vkcw.onrender.com';

const App = () => {
  const [year] = useState('2020');
  const [department] = useState('ICT');
  const [number, setNumber] = useState('');
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Requirement: Do NOT show degree class badge by default!
  const [showClassDetails, setShowClassDetails] = useState(false);
  
  const [activeTab, setActiveTab] = useState('ALL');
  const [copied, setCopied] = useState(false);

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
      const url = `${SERVER_URL}/api/results/${year}/${department}/${formattedNum}`;
      console.log('Fetching results from Cloud Render:', url);
      const response = await axios.get(url);
      setResults(response.data);
    } catch (err) {
      console.error(err);
      setError(`No results found for registration number ${year}/${department}/${formattedNum}.`);
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

  // Generate Standard A4 Printable Transcript PDF
  const downloadPDF = () => {
    const transcriptElement = document.getElementById('a4-transcript-document');
    if (!transcriptElement) return;

    // Temporarily make hidden A4 container visible for capturing
    transcriptElement.style.display = 'block';

    html2canvas(transcriptElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      windowWidth: 794
    }).then((canvas) => {
      // Re-hide after capture
      transcriptElement.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      
      // Standard A4 dimensions in mm: 210mm x 297mm
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Official_Transcript_${results.regNo.replace(/\//g, '_')}.pdf`);
    }).catch(err => {
      transcriptElement.style.display = 'none';
      console.error('PDF Generation Error:', err);
    });
  };

  const copySummary = () => {
    if (!results) return;
    const text = `ApiUOV Results\nStudent: ${results.name} (${results.regNo})\nTrack: ${results.degreeTrack}\nFinal OCGPA: ${results.overallGpa}\nDegree Class: ${results.degreeClass}`;
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
    const allSemesters = Object.entries(results.semesterResults);
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
      <>
        {/* Web UI Results Card */}
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

          {/* Hidden-by-Default Degree Class Toggle */}
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
            {allSemesters.some(([s]) => s.startsWith('4.')) && (
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
              <div style={{ gridColumn: 'span 2', padding: '20px', textAlign: 'center', color: '#64748B' }}>
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
              📄 Download Official A4 Transcript (PDF)
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* OFFICIAL A4 PRINTABLE TRANSCRIPT TEMPLATE (Hidden from web UI) */}
        {/* ------------------------------------------------------------- */}
        <div id="a4-transcript-document" className="a4-transcript-container" style={{ display: 'none' }}>
          {/* Header & Crest */}
          <div className="a4-header">
            <div className="a4-univ-title">UNIVERSITY OF VAVUNIYA, SRI LANKA</div>
            <div className="a4-faculty-title">FACULTY OF TECHNOLOGICAL STUDIES</div>
            <div className="a4-dept-title">Department of Information & Communication Technology</div>
            <div className="a4-doc-title">OFFICIAL STATEMENT OF ACADEMIC RESULTS</div>
            <div className="a4-divider"></div>
          </div>

          {/* Student Profile Info */}
          <table className="a4-student-info-table">
            <tbody>
              <tr>
                <td className="lbl">Student Name:</td>
                <td className="val"><strong>{results.name}</strong></td>
                <td className="lbl">Reg. Number:</td>
                <td className="val"><strong>{results.regNo}</strong></td>
              </tr>
              <tr>
                <td className="lbl">Degree Program:</td>
                <td className="val">{results.degreeTrack || 'Bachelor of Information & Communication Technology'}</td>
                <td className="lbl">Date Issued:</td>
                <td className="val">{currentDate}</td>
              </tr>
              <tr>
                <td className="lbl">Awarded Class:</td>
                <td className="val" colSpan="3">
                  <strong style={{ color: '#1E3A8A' }}>{results.degreeClass || 'N/A'}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* All Semester Course Tables in Standard 2-Column Transcript Grid */}
          <div className="a4-semester-grid">
            {allSemesters.map(([semester, data]) => (
              <div key={semester} className="a4-sem-block">
                <div className="a4-sem-heading">
                  <span>SEMESTER {semester}</span>
                  {data.semesterGPA > 0 && <span>GPA: {parseFloat(data.semesterGPA).toFixed(2)}</span>}
                </div>
                <table className="a4-results-table">
                  <thead>
                    <tr>
                      <th>Course Subject</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.courses.map((course) =>
                      Object.entries(course).map(([subj, grade]) => (
                        <tr key={subj}>
                          <td>{subj}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{grade || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Cumulative Summary Box */}
          <div className="a4-summary-box">
            <table className="a4-summary-table">
              <tbody>
                <tr>
                  <td>3-Year OCGPA (90 Credits): <strong>{results.threeYearGpa || results.overallGpa || 'N/A'}</strong></td>
                  {results.year4Gpa && results.year4Gpa !== 'N/A' && (
                    <td>Year 4 GPA (30 Credits): <strong>{results.year4Gpa}</strong></td>
                  )}
                  <td>FINAL DEGREE OCGPA: <strong style={{ fontSize: '15px', color: '#0F172A' }}>{results.overallGpa || 'N/A'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer & Certification Signatures */}
          <div className="a4-footer">
            <p className="a4-cert-text">
              This statement of results is generated from the official academic examination database of the University of Vavuniya.
            </p>
            <div className="a4-signatures">
              <div className="sig-line">
                <div className="line"></div>
                <div>Assistant Registrar (Examinations)</div>
              </div>
              <div className="sig-line">
                <div className="line"></div>
                <div>Dean / Faculty of Technological Studies</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="app-container">
      {/* Header Banner - Only ApiUOV */}
      <header className="portal-header">
        <h1 className="portal-title">ApiUOV</h1>
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
      </div>

      {/* Error Card */}
      {error && <div className="error-card">{error}</div>}

      {/* Main Results View */}
      {renderResults()}
    </div>
  );
};

export default App;
