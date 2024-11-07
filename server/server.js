const express = require('express');
const xlsx = require('xlsx');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000; // Updated for Heroku

app.use(cors());

// Load and parse the Excel file
const workbook = xlsx.readFile('./data.xlsx'); // Ensure the path is correct
const semesterData = [];
const gpaData = [];

// Loop through the sheets and load data
for (let i = 0; i < Math.min(4, workbook.SheetNames.length); i++) {
    const sheetName = workbook.SheetNames[i];
    const sheet = workbook.Sheets[sheetName];
    const sheetData = xlsx.utils.sheet_to_json(sheet);
    
    sheetData.forEach(record => {
        record['Semester'] = sheetName;
    });

    semesterData.push(...sheetData);
}

if (workbook.SheetNames.length > 4) {
    const gpaSheet = workbook.Sheets[workbook.SheetNames[4]];
    gpaData.push(...xlsx.utils.sheet_to_json(gpaSheet));
}

// API endpoint
app.get('/api/results/:year/:department/:number', (req, res) => {
    const { year, department, number } = req.params;
    const regNo = `${year}/${department}/${number}`;

    const filteredResults = semesterData.filter(record => record['Reg.No'] === regNo);

    if (filteredResults.length > 0) {
        const name = filteredResults[0]['Name'] || filteredResults[0]['Name_1'];
        const semesterResults = {};
        let overallGpa = 0;
        let totalSemesters = 0;

        filteredResults.forEach(result => {
            const semesterKey = result['Semester'];
            if (!semesterResults[semesterKey]) {
                semesterResults[semesterKey] = {
                    courses: [],
                    semesterGPA: 0,
                };
            }

            const courseData = {};
            Object.entries(result)
                .filter(([key]) => !['Reg.No', 'Name', 'Name_1', 'GPA', 'Semester', 'Reg. No', 'Reg.No_1'].includes(key))
                .forEach(([key, value]) => {
                    courseData[key] = value;
                });

            if (Object.keys(courseData).length > 0) {
                semesterResults[semesterKey].courses.push(courseData);
            }

            const semesterGPA = parseFloat(result['GPA']);
            if (!isNaN(semesterGPA)) {
                semesterResults[semesterKey].semesterGPA = semesterGPA;
                overallGpa += semesterGPA;
                totalSemesters++;
            }
        });

        overallGpa = totalSemesters > 0 ? (overallGpa / totalSemesters).toFixed(2) : 0;
        const gpaRecord = gpaData.find(record => record['Reg.No'] === regNo);
        const ocGPA = gpaRecord ? gpaRecord['OCGPA'] : 'N/A';

        res.json({
            regNo,
            name,
            semesterResults,
            overallGpa,
            ocGPA
        });
    } else {
        res.status(404).json({ message: 'No results found for the given registration number.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
