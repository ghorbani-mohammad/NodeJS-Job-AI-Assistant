# Node.js Job Assistant - Backend API

A comprehensive RESTful API for job management, built with Node.js, Express.js, and MongoDB.

## Features

- **Job Management**: Full CRUD operations for job postings
- **Advanced Filtering**: Filter jobs by type, location, salary, experience level, and more
- **Search Functionality**: Text-based search with relevance scoring
- **Pagination & Sorting**: Efficient data retrieval with customizable sorting options
- **Job Statistics**: Comprehensive analytics and insights
- **Rate Limiting**: Built-in request throttling for API protection
- **Input Validation**: Robust request validation using Joi schemas
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Logging**: Structured logging with Winston

## Tech Stack

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Joi
- **Logging**: Winston
- **Security**: Helmet, CORS
- **Rate Limiting**: express-rate-limit

## Project Structure

```
server/
├── config/          # Database configuration
├── middleware/      # Custom middleware (validation, error handling, rate limiting)
├── models/          # Mongoose data models
├── routes/          # API route handlers
├── utils/           # Utility functions (logging)
└── index.js         # Main server entry point
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB instance running locally or remotely

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd nodejs-job-assistant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. Start the server:
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Jobs API (`/api/jobs`)

#### List Jobs
```
GET /api/jobs
```

**Query Parameters:**
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Number of jobs per page (default: 10)
- `jobType` (string): Filter by job type (full-time, part-time, contract, etc.)
- `remote` (boolean): Filter by remote work availability
- `experienceLevel` (string): Filter by experience level (entry, mid, senior, etc.)
- `industry` (string): Filter by industry
- `location` (string): Filter by location
- `salary` (number): Filter by minimum salary
- `skills` (string): Filter by required skills (comma-separated)
- `company` (string): Filter by company name
- `sortBy` (string): Sort field (postedDate, salary, company, location)
- `sortOrder` (string): Sort order (asc, desc)

**Example:**
```bash
GET /api/jobs?page=1&limit=20&jobType=full-time&remote=true&sortBy=postedDate&sortOrder=desc
```

#### Get Job by ID
```
GET /api/jobs/:id
```

#### Create Job
```
POST /api/jobs
```

**Request Body:**
```json
{
  "title": "Senior Software Engineer",
  "company": "Tech Corp",
  "location": "San Francisco, CA",
  "description": "We are looking for a senior software engineer...",
  "salary": 120000,
  "jobType": "full-time",
  "experienceLevel": "senior",
  "remote": true,
  "industry": "Technology",
  "skills": ["JavaScript", "Node.js", "React"],
  "applicationUrl": "https://techcorp.com/careers",
  "contactInfo": {
    "email": "hr@techcorp.com",
    "phone": "+1-555-0123"
  }
}
```

#### Update Job
```
PUT /api/jobs/:id
```

#### Delete Job
```
DELETE /api/jobs/:id
```

#### Update Job Status
```
PATCH /api/jobs/:id/status
```

**Request Body:**
```json
{
  "status": "active"
}
```

#### Get Job Statistics
```
GET /api/jobs/stats/overview
```

### Search API (`/api/search`)

#### Advanced Search
```
GET /api/search
```

**Query Parameters:**
- `q` (string): Search query text
- `jobType` (string): Filter by job type
- `remote` (boolean): Filter by remote work
- `experienceLevel` (string): Filter by experience level
- `industry` (string): Filter by industry
- `location` (string): Filter by location
- `salary` (number): Filter by minimum salary
- `skills` (string): Filter by skills
- `postedAfter` (date): Filter by posting date (ISO format)
- `postedBefore` (date): Filter by posting date (ISO format)
- `page` (number): Page number
- `limit` (number): Results per page
- `sortBy` (string): Sort field (relevance, postedDate, salary)

#### Get Search Suggestions
```
GET /api/search/suggestions
```

**Query Parameters:**
- `q` (string): Search query
- `type` (string): Suggestion type (jobs, companies, locations, skills)

#### Get Available Filters
```
GET /api/search/filters
```

## Environment Variables

Create a `.env` file based on `env.example`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/job-assistant
MONGODB_URI_TEST=mongodb://localhost:27017/job-assistant-test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

## Data Model

### Job Schema

```javascript
{
  title: String,           // Job title
  company: String,         // Company name
  location: String,        // Job location
  description: String,     // Job description
  salary: Number,          // Annual salary
  jobType: String,         // full-time, part-time, contract, etc.
  experienceLevel: String, // entry, mid, senior, executive
  remote: Boolean,         // Remote work availability
  industry: String,        // Industry sector
  skills: [String],        // Required skills
  applicationUrl: String,  // Application URL
  source: String,          // Job source
  status: String,          // active, inactive, expired
  postedDate: Date,        // Date posted
  expiryDate: Date,        // Expiration date
  contactInfo: Object,     // Contact information
  tags: [String],          // Job tags
  views: Number,           // View count
  applications: Number      // Application count
}
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Window**: 15 minutes (900,000 ms)
- **Max Requests**: 100 requests per IP address per window
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Handling

The API provides comprehensive error handling:
- **400**: Bad Request (validation errors)
- **404**: Not Found (resource not found)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error (server errors)

## Logging

Logs are written to:
- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (error logs only)
