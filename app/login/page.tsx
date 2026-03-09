'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        localStorage.setItem('token', data.token)
        setMessage('Login successful')
        router.push('/dashboard')
      } else {
        setMessage(data.message || 'Login failed')
      }
    } catch (error) {
      setMessage('Server error')
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>Login</h1>
      <p>Sign in to manage your dog pedigree records.</p>

      <form
        onSubmit={handleLogin}
        style={{
          maxWidth: '500px',
          border: '1px solid #ddd',
          padding: '30px',
          borderRadius: '16px',
          marginTop: '30px',
        }}
      >
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Email
        </label>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '14px',
            marginBottom: '20px',
            borderRadius: '10px',
            border: '1px solid #ccc',
          }}
        />

        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Password
        </label>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '14px',
            marginBottom: '20px',
            borderRadius: '10px',
            border: '1px solid #ccc',
          }}
        />

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '16px',
            background: '#081225',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Sign In
        </button>

        {message && <p style={{ marginTop: '16px' }}>{message}</p>}
      </form>
    </div>
  )
}
