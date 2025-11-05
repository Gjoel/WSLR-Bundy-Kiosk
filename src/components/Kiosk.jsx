import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import EmployeeCard from './EmployeeCard'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function Kiosk({ onAdminClick }) {
  const [employees, setEmployees] = useState([])
  const [statuses, setStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadEmployees()
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const loadEmployees = async () => {
    try {
      // Load active employees
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('org_id', import.meta.env.VITE_ORG_ID)
        .eq('active', true)
        .is('deleted_at', null)
        .order('name')

      if (empError) throw empError

      // Load latest time entry for each employee
      const statusMap = {}
      
      for (const emp of employeesData) {
        const { data: entries, error: entriesError } = await supabase
          .from('time_entries')
          .select('direction')
          .eq('employee_id', emp.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (entriesError) throw entriesError

        statusMap[emp.id] = entries.length > 0 ? entries[0].direction : 'out'
      }

      setEmployees(employeesData)
      setStatuses(statusMap)
    } catch (error) {
      console.error('Error loading employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-AU', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WSLR Bundy Kiosk</h1>
            <p className="text-sm text-gray-600">{formatDate(currentTime)}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{formatTime(currentTime)}</div>
            <button
              onClick={onAdminClick}
              className="text-sm text-blue-600 hover:text-blue-800 mt-1"
            >
              Admin Panel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No active employees</p>
            <p className="text-sm text-gray-500 mt-2">Add employees in the Admin Panel</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {employees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                status={statuses[employee.id] || 'out'}
                onStatusChange={loadEmployees}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}