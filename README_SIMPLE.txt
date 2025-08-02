====================================
SAFESHIPPER - SIMPLE INSTRUCTIONS
====================================

HOW TO START SAFESHIPPER:
-------------------------
1. Make sure Docker Desktop is installed and running
   (You should see the Docker whale icon in your system tray)

2. Double-click the file: START_SAFESHIPPER.bat

3. Wait a few minutes for everything to start

4. Your browser will open automatically to SafeShipper


WHAT YOU'LL SEE:
----------------
- Frontend (Main App): http://localhost:3000
- Backend API: http://localhost:8000
- Database Manager: http://localhost:5050
  (Login: admin@safeshipper.com / Password: admin123)


IF SOMETHING GOES WRONG:
------------------------
1. Right-click on "Fix-Docker-Issues.ps1"
2. Select "Run with PowerShell"
3. Follow the menu options


TO STOP SAFESHIPPER:
--------------------
1. Open Command Prompt or PowerShell
2. Navigate to the SafeShipper folder
3. Type: docker-compose down
4. Press Enter


NEED DOCKER DESKTOP?
--------------------
Download from: https://www.docker.com/products/docker-desktop/


THAT'S IT!
----------
No need to install Python, Django, Elasticsearch, or anything else.
Docker handles everything for you automatically.

If you need help, the Fix-Docker-Issues.ps1 script can solve most problems.