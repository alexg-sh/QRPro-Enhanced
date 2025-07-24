# QR Scanner App

A modern QR code scanner built with React Native and Expo, featuring camera integration and cross-platform support.

## Features

- 📷 Real-time QR code scanning using device camera
- 🎨 Modern UI with adaptive theming (light/dark mode)
- 📱 Cross-platform support (iOS, Android, Web)
- ⚡ Performance monitoring and optimization
- 🔄 File-based routing with Expo Router

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the development server

   ```bash
   npm start
   ```

3. Run on your preferred platform

   ```bash
   # For iOS simulator
   npm run ios
   
   # For Android emulator  
   npm run android
   
   # For web browser
   npm run web
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction) with Expo Router.

## Camera Permissions

The app requires camera permissions to scan QR codes:
- **iOS**: Camera access is automatically requested when needed
- **Android**: CAMERA permission is included in the app manifest

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
