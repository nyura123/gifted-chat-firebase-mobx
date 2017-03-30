import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import firebase from 'firebase';
import AppComponent from './components/AppComponent'
import Store from './store';

//Store
const fbApp =  firebase.initializeApp({
  apiKey: 'yourApiKey',
  authDomain: "localhost",
  databaseURL: 'https://testing-3bba1.firebaseio.com',
  storageBucket: 'testing-3bba1.firebaseio.com'
}, 'chatApp');

const store = new Store(fbApp);

export default () => <AppComponent store={store} />
