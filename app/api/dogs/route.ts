import { NextResponse } from 'next/server'

let dogs = [
  {
    id: 1,
    name: 'Rex',
    breed: 'American Bully',
    sex: 'Male',
    dateOfBirth: '2023-01-10',
  },
]

export async function GET() {
  return NextResponse.json(dogs)
}

export async function POST(req: Request) {
  const body = await req.json()

  const newDog = {
    id: Date.now(),
    name: body.name,
    breed: body.breed,
    sex: body.sex,
    dateOfBirth: body.dateOfBirth,
    sire: body.sire || '',
    dam: body.dam || '',
  }
 
  dogs.push(newDog)

  return NextResponse.json(newDog, { status: 201 })
}
