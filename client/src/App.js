import React, { useState } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './App.css';

const App = () => {
  const [year, setYear] = useState('');
  const [department, setDepartment] = useState('');
  const [number, setNumber] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetState();

    try {
      const response = await axios.get(
        `https://apiuov-pv98eu7s.b4a.run/api/results/${year}/${department}/${number}`
      );
      setResults(response.data);
    } catch (err) {
      setError('No results found for the given registration number.');
      console.error(err);
    }
  };

  const resetState = () => {
    setError('');
    setResults(null);
  };

  const downloadPDF = () => {
    const input = document.getElementById('results-container');
    const downloadButton = document.querySelector('.download-button');

    downloadButton.style.display = 'none';

    html2canvas(input, {
      scale: 2,
      useCORS: true,
    }).then((canvas) => {
      downloadButton.style.display = 'block';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`results_${year}_${department}_${number}.pdf`);
    });
  };

  const renderResults = () => {
    if (!results) return null;

    const semesterEntries = Object.entries(results.semesterResults);
    const semesterGroups = [];
    for (let i = 0; i < semesterEntries.length; i += 2) {
      semesterGroups.push(semesterEntries.slice(i, i + 2));
    }

    return (
      <div id="results-container" className="results-container">
        <h2 className="results-title">Registration Number: {results.regNo}</h2>
        <h2 className="student-name">Name: {results.name}</h2>

        <div className="semester-grid">
          {semesterGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="semester-grid-row">
              {group.map(([semester, data]) => (
                <div key={semester} className="semester-item">
                  <h3 className="sheet-heading">Results for {semester}</h3>
                  {data.courses.map((course, index) => (
                    <table key={index} className="results-table">
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(course).map(([subject, grade]) => (
                          <tr key={subject}>
                            <td>{subject}</td>
                            <td>{grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="ocgpa-section">
          <h3 className="overall-gpa">Overall GPA: {results.overallGpa}</h3>
          <h3 className="oc-gpa">OCGPA: {results.ocGPA}</h3>
        </div>

        <div className="download-button-container">
          <button onClick={downloadPDF} className="download-button no-print">
            Download as PDF
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <h1>Results Viewer</h1>
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          placeholder="Enter Year (e.g., 2020)"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          required
          className="search-input"
        />
        <input
          type="text"
          placeholder="Enter Department (e.g., ICT)"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          required
          className="search-input"
        />
        <input
          type="text"
          placeholder="Enter Number (e.g., 001)"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
          className="search-input"
        />
        <button type="submit" className="search-button">
          Get Results
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}
      {renderResults()}
    </div>
  );
};

export default App;
