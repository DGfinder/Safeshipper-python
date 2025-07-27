/**
 * SafeShipper Mobile Driver App
 * Entry point for the application
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './package.json';

AppRegistry.registerComponent(appName, () => App);