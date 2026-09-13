const fs = require('fs');
const path = require('path');

const files = [
  'CategoryDistributionPieChart.tsx',
  'OrderDistributionPieChart.tsx',
  'InventoryDistributionPieChart.tsx',
  'UserDistributionPieChart.tsx',
  'CouponDistributionPieChart.tsx'
];

const basePath = '/home/athi/cloudcrackers/frontend/src/components/admin';

files.forEach(file => {
  const filePath = path.join(basePath, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add ScrollView import if not exists
  if (!content.includes('ScrollView,')) {
    content = content.replace(
      '  TouchableOpacity,\n  Platform,\n} from \'react-native\';',
      '  TouchableOpacity,\n  Platform,\n  ScrollView,\n} from \'react-native\';'
    );
  }

  // Replace <View style={styles.pieWrapper}> ... </View> (for Category)
  content = content.replace(
    /<View style=\{styles\.pieWrapper\}>/g,
    '<ScrollView style={styles.pieWrapper} maximumZoomScale={4} minimumZoomScale={1} contentContainerStyle={{ alignItems: \'center\', justifyContent: \'center\', minHeight: \'100%\' }}>'
  );
  // Closing for pieWrapper is right before `) : (` for bar chart, but to be safe we can use a more specific regex or just find the corresponding closing tag.
  // Actually, since these charts have simple structures, let's replace the specific closing View tags by context.
  
  if (file === 'CategoryDistributionPieChart.tsx') {
    content = content.replace(
      /<\/View>\n        \) : \(\n          <View style=\{styles\.barChartContainer\}>/g,
      '</ScrollView>\n        ) : (\n          <View style={styles.barChartContainer}>'
    );
  }
  
  if (file === 'OrderDistributionPieChart.tsx') {
    content = content.replace(
      /<View style=\{styles\.chartContainer\}>/g,
      '<ScrollView horizontal showsHorizontalScrollIndicator={true} maximumZoomScale={4} minimumZoomScale={1} style={styles.chartContainer} contentContainerStyle={{ alignItems: \'center\', justifyContent: \'center\', minWidth: \'100%\' }}>'
    );
    content = content.replace(
      /<\/View>\n      \) : \(/g,
      '</ScrollView>\n      ) : ('
    );
    
    content = content.replace(
      /<View style=\{styles\.chartCenterWrapper\}>/g,
      '<ScrollView maximumZoomScale={4} minimumZoomScale={1} style={styles.chartCenterWrapper} contentContainerStyle={{ alignItems: \'center\', justifyContent: \'center\', minHeight: \'100%\' }}>'
    );
    content = content.replace(
      /<\/View>\n        <\/View>\n      \)}/g,
      '</ScrollView>\n        </View>\n      )}'
    );
  }

  if (file === 'InventoryDistributionPieChart.tsx' || file === 'UserDistributionPieChart.tsx' || file === 'CouponDistributionPieChart.tsx') {
    content = content.replace(
      /<View style=\{styles\.chartContainer\}>/g,
      '<ScrollView maximumZoomScale={4} minimumZoomScale={1} style={styles.chartContainer} contentContainerStyle={{ alignItems: \'center\', justifyContent: \'center\', minHeight: \'100%\' }}>'
    );
    content = content.replace(
      /<\/View>\n        \) : \(/g,
      '</ScrollView>\n        ) : ('
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
