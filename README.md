<div align="center">
<img width="1200" height="475" alt="Fitness App Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Fitness Tracker

A comprehensive, modern React application for tracking workouts, monitoring progress, and achieving fitness goals. Built with performance and user experience in mind.

[Live Demo](https://hectoralvarez.github.io/fitness-app/) <!-- Update with actual username/repo if different -->
</div>

## 🚀 Features

### 💪 Workout Management
- **Routine Builder**: Create and customize workout routines with a drag-and-drop interface.
- **Live Session Tracking**: Track your sets, reps, and weights in real-time.
- **Rest Timer**: Integrated timer to keep your workouts on track.

### 📈 Progress & Analytics
- **Detailed History**: View past workouts and performance trends.
- **Muscle Heatmap**: Visual representation of trained muscle groups.
- **Charts & Graphs**: Powered by Recharts to visualize volume, intensity, and body measurements.
- **Personal Records**: Automatic tracking of your best lifts.

### 🏆 Gamification
- **Achievements System**: Unlock badges and milestones as you progress.
- **Streaks**: Track your consistency over time.

### 👤 User Profile
- **Body Measurements**: Log and track tracking weight and body metrics.
- **Onboarding Flow**: Personalized setup to tailor the experience to your goals.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **State Management**: Zustand
- **Backend & Auth**: Supabase
- **Styling**: Tailwind CSS (presumed)
- **Visualization**: Recharts
- **Interactions**: @dnd-kit (Drag and Drop)
- **Deployment**: GitHub Pages

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js (v20 or higher recommended)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hectoralvarez/fitness-app.git
   cd fitness-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```

## 📦 Deployment

This project is configured to deploy to **GitHub Pages** using GitHub Actions.
Any push to the `main` branch will trigger the deployment workflow.

## 📄 License

This project is available for personal use and modification.
