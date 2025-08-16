import { NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getFoodInventory, getMealPlans } from '@/services/foodService'

export async function GET() {
  try {
    // Get real food inventory and meal plans
    const [foodInventory, mealPlans] = await Promise.all([
      getFoodInventory().catch(() => []),
      getMealPlans().catch(() => [])
    ])

    // Format food inventory for AI context
    const foodSummary = foodInventory.length > 0 ? {
      totalItems: foodInventory.length,
      byLocation: foodInventory.reduce((acc, item) => {
        acc[item.location] = (acc[item.location] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recentItems: foodInventory.slice(0, 10).map(item => 
        `${item.quantity} ${item.unit} ${item.name} (${item.location})${item.expiration_date ? ` - expires ${item.expiration_date}` : ''}`
      ),
      expiringSoon: foodInventory.filter(item => {
        if (!item.expiration_date) return false
        const daysUntilExpiry = Math.ceil((new Date(item.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 3 && daysUntilExpiry >= 0
      }).map(item => `${item.name} (expires ${item.expiration_date})`)
    } : null

    // Format current meal plans
    const mealPlanSummary = mealPlans.length > 0 ? {
      totalMeals: mealPlans.length,
      upcomingMeals: mealPlans.slice(0, 7).map(meal => 
        `${meal.date} ${meal.meal_type}: ${meal.dish_name}`
      )
    } : null

    const familyContext = {
      children: ['Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah'],
      parents: ['Levi', 'Lola'],
      schools: ['Samuel V Champion High School', 'Princeton Intermediate School', 'Princeton Elementary'],
      existingContacts: [
        'Laura T. Booth (CHS Nurse)',
        'Erika Hill (Zoey\'s English teacher)',
        'Mr. Carr (BMSN Principal)',
        'BMSN PTO (Parent Organization)',
        'Boerne ISD (School District)',
        'Child Nutrition Services (School Meals)'
      ],
      recentTodos: [
        'URGENT: Renew Amos\' vaccine waiver',
        'URGENT: Zoey needs to bring summer reading book',
        'URGENT: Review and consent to Boerne ISD Technology AUP',
        'Set up PaySchools account for meal payments',
        'Register for ParentSquare communication platform',
        'Check BMSN PTO Meeting Dates for 25-26 school year',
        'Apply for Free/Reduced meals if applicable',
        'Update contact info in Skyward Family Access',
        'Monitor student meal account balances',
        'Review HB 1481 cell phone policy'
      ],
      // NEW: Real food inventory data for AI meal planning
      foodInventory: foodSummary,
      mealPlans: mealPlanSummary,
      // Context for AI to understand food situation
      foodContext: {
        familySize: 8,
        dietaryNotes: 'Family of 8 with kids ages 5-17, prefer kid-friendly meals',
        storageLocations: ['fridge', 'freezer', 'pantry'],
        mealPlanningGoals: 'Use existing inventory, minimize waste, practical family meals'
      }
    }

    return NextResponse.json(familyContext)
  } catch (error) {
    console.error('Error fetching family context:', error)
    return NextResponse.json(
      {
        children: ['Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah'],
        parents: ['Levi', 'Lola'],
        schools: ['Samuel V Champion High School', 'Princeton Intermediate School', 'Princeton Elementary'],
        existingContacts: [],
        recentTodos: []
      },
      { status: 200 }
    )
  }
}