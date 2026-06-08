const XLSX = require('xlsx');
const path = require('path');

const inputPath = path.join(process.env.HOME, 'careerpilot', 'data', 'applications.xlsx');
const wb = XLSX.readFile(inputPath);
const ws = wb.Sheets['Applications'];

// Convert existing data to array
const existingData = XLSX.utils.sheet_to_json(ws, { header: 1 });

// AIN applications to add
const ainApps = [
  ['2026-06-08', 'Hardi Aged Care Group', 'Assistant in Nursing (AIN)', 'seek', 'Summer Hill, Sydney NSW', 85, 80, '$28-35/hr', 'tailored', 'A', 'https://www.seek.com.au/job/hardi-aged-care-ain', 'Perfect AIN role match. Certificate III meets requirements. Placement experience at Annandale Grove Care Community. Hardi is respected provider.', 'No'],
  ['2026-06-08', 'Achieve Australia', 'Assistant in Nursing - Disability', 'seek', 'Condell Park, Sydney NSW', 80, 75, 'Not specified', 'tailored', 'B', 'https://www.seek.com.au/job/achieve-australia-ain', 'Disability support focus matches Certificate III specialisation. 6-month contract with view to permanent. 50 hrs/fortnight.', 'No'],
  ['2026-06-08', 'Sidekicker (Agency)', 'Assistant in Nursing - Aged Care', 'seek', 'Wahroonga, Sydney NSW', 78, 70, '$48-72/hr', 'tailored', 'A', 'https://www.seek.com.au/job/sidekicker-ain', 'High hourly rate via agency. Flexible shift selection via app. Great for gaining diverse experience across facilities.', 'No'],
  ['2026-06-08', 'Hyecare', 'Personal Carer', 'seek', 'Willoughby, Sydney NSW', 75, 72, 'Not specified', 'tailored', 'B', 'https://www.seek.com.au/job/hyecare-personal-carer', 'Brand-new luxury aged care community. AM/PM/Night shifts available. Full-time roles with career growth.', 'No'],
  ['2026-06-08', 'Bupa Aged Care', 'Carer - Metro Sydney', 'seek', 'Multiple locations, Sydney', 82, 85, '$28-35/hr (est.)', 'tailored', 'A', 'https://www.seek.com.au/job/bupa-carer', 'Bupa is Australia\'s largest aged care provider. Multiple locations across Sydney. Great training and career progression. Compassionate care focus.', 'No'],
];

XLSX.utils.sheet_add_aoa(ws, ainApps, { origin: -1 });
ws['!cols'] = [
  { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 8 }, { wch: 25 },
  { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 8 },
  { wch: 55 }, { wch: 65 }, { wch: 10 }
];

XLSX.writeFile(wb, inputPath);
console.log(`Updated tracker with ${ainApps.length} AIN applications. Total: ${existingData.length - 1 + ainApps.length}`);
