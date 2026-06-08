#!/usr/bin/env node
const XLSX = require('xlsx');
const path = require('path');

// Application data
const applications = [
  {
    date: '2026-06-08',
    company: 'DMA Global',
    title: 'Junior Software Engineer',
    source: 'seek',
    location: 'Sydney NSW',
    match_score: 82,
    company_score: 70,
    salary: '$50,000 - $70,000',
    status: 'tailored',
    variant: 'A',
    url: 'https://www.seek.com.au/job/dma-global-junior-software-engineer',
    reasoning: 'Perfect match for full-stack React/TypeScript/Node.js skills. 1-2 years experience requirement aligns with Nikan\'s 1.5+ years. Strong portfolio of shipped products.',
    responded: false
  },
  {
    date: '2026-06-08',
    company: 'APLY Limited',
    title: 'Frontend Web Developer',
    source: 'seek',
    location: 'Sydney NSW (Hybrid)',
    match_score: 78,
    company_score: 65,
    salary: '$90,000 - $110,000',
    status: 'tailored',
    variant: 'B',
    url: 'https://www.seek.com.au/job/aply-limited-frontend-web-developer',
    reasoning: 'Frontend-focused role plays to Nikan\'s React/Next.js/TypeScript strengths. Good salary for experience level. Hybrid work arrangement.',
    responded: false
  },
  {
    date: '2026-06-08',
    company: 'Commonwealth Bank',
    title: 'Software Engineer',
    source: 'seek',
    location: 'Sydney NSW (Hybrid)',
    match_score: 75,
    company_score: 85,
    salary: 'Not specified',
    status: 'tailored',
    variant: 'A',
    url: 'https://www.seek.com.au/job/commonwealth-bank-software-engineer',
    reasoning: 'Integration and platform services role matches Nikan\'s API development experience. Startup-like environment at Eightbit shows ability to work in fast-paced teams. Major bank = stability.',
    responded: false
  },
  {
    date: '2026-06-08',
    company: 'KONE Elevators',
    title: 'Application Developer',
    source: 'seek',
    location: 'Mascot, Sydney NSW',
    match_score: 72,
    company_score: 80,
    salary: 'Great benefits',
    status: 'tailored',
    variant: 'B',
    url: 'https://www.seek.com.au/job/kone-application-developer',
    reasoning: 'Global organisation with training focus. Application development experience across multiple domains. Mascot location accessible. Good for career growth.',
    responded: false
  },
  {
    date: '2026-06-08',
    company: 'Duo Group',
    title: 'Web Developer',
    source: 'seek',
    location: 'Homebush, Sydney NSW',
    match_score: 80,
    company_score: 70,
    salary: 'Not specified',
    status: 'tailored',
    variant: 'A',
    url: 'https://www.seek.com.au/job/duo-group-web-developer',
    reasoning: 'Innovative web solutions matches Nikan\'s diverse project experience. Supportive team environment good for growth. Full-stack capability for diverse projects.',
    responded: false
  }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();

// Headers
const headers = [
  'Date', 'Company', 'Title', 'Source', 'Location', 
  'Match Score', 'Company Score', 'Salary', 'Status', 
  'Variant', 'URL', 'Reasoning', 'Responded'
];

// Convert data to array of arrays
const data = [headers];
applications.forEach(app => {
  data.push([
    app.date,
    app.company,
    app.title,
    app.source,
    app.location,
    app.match_score,
    app.company_score,
    app.salary,
    app.status,
    app.variant,
    app.url,
    app.reasoning,
    app.responded ? 'Yes' : 'No'
  ]);
});

const ws = XLSX.utils.aoa_to_sheet(data);

// Set column widths
ws['!cols'] = [
  { wch: 12 }, // Date
  { wch: 20 }, // Company
  { wch: 25 }, // Title
  { wch: 8 },  // Source
  { wch: 20 }, // Location
  { wch: 12 }, // Match Score
  { wch: 14 }, // Company Score
  { wch: 18 }, // Salary
  { wch: 12 }, // Status
  { wch: 8 },  // Variant
  { wch: 50 }, // URL
  { wch: 60 }, // Reasoning
  { wch: 10 }  // Responded
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Applications');

// Write to file
const outputPath = path.join(process.env.HOME, 'careerpilot', 'data', 'applications.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Excel tracker created at: ${outputPath}`);
console.log(`Total applications: ${applications.length}`);
console.log(`Status breakdown:`);
const statusCounts = {};
applications.forEach(app => {
  statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
});
Object.entries(statusCounts).forEach(([status, count]) => {
  console.log(`  ${status}: ${count}`);
});
