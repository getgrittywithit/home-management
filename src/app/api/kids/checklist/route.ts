import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const childName = searchParams.get('childName')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!childName) {
      return NextResponse.json({ error: 'Child name is required' }, { status: 400 })
    }

    try {
      const client = await pool.connect()
      
      try {
        // Get today's completed tasks for the child
        const result = await client.query(
          `SELECT * FROM daily_checklist_completion 
           WHERE child_name = $1 AND date = $2 
           ORDER BY created_at ASC`,
          [childName, date]
        )

        return NextResponse.json({
          completedTasks: result.rows,
          date,
          childName
        })
      } finally {
        client.release()
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      
      // Return empty array when database is unavailable
      return NextResponse.json({
        completedTasks: [],
        date,
        childName
      })
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      completedTasks: [],
      date: new Date().toISOString().split('T')[0],
      childName: ''
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      childName,
      date,
      category,
      taskTitle,
      taskDescription,
      completed,
      pointsEarned
    } = await request.json()

    if (!childName || !date || !category || !taskTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
      const client = await pool.connect()
      
      try {
        if (completed) {
          // Insert or update completion record
          const result = await client.query(
            `INSERT INTO daily_checklist_completion 
             (child_name, date, category, task_title, task_description, completed, completed_at, points_earned, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW())
             ON CONFLICT (child_name, date, category, task_title) 
             DO UPDATE SET 
               completed = $6,
               completed_at = NOW(),
               points_earned = $7,
               updated_at = NOW()
             RETURNING *`,
            [childName, date, category, taskTitle, taskDescription, completed, pointsEarned]
          )

          return NextResponse.json({
            success: true,
            task: result.rows[0]
          })
        } else {
          // Remove completion record (unchecking)
          await client.query(
            `DELETE FROM daily_checklist_completion 
             WHERE child_name = $1 AND date = $2 AND category = $3 AND task_title = $4`,
            [childName, date, category, taskTitle]
          )

          return NextResponse.json({
            success: true,
            task: null
          })
        }
      } finally {
        client.release()
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      
      // Return success even when database is unavailable (graceful degradation)
      return NextResponse.json({
        success: false,
        error: 'Database unavailable',
        task: null
      })
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update checklist',
      task: null
    })
  }
}

// GET endpoint for parent dashboard to see all kids' progress
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Check if database URL exists
    if (!process.env.DATABASE_URL) {
      // Return mock data when no database is configured
      const mockChildren = ['Hannah', 'Wyatt', 'Ellie', 'Amos', 'Kaylee', 'Zoey']
      const mockData = mockChildren.map(childName => ({
        childName,
        totalPoints: Math.floor(Math.random() * 20),
        categories: {
          dishes: {
            totalTasks: 1,
            completedTasks: Math.random() > 0.5 ? 1 : 0,
            points: Math.random() > 0.5 ? 1 : 0
          },
          required_chore: {
            totalTasks: 1,
            completedTasks: Math.random() > 0.3 ? 1 : 0,
            points: Math.random() > 0.3 ? 2 : 0
          },
          hygiene: {
            totalTasks: 3,
            completedTasks: Math.floor(Math.random() * 4),
            points: Math.floor(Math.random() * 4)
          },
          school_prep: {
            totalTasks: 2,
            completedTasks: Math.floor(Math.random() * 3),
            points: Math.floor(Math.random() * 3)
          },
          paid_chore: {
            totalTasks: 3,
            completedTasks: Math.floor(Math.random() * 4),
            points: Math.floor(Math.random() * 8)
          }
        }
      }))

      return NextResponse.json({
        date,
        children: mockData
      })
    }

    try {
      const client = await pool.connect()
      
      try {
        // Get completion summary for all children for the date
        const result = await client.query(
          `SELECT 
             child_name,
             category,
             COUNT(*) as total_tasks,
             COUNT(CASE WHEN completed = true THEN 1 END) as completed_tasks,
             SUM(CASE WHEN completed = true THEN points_earned ELSE 0 END) as total_points
           FROM daily_checklist_completion 
           WHERE date = $1 
           GROUP BY child_name, category
           ORDER BY child_name, category`,
          [date]
        )

        // Group by child for easier consumption
        const summary: Record<string, any> = {}
        
        result.rows.forEach(row => {
          if (!summary[row.child_name]) {
            summary[row.child_name] = {
              childName: row.child_name,
              totalPoints: 0,
              categories: {}
            }
          }
          
          summary[row.child_name].totalPoints += parseInt(row.total_points)
          summary[row.child_name].categories[row.category] = {
            totalTasks: parseInt(row.total_tasks),
            completedTasks: parseInt(row.completed_tasks),
            points: parseInt(row.total_points)
          }
        })

        return NextResponse.json({
          date,
          children: Object.values(summary)
        })
      } finally {
        client.release()
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      
      // Return mock data when database is unavailable
      const mockChildren = ['Hannah', 'Wyatt', 'Ellie', 'Amos', 'Kaylee', 'Zoey']
      const mockData = mockChildren.map(childName => ({
        childName,
        totalPoints: 0,
        categories: {}
      }))

      return NextResponse.json({
        date,
        children: mockData
      })
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      children: []
    })
  }
}