// Firebase 설정
var firebaseConfig = {
  apiKey: "AIzaSyD67lJCh-dJZMRrNV-TjizxhqrPm2gIHjw",
  authDomain: "twin-milk-poop.firebaseapp.com",
  databaseURL: "https://twin-milk-poop-default-rtdb.firebaseio.com",
  projectId: "twin-milk-poop",
  storageBucket: "twin-milk-poop.firebasestorage.app",
  messagingSenderId: "424822308995",
  appId: "1:424822308995:web:162070cd93d4052b62dbb6"
};

firebase.initializeApp(firebaseConfig);
window.db = firebase.database();
