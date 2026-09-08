import { registerRootComponent } from 'expo';
import { createElement } from 'react';

import App from './App';
import { ThemeProvider } from './src/theme/ThemeProvider';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(() => createElement(ThemeProvider, null, createElement(App)));
