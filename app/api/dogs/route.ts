import { NextResponse } from 'next/server'

type Dog = {
  id: number
  name: string
  breed: string
  sex: string
  dateOfBirth: string
  sire: string
  dam: string
}

let dogs: Dog[] = [
  {
    id: 1,
    name: 'Rex',
    breed: 'American Bully',
    sex: 'Male',
    dateOfBirth: '2023-01-10',
    sire: '',
    dam: '',
  },
]

export async function GET() {
  try {
    return NextResponse.json(dogs, { status: 200 })
  } catch (error) {
    console.error('GET /api/dogs error:', error)
    return NextResponse.json({ error: 'Failed to load dogs' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('POST /api/dogs body:', body)

    const { name, breed, sex, dateOfBirth, sire, dam } = body

    if (!name || !breed || !sex || !dateOfBirth) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const newDog: Dog = {
      id: Date.now(),
      name: String(name).trim(),
      breed: String(breed).trim(),
      sex: String(sex).trim(),
      dateOfBirth: String(dateOfBirth).trim(),
      sire: sire ? String(sire).trim() : '',
      dam: dam ? String(dam).trim() : '',
    }

    dogs.push(newDog)

    console.log('Dog saved:', newDog)
    return NextResponse.json(newDog, { status: 201 })
  } catch (error) {
    console.error('POST /api/dogs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
