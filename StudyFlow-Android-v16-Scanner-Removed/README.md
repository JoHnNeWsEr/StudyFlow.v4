# StudyFlow — phone-first school planner

This is a mobile-first Vite app that can be wrapped into Android with Capacitor.

## Run in a browser/cloud IDE

```bash
npm install
npm run dev -- --host 0.0.0.0
```

## Build web assets

```bash
npm run build
```

## Android wrapper (requires a cloud/desktop Linux environment with Android SDK)

```bash
npm install
npx cap add android
npm run build
npx cap sync android
```



## Features

- Dashboard
- Weekly schedule
- Subjects
- Quiz, exam, oral, project, assignment events
- Local persistence
- Dark mode
- Mobile-first UI
- Event completion
- Reminder field ready for native notifications

The browser build stores data in localStorage. When wrapped with Capacitor, native notification scheduling can be connected to `@capacitor/local-notifications`.
