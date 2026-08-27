import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App);
// Esto asegura que el entryFile sea reconocido por el React Native Gradle Plugin sin paths vacíos
registerRootComponent(App);

