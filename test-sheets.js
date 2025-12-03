// Test script to diagnose Google Sheets connection and data
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function testConnection() {
  console.log('🔍 Testing Google Sheets Connection...\n');

  // 1. Check environment variables
  console.log('1️⃣ Checking Environment Variables:');
  console.log('   ✓ GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✓ Set' : '✗ Missing');
  console.log('   ✓ GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? '✓ Set' : '✗ Missing');
  console.log('   ✓ GOOGLE_SHEET_ID_PE:', process.env.GOOGLE_SHEET_ID_PE ? '✓ Set' : '✗ Missing');
  console.log('   ✓ GOOGLE_SHEET_ID_IB:', process.env.GOOGLE_SHEET_ID_IB ? '✓ Set' : '✗ Missing');
  console.log();

  // 2. Initialize Google Sheets client
  console.log('2️⃣ Initializing Google Sheets Client...');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  console.log('   ✓ Client initialized\n');

  // 3. Test PE Sheet
  console.log('3️⃣ Testing PE Sheet (ID: ' + process.env.GOOGLE_SHEET_ID_PE + ')...');
  try {
    const peResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID_PE,
      range: 'A1:I300',
    });
    console.log('   ✓ PE Sheet fetched successfully');
    console.log('   ✓ Rows returned:', peResponse.data.values?.length || 0);
    console.log('   ✓ First 5 rows:');
    peResponse.data.values?.slice(0, 5).forEach((row, idx) => {
      console.log(`      Row ${idx + 1}:`, JSON.stringify(row));
    });
    console.log();
  } catch (error) {
    console.error('   ✗ Error fetching PE Sheet:', error.message);
    console.log();
  }

  // 4. Test IB Sheet
  console.log('4️⃣ Testing IB Sheet (ID: ' + process.env.GOOGLE_SHEET_ID_IB + ')...');
  try {
    const ibResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID_IB,
      range: 'A1:I300',
    });
    console.log('   ✓ IB Sheet fetched successfully');
    console.log('   ✓ Rows returned:', ibResponse.data.values?.length || 0);
    console.log('   ✓ First 5 rows:');
    ibResponse.data.values?.slice(0, 5).forEach((row, idx) => {
      console.log(`      Row ${idx + 1}:`, JSON.stringify(row));
    });
    console.log();
  } catch (error) {
    console.error('   ✗ Error fetching IB Sheet:', error.message);
    console.log();
  }

  // 5. Test aggregation logic
  console.log('5️⃣ Testing Aggregation Logic...');
  try {
    const peResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID_PE,
      range: 'A1:I300',
    });

    const values = peResponse.data.values;
    if (!values || values.length < 2) {
      console.log('   ✗ Not enough data to aggregate');
      return;
    }

    // Aggregate data
    const aggregation = new Map();
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length < 8) continue;

      const status = row[2]?.toString().trim();
      const weekStr = row[7]?.toString().trim();

      if (!status || !weekStr) continue;

      const weekNum = parseInt(weekStr, 10);
      if (isNaN(weekNum) || weekNum < 1 || weekNum > 7) continue;

      if (!aggregation.has(status)) {
        aggregation.set(status, { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0, week6: 0, week7: 0 });
      }

      const statusData = aggregation.get(status);
      statusData[`week${weekNum}`] = (statusData[`week${weekNum}`] || 0) + 1;
    }

    console.log('   ✓ Aggregation completed');
    console.log('   ✓ Unique statuses found:', aggregation.size);
    console.log('   ✓ Status breakdown:');
    aggregation.forEach((weekCounts, status) => {
      const total = Object.values(weekCounts).reduce((sum, count) => sum + count, 0);
      console.log(`      ${status}: ${total} tasks`);
    });
  } catch (error) {
    console.error('   ✗ Error testing aggregation:', error.message);
  }

  console.log('\n✅ Test Complete!');
}

testConnection().catch(console.error);
