"use client";

import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DogsPage() {
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState("Male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sire, setSire] = useState("");
  const [dam, setDam] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const response = await fetch('/api/dogs', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: dogName,
        breed,
        sex,
        dateOfBirth,
        sire,
        dam,
      }),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (response.ok) {
      setMessage("Dog saved successfully!");
      setDogName("");
      setBreed("");
      setSex("Male");
      setDateOfBirth("");
      setSire("");
      setDam("");
    } else {
      setMessage(data.message || "Error saving dog");
    }
  }

  return (
    <main style={{ padding: "60px", fontFamily: "Arial" }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
  <h1>Dog Registration</h1>
  <a href="/dashboard">Back to Dashboard</a>
</div>

      <form
        onSubmit={handleSubmit}
        style={{ maxWidth: "600px", display: "grid", gap: "20px" }}
      >
        <input
          placeholder="Dog Name"
          value={dogName}
          onChange={(e) => setDogName(e.target.value)}
        />

        <input
          placeholder="Breed"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
        />

        <select value={sex} onChange={(e) => setSex(e.target.value)}>
          <option>Male</option>
          <option>Female</option>
        </select>

        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />

        <input
          placeholder="Sire"
          value={sire}
          onChange={(e) => setSire(e.target.value)}
        />

        <input
          placeholder="Dam"
          value={dam}
          onChange={(e) => setDam(e.target.value)}
        />

        <button type="submit">Save Dog</button>

        {message && <p>{message}</p>}
      </form>
    </main>
  );
}
