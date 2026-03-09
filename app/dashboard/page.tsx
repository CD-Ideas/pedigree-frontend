'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/login')
    } else {
      setLoading(false)
    }
  }, [router])

  if (loading) {
    return (
      <div style={{ padding: '40px', fontSize: '18px' }}>
        Loading dashboard...
      </div>
    )
  }

  const logout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>Pedigree Dashboard</h1>

      <p>You are logged in.</p>

      <button
        onClick={logout}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#000',
          color: '#fff',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  )
}
