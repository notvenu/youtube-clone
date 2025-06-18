# 🎬 YouTube Clone

## Overview
Welcome to the **YouTube Clone**! 🚀  
A full-stack video sharing platform built with **Express.js**, **MongoDB**, and modern JavaScript. Upload, watch, and manage videos, create playlists, comment, like, and subscribe—just like the real thing!  
Perfect for learning backend APIs, authentication, file uploads, and scalable web app architecture. 😎

---

## Features
- **User Authentication**: Secure registration & login with JWT tokens. 🔐
- **Profile Management**: Upload avatars & cover images (stored on Cloudinary). 🖼️
- **Video Upload & Streaming**: Upload videos, stream with adaptive quality. 📹
- **Playlists**: Create, update, and manage playlists. 📂
- **Likes & Subscriptions**: Like videos and subscribe to channels. 👍🔔
- **Comments**: Add, edit, and delete comments on videos. 💬
- **Search & Filter**: Find videos by title, tags, or channel. 🔎
- **Responsive API**: RESTful endpoints for all resources. 🌐
- **Robust Validation**: Input validation and error handling throughout. 🛡️
- **Health Check Endpoint**: Monitor server status and app version. 🩺

---

## Technologies Used
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **File Uploads**: Multer, Cloudinary
- **Validation**: Custom middleware & regex
- **Environment Config**: dotenv
- **Testing**: PostMan
- **Other**: Modern ES modules, async/await, RESTful design

---

## File Structure
```
src/
  app.js                # Express app setup and middleware
  index.js              # Entry point, server startup
  constants.js          # App-wide constants (e.g., DB_NAME, APP_VERSION)
  db/
    index.js            # MongoDB connection logic
  controllers/          # Route handlers (user, video, playlist, etc.)
  models/               # Mongoose schemas (User, Video, Playlist, etc.)
  routes/               # Express route definitions
  middlewares/          # Custom middleware (auth, multer, error, etc.)
  utils/                # Utility functions (Cloudinary, JWT, formatting, etc.)
  public/               # Static files (if any)
  uploads/              # Temp file storage (gitignored)
.env.sample            # Example env file for setup
package.json            # Project metadata & dependencies
README.md               # Project documentation
```
- All API logic is under `src/`.
- `uploads/` is used for temporary file storage and should be gitignored.
- `public/` is for static assets (if you add any).
- `constants.js` holds app constants like `DB_NAME` and `APP_VERSION`.

---

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/notvenu/youtube-clone.git
   cd youtube-clone
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   - Copy `.env.sample` to `.env` and fill in your secrets:
     ```
     MONGODB_URI=your_mongodb_uri
     CLOUDINARY_CLOUD_NAME=your_cloud_name
     CLOUDINARY_API_KEY=your_api_key
     CLOUDINARY_API_SECRET=your_api_secret
     ACCESS_TOKEN_SECRET=your_access_token_secret
     REFRESH_TOKEN_SECRET=your_refresh_token_secret
     ACCESS_TOKEN_EXPIRY=1d
     REFRESH_TOKEN_EXPIRY=7d
     PORT=4000 (Change according to your prefrence.)
     ```
   - (Optional) Set `NODE_ENV=development` for local dev.

4. **Run the Application**
   ```bash
   npm run dev
   ```
   The server will start at [http://localhost:4000](http://localhost:4000).

---

## Usage

- **Register & Login**: Use `/api/v1/users/register` and `/api/v1/users/login` endpoints.
- **Upload Videos**: Authenticated users can upload via `/api/v1/videos/upload`.
- **Manage Playlists**: Create and update playlists via `/api/v1/playlists`.
- **Interact**: Like, comment, and subscribe using the respective endpoints.
- **Health Check**: Test server status at `/api/v1/healthcheck` 🩺

Use [Postman](https://www.postman.com/) or similar tools for API testing.

---

## Dependencies

- Node.js (v18+ recommended)
- MongoDB (local or Atlas)
- Cloudinary account (for media storage)
- Modern browser or API client for testing

---

## Notes

- All sensitive config is managed via environment variables.
- Avatar and video uploads are stored on Cloudinary, not locally.
- JWT tokens are used for all protected routes.
- The codebase uses ES modules (`type: "module"` in `package.json`).

---

## Credits

- Made with ❤️ by [Venu K](https://github.com/notvenu)
- Cloudinary for media hosting
- MongoDB for database
- Express.js for backend framework

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---