const fs = require('fs');
const path = require('path');

const adminDir = 'c:/Projects/restaurant-app/mobile/screens/admin';
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace SafeAreaView opening tags with View
  content = content.replace(/<SafeAreaView style=\{\[styles\.container, \{ paddingTop: STATUSBAR_HEIGHT \}\]\}>/g, '<View style={styles.container}>');
  content = content.replace(/<SafeAreaView style=\{styles\.container\}>/g, '<View style={styles.container}>');
  
  // Replace closing SafeAreaView tags with View
  content = content.replace(/<\/SafeAreaView>/g, '</View>');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${file}`);
});

console.log('All files fixed!');
