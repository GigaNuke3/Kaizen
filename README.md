# 改善 Kaizen - Self-Improvement App

Your personal self-improvement companion built with Electron, featuring habit tracking, journaling, goal setting, and more.

## 🎯 Features

### 📊 Dashboard
- **Real-time Statistics**: View your habits tracked, goals completed, journal entries, and today's actions
- **GitHub-style Contribution Grid**: Visualize your activity throughout the year
- **Today's Checklist**: Quick access to today's habits with completion status
- **Recent Journal**: Preview your latest journal entries

### 📓 Journal
- Write daily reflections
- Track your mood: 😢 😐 🙂 😄 🚀
- Browse all journal entries
- Delete entries
- Organize by date

### 🎯 Goals
- Set long-term and short-term goals
- Add detailed descriptions
- Set target dates
- Track progress with visual progress bar (0-100%)
- Mark goals as complete
- Separate view for active vs completed goals

### 📝 CheckMarked - Goal Tracking
- Display all active goals in a 365-day tracking grid
- Support multiple frequency types (daily, weekdays, weekends, 3x, custom)
- Track completion status for each goal per day
- Visual contribution-style grid with color coding
- Today's completion statistics and progress tracking

### 👤 Profile
- Edit your name and tagline
- View overall statistics
- Browse all features
- Customize settings

## 🚀 Getting Started

### Installation
```bash
cd /home/eco/Kaizen
npm install
```

### Running the App
```bash
npm start
```

The app will launch with:
- Dark modern theme
- Clean, intuitive interface
- Sidebar navigation
- Full keyboard support

## 💾 Data Storage

All your data is stored locally in `database/kaizen.db` using SQLite (via sql.js):
- No cloud uploads
- No tracking
- Complete privacy
- Data persists between sessions

## 🎨 Architecture

```
Frontend (HTML/CSS/JavaScript)
         ↓
    IPC Bridge (Electron)
         ↓
Backend (Node.js)
         ↓
Database (SQLite/sql.js)
```

### Technology Stack
- **Electron**: Desktop application framework
- **sql.js**: SQLite in JavaScript
- **node-cron**: For future reminder scheduling
- **electron-store**: For app settings

## 📚 Usage Tips

### Setting Goals
1. Go to **Goals** page
2. Click **+ New Goal**
3. Enter goal title, description, and target date
4. Click **Save Goal**
5. Update progress using the slider
6. Mark as complete when done

### Writing in Journal
1. Go to **Journal** page
2. Click **+ New Entry**
3. Select your mood
4. Write your reflection
5. Click **Save Entry**

## ⌨️ Keyboard Shortcuts

- Click **Dashboard**: View overall progress
- Click **Journal**: Write reflections
- Click **Goals**: Set and track goals
- Click **CheckMarked**: Track goals across 365 days
- Click **Profile**: Edit profile and view stats

## 🔄 Workflow Example

### Morning Routine
1. Open app → view **Dashboard**
2. See today's habits in checklist
3. Navigate to **Habits**, mark them as you complete
4. Check **Dashboard** to see progress

### Evening Reflection
1. Go to **Journal**
2. Write about your day
3. Select your mood
4. Save entry
5. Track in **Dashboard** contribution grid

### Weekly Planning
1. Navigate to **Goals**
2. Review progress on active goals
3. Go to **CheckMarked** to monitor goal completion
4. Set priorities and due dates

## 🐛 Troubleshooting

### App won't start
- Make sure Node.js and npm are installed
- Try deleting `database/kaizen.db` and restarting
- Check console for errors

### Missing data
- Data is stored in `database/kaizen.db`
- Don't delete the database folder
- Restart the app if data seems stuck

### Modals not appearing
- Reload the page (it should work)
- Close and reopen the app

## 📈 Future Features

Planned for upcoming versions:
- 🔔 Reminders and notifications
- 📊 Advanced analytics and charts
- 🎖️ Achievement badges and streaks
- 📤 Data export (JSON/CSV)
- 🎨 Multiple theme options
- 📱 Mobile companion app

## 📝 Database Schema

### Tables
- **habits**: Store habit definitions
- **daily_checklist**: Track habit completion by date
- **journal**: Store journal entries with mood
- **goals**: Store goals and progress
- **checkmarks**: Store goal completion data per date
- **user_profile**: Store user information

## 🤝 Contributing

Found a bug? Want to suggest a feature? Feel free to:
1. Test all features thoroughly
2. Report issues with exact steps to reproduce
3. Suggest improvements with use cases

## 📄 License

Personal project - free to use and modify

## 🙏 Inspiration

Built with the philosophy of **Kaizen** (改善) - continuous improvement through small, incremental changes.

---

**Made with ❤️ for self-improvement**

*Last Updated: May 9, 2026*
*Version: 1.0.0*

If on Different Device Just npm install to install the dependencies of the node_modules. then npm start

- Then Run git config --user.name "your name"
           git config --user.email "your email"
           git commit -m "your messages"

If Switching from Linux to Windows

Refresh the node_modules

Via - terminal

rd /s /q node_modules
npm install
npm start

If Switching from Windows to Linux

Refresh the node_modules

Via - terminal

rm -rf node_modules
npm install
npm start
           