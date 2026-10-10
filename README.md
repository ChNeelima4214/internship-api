Internship Records REST API

Description

A REST API built using Node.js, Express, and SQLite to manage internship records.

Features

- View all internships with pagination
- View internship details by ID
- Create internship records
- Update internship records using PUT and PATCH
- Delete internship records
- Input validation and error handling
- SQLite database persistence

Technologies

- Node.js
- Express.js
- SQLite
- better-sqlite3

Setup

1. Clone the repository.
2. Run "npm install".
3. Run "node server.js".
4. Open "http://localhost:3000/api/internships".

API Endpoints

Method| Endpoint| Purpose
GET| "/api/internships"| List internships
GET| "/api/internships/:id"| View one internship
POST| "/api/internships"| Create internship
PUT| "/api/internships/:id"| Replace internship
PATCH| "/api/internships/:id"| Update selected fields
DELETE| "/api/internships/:id"| Delete internship

Database

The SQLite database and internships table are initialized automatically when the application starts. Sample records are inserted if the table is empty.