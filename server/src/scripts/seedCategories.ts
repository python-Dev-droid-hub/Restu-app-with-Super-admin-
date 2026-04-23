import mongoose from 'mongoose';
import { Category } from '@/models/Category';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const categoriesToSeed = [
  {
    name: 'Appetizers',
    description: 'Starters and small plates to begin your meal',
  },
  {
    name: 'Main Courses',
    description: 'Primary dishes and entrees',
  },
  {
    name: 'Desserts',
    description: 'Sweet treats and desserts',
  },
  {
    name: 'Beverages',
    description: 'Drinks and refreshments',
  },
  {
    name: 'Salads',
    description: 'Fresh salads and healthy options',
  },
  {
    name: 'Pizzas',
    description: 'Wood-fired pizzas and flatbreads',
  },
  {
    name: 'Pasta',
    description: 'Italian pasta dishes',
  },
  {
    name: 'Burgers',
    description: 'Gourmet burgers and sandwiches',
  },
  {
    name: 'Seafood',
    description: 'Fresh seafood and fish dishes',
  },
  {
    name: 'Vegetarian',
    description: 'Plant-based and vegetarian options',
  },
];

async function seedCategories() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27019/restaurant_app';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    const createdCategories: Array<{ name: string }> = [];
    const existingCategories: Array<{ name: string }> = [];

    for (const categoryData of categoriesToSeed) {
      try {
        // Check if category already exists
        const existingCategory = await Category.findOne({ name: categoryData.name });

        if (existingCategory) {
          console.log(`⚠️  Category already exists: ${categoryData.name}`);
          existingCategories.push({ name: categoryData.name });
        } else {
          // Create new category
          const category = new Category({
            ...categoryData,
            isActive: true,
          });
          await category.save();

          createdCategories.push({ name: categoryData.name });
          console.log(`✅ Created category: ${categoryData.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing category ${categoryData.name}:`, error);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 CATEGORY SEED SUMMARY');
    console.log('='.repeat(50));

    if (createdCategories.length > 0) {
      console.log(`\n🆕 Created ${createdCategories.length} new categories:`);
      createdCategories.forEach(c => {
        console.log(`   • ${c.name}`);
      });
    }

    if (existingCategories.length > 0) {
      console.log(`\n⚠️  ${existingCategories.length} categories already existed:`);
      existingCategories.forEach(c => {
        console.log(`   • ${c.name}`);
      });
    }

    console.log(`\n📂 Total categories in database: ${await Category.countDocuments()}`);
    console.log('='.repeat(50));

    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding categories:', error);
    process.exit(1);
  }
}

// Run the script
seedCategories();
