# 🧠 AI Data Mapper

A Next.js 14 web application that uses **intelligent AI mapping** to automatically transfer data between database tables with different column naming conventions. Perfect for CRM data migration and integration!

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-teal)
![AI Mapping](https://img.shields.io/badge/AI-Smart_Mapping-green)

---

## ✨ Features

- 🤖 **Intelligent Field Mapping**: AI-powered context-aware column matching between tables
- 🔄 **Data Transfer**: Automated data migration with validation and transformation
- 🌍 **Multi-language Support**: Works with Russian and English column names
- 📊 **Schema Analysis**: Automatic detection of table structures and relationships
- ✅ **Data Validation**: Built-in validation rules for data integrity
- 🎯 **Smart Transformations**: Automatic data type conversions and formatting
- 🌙 **Modern UI**: Clean interface with real-time progress tracking
- ⚡ **Batch Processing**: Efficient handling of large datasets
- 🔒 **Privacy First**: All processing happens on your server

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **AI Mapping** | Custom Context-Aware Algorithm |
| **Database** | Supabase (PostgreSQL) |
| **UI Components** | Radix UI + Lucide React |
| **Validation** | Custom Data Validator |

---

## 📋 Prerequisites

Before getting started, ensure you have:

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **Supabase Account** - [Sign up free](https://supabase.com/)
3. **Database Tables** - Source and target tables with data

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd fgrg
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com/)
2. Go to **Settings → API**
3. Copy your **Project URL** and **anon/public key**
4. Run the database migration:

```bash
# Apply the AI mapper functions
supabase db push
```

Or manually run the SQL from `supabase/migrations/20240101000000_ai_mapper_functions.sql`

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser 🎉

---

## 📖 User Guide

### How to Transfer Data Between Tables

1. **Select Source and Target Tables**
   - Choose your source table from the dropdown
   - Select the target table where data should be transferred

2. **AI Analyzes Schemas**
   - Click "Analyze Tables" to let AI examine both table structures
   - AI automatically finds matching columns based on context

3. **Review Field Mappings**
   - See suggested mappings with confidence scores
   - View transformation suggestions if needed
   - Check AI suggestions for unmapped fields

4. **Preview Data**
   - Click "Preview" to see sample data from source table
   - Review how data will be transformed

5. **Execute Transfer**
   - Choose between "Test Run" (dry run) or actual transfer
   - Monitor progress in real-time
   - View detailed results and any validation errors

### Supported Field Mappings

The AI can intelligently map between various naming conventions:

**Names:**
- Source: `name`, `first_name`, `given_name`, `имя`, `fname`
- Target: `имя`, `first_name`

**Email:**
- Source: `email`, `mail`, `e_mail`, `email_address`, `почта`
- Target: `электронная_почта`

**Phone:**
- Source: `phone`, `telephone`, `mobile`, `cell`, `телефон`
- Target: `телефон`

**Company:**
- Source: `company`, `organization`, `org`, `firm`, `компания`
- Target: `компания`

**And many more...** The AI uses context, synonyms, and pattern matching to find the best mappings.

---

## 🧪 Testing

### Create Test Tables

Create two tables with different column naming conventions:

**Source Table (imported_contacts):**
```sql
CREATE TABLE imported_contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  surname VARCHAR(100),
  email_address VARCHAR(255),
  phone_number VARCHAR(50),
  organization VARCHAR(200),
  job_title VARCHAR(200)
);
```

**Target Table (пользователи):**
```sql
CREATE TABLE пользователи (
  идентификатор UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  имя VARCHAR,
  фамилия VARCHAR,
  электронная_почта VARCHAR NOT NULL UNIQUE,
  телефон VARCHAR,
  компания VARCHAR,
  должность VARCHAR
);
```

### Insert Test Data

```sql
INSERT INTO imported_contacts (name, surname, email_address, phone_number, organization, job_title)
VALUES
('John', 'Doe', 'john@example.com', '+1234567890', 'Acme Corp', 'Developer'),
('Jane', 'Smith', 'jane@example.com', '+0987654321', 'Tech Inc', 'Manager');
```

### Expected AI Mapping

The AI should automatically map:
- `name` → `имя`
- `surname` → `фамилия`
- `email_address` → `электронная_почта`
- `phone_number` → `телефон`
- `organization` → `компания`
- `job_title` → `должность`

---

## 🔧 Troubleshooting

### Database Connection Error

**Error**: `Missing Supabase environment variables`

**Solutions**:
1. Check that `.env.local` exists
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
3. Restart the dev server: `npm run dev`

### Table Not Found

**Error**: `Table "table_name" does not exist`

**Solutions**:
1. Verify table names are correct
2. Check that tables exist in the public schema
3. Ensure Supabase migrations have been applied

### Mapping Confidence Low

**Issue**: AI shows low confidence for field mappings

**Solutions**:
1. Check if column names are too generic
2. Ensure sample data exists for analysis
3. Consider manual mapping for ambiguous fields

### Validation Errors

**Issue**: Data transfer fails with validation errors

**Solutions**:
1. Review validation error messages
2. Check data type compatibility
3. Ensure required fields are not null
4. Verify unique constraints

---

## 🏗 Project Structure

```
fgrg/
├── app/
│   ├── api/
│   │   ├── ai-mapper/          # AI mapping endpoints
│   │   │   ├── analyze/        # Schema analysis
│   │   │   └── transfer/       # Data transfer
│   │   └── import-contacts/    # Legacy import endpoint
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
├── components/
│   ├── ui/                     # UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── select.tsx
│   │   └── ...
│   └── ai-mapper-interface.tsx # Main mapper component
├── lib/
│   ├── ai-data-mapper.ts       # Core AI mapping logic
│   ├── data-validator.ts       # Data validation
│   ├── supabase.ts             # Database client
│   └── utils.ts                # Utilities
├── supabase/
│   └── migrations/             # Database migrations
│       └── 20240101000000_ai_mapper_functions.sql
├── .env.local.example          # Environment template
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 📝 Database Schema

The system works with your existing database tables. It can handle:

### Supported Tables
- **пользователи** (Users)
- **контакты** (Contacts)
- **контактные_электронные_почты** (Contact Emails)
- **контактные_телефоны** (Contact Phones)
- **контактные_адреса** (Contact Addresses)
- **визитки** (Business Cards)
- **And any custom tables**

### AI Functions
The system adds these helper functions to your database:

- `get_table_columns()` - Get column information
- `get_user_tables()` - List all user tables
- `get_table_sample_data()` - Get sample data for analysis
- `validate_table_data()` - Validate data before insert

### Field Mapping Intelligence

The AI uses multiple strategies for field matching:

1. **Exact Name Matching**: `email` ↔ `email`
2. **Synonym Matching**: `phone` ↔ `телефон`, `company` ↔ `компания`
3. **Pattern Matching**: `first_name` ↔ `имя`, `last_name` ↔ `фамилия`
4. **Data Type Analysis**: VARCHAR ↔ TEXT, TIMESTAMP ↔ DATE
5. **Sample Value Analysis**: Email format detection, phone format detection

---

## 🎨 UI Features

- **Modern Interface**: Clean, professional design with Tailwind CSS
- **Real-time Progress**: Live feedback during data transfer
- **Confidence Scoring**: Visual indicators for mapping quality
- **Batch Processing**: Progress tracking for large datasets
- **Error Reporting**: Detailed validation feedback
- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Mode**: Comfortable viewing in any environment

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🙏 Acknowledgments

- **Supabase Team** - For the amazing PostgreSQL platform
- **Vercel** - For Next.js and excellent developer experience
- **Radix UI** - For accessible UI components
- **Tailwind CSS** - For utility-first styling

---

## 📞 Support

Need help? Check these resources:

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Radix UI Docs](https://www.radix-ui.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**Made with 💙 by the AI Data Mapper team**
