# Project Status Tracker


A Next.js web application that visualizes project status data from Google Sheets in real-time.

## Features
- Real-time data fetching from Google Sheets
- Combined view of multiple sheets (PE & IB)
- High-level summary statistics
- Clean black and white design
- Manual refresh capability
- Responsive layout


## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Google Sheets API** for data fetching

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Sheets API

To fetch data from Google Sheets, you need to set up a Google Service Account:

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

#### Step 2: Enable Google Sheets API

1. In your Google Cloud project, navigate to **APIs & Services** > **Library**
2. Search for "Google Sheets API"
3. Click on it and press **Enable**

#### Step 3: Create a Service Account

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the service account details:
   - Name: `status-tracker` (or any name you prefer)
   - Description: `Service account for status tracker app`
4. Click **Create and Continue**
5. Skip the optional steps and click **Done**

#### Step 4: Create Service Account Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Select **JSON** format
5. Click **Create** - this will download a JSON file

#### Step 5: Extract Credentials from JSON

Open the downloaded JSON file and find these values:
- `client_email` - This is your service account email
- `private_key` - This is your private key (keep this secure!)

#### Step 6: Share Google Sheets with Service Account

1. Open your Google Sheets (both PE and IB sheets)
2. Click **Share** button
3. Add the service account email (from `client_email` in the JSON)
4. Give it **Viewer** access
5. Click **Send**

Do this for both sheets:
- PE Sheet: `https://docs.google.com/spreadsheets/d/1I9iD2oFWan9yIwfyoG-ZIYd3JMy18zZHSAgf_r5fXvg`
- IB Sheet: `https://docs.google.com/spreadsheets/d/1-gwegMQoOCamR48fES0QBpSxqcsNhpoFhoEV3Xzx328`

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp .env.local.example .env.local
```

Edit `.env.local` and add your credentials:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"

# Sheet IDs (already configured)
GOOGLE_SHEET_ID_PE=1I9iD2oFWan9yIwfyoG-ZIYd3JMy18zZHSAgf_r5fXvg
GOOGLE_SHEET_ID_IB=1-gwegMQoOCamR48fES0QBpSxqcsNhpoFhoEV3Xzx328
```

**Important Notes:**
- Keep the quotes around the private key
- Make sure the `\n` characters are preserved in the private key
- Never commit `.env.local` to version control (it's in `.gitignore`)

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click **Import Project**
3. Select your GitHub repository
4. Add environment variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID_PE`
   - `GOOGLE_SHEET_ID_IB`
5. Click **Deploy**

**Note:** When adding `GOOGLE_PRIVATE_KEY` to Vercel, paste the entire key including the quotes and newlines exactly as it appears in your `.env.local` file.

## Project Structure

```
status-tracker/
├── app/
│   ├── api/
│   │   └── sheets/
│   │       └── route.ts          # API endpoint for fetching Google Sheets data
│   ├── page.tsx                  # Main dashboard page
│   └── layout.tsx                # Root layout
├── components/
│   ├── StatusTable.tsx           # Combined status table component
│   └── SummaryStats.tsx          # Summary statistics component
├── lib/
│   └── googleSheets.ts           # Google Sheets API client
├── types/
│   └── sheets.ts                 # TypeScript type definitions
├── .env.local                    # Environment variables (not in git)
├── .env.local.example            # Environment variables template
└── README.md                     # This file
```

## Troubleshooting

### "Failed to fetch sheets data"

- Verify that you've shared both Google Sheets with the service account email
- Check that the service account has the correct permissions (Viewer access)
- Ensure the Google Sheets API is enabled in your Google Cloud project

### "Google Sheets credentials not configured"

- Make sure `.env.local` exists and has the correct values
- Restart the development server after adding environment variables

### Private key errors

- Ensure the private key is wrapped in quotes
- Make sure `\n` newline characters are preserved
- Don't remove the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers

## License

MIT
