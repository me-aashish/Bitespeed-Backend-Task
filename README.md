# Bitespeed Backend Task: 🔎 Identity Reconciliation

This repository contains the backend code for the Bitespeed identity reconciliation task. The goal is to create an API that identifies and merges user records based on email and phone number, ensuring that each unique user is represented by a single primary record.

## Steps to Run the Project

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/me-aashish/Bitespeed-Backend-Task.git
   cd Bitespeed-Backend-Task
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Set Up Environment Variables**:
   Make sure you have a PostgreSQL database running.
   Create a `.env` file in the root directory and add the following:
   ```env
   DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>:5432/bitespeed?schema=public"
   PORT=3000
   ```
4. **Run the Project**:
   ```bash
   npm start
   ```

## You use below Postman collection to test the API:

[Postman Collection](https://documenter.getpostman.com/view/48905814/2sB3QFQrum)

## Deployed Link (test using Postman):

[Deployed Link](http://34.14.199.11/identify)
